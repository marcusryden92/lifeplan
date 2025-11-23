/**
 * TemplateExpander
 *
 * Handles expansion of EventTemplate into actual SimpleEvent instances.
 * Pre-generates recurring template events for a date range using RRule.
 */

import { EventTemplate, SimpleEvent } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { dateTimeService } from "../utils/dateTimeService";
import { WEEKDAY_NAMES, TIME_CONSTANTS } from "../constants";
import { RRule, Weekday } from "rrule";
import { v4 as uuidv4 } from "uuid";
import { calendarColors } from "@/data/calendarColors";

// Weekly mask types
export type TimeInterval = { startTime: string; endTime: string };
export type DayMask = TimeInterval[];
export type WeeklyMask = Record<number, DayMask>;
export type DateException = {
  dateISO: string;
  removed?: TimeInterval[];
  added?: TimeInterval[];
};

export type TemplateMask = {
  weeklyMask: WeeklyMask;
  exceptions?: DateException[];
};

// Per-template sparse mask types
export type TemplateTimeWithExceptions = {
  startTime: string;
  endTime: string;
  exceptions?: string[]; // list of ISO dates (YYYY-MM-DD) when this time is removed/added
};

export type TemplateDayDef = {
  day: number; // 0..6
  times: TemplateTimeWithExceptions[];
};

export type PerTemplateMask = {
  templateId: string;
  title?: string;
  color?: string;
  occurrences: TemplateDayDef[]; // sparse list of defined weekdays
  startDateISO?: string; // anchor start date for interval-based templates
  intervalDays?: number; // if provided, template repeats every N days from startDateISO
};

export class TemplateExpander {
  private expandedTemplates: Map<string, SimpleEvent[]> = new Map();

  constructor(private weekStartDay: WeekDayIntegers) {}

  /**
   * Expand templates for a date range
   * Creates ONE event per template with RRule for recurrence
   */
  expandTemplates(
    userId: string,
    templates: EventTemplate[],
    startDate: Date,
    _endDate: Date
  ): SimpleEvent[] {
    const events: SimpleEvent[] = [];

    for (const template of templates) {
      const event = this.createRecurringTemplateEvent(
        userId,
        template,
        startDate
      );
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Create a single recurring template event with RRule
   */
  private createRecurringTemplateEvent(
    userId: string,
    template: EventTemplate,
    weekStartDate: Date
  ): SimpleEvent | null {
    if (
      !template.startDay ||
      !template.startTime ||
      template.duration === undefined
    ) {
      console.error("Template details incomplete:", template);
      return null;
    }

    // Calculate the day offset from week start
    const startDayIndex = WEEKDAY_NAMES.indexOf(template.startDay);
    if (startDayIndex === -1) {
      console.error("Invalid start day:", template.startDay);
      return null;
    }

    const dayOffset = (startDayIndex - this.weekStartDay + 7) % 7;
    const eventDate = dateTimeService.shiftDays(weekStartDate, dayOffset);

    // Set the time
    const startDate = dateTimeService.setTimeOnDate(
      eventDate,
      template.startTime
    );
    const endDate = dateTimeService.addDuration(startDate, template.duration);

    // Get RRule day
    const utcDate = new Date(startDate.toUTCString());
    const rruleDay = this.getRRuleDayFromIndex(utcDate.getUTCDay());

    const startISO = startDate.toISOString();

    const rule = {
      freq: "weekly",
      interval: 1,
      byweekday: [rruleDay],
      dtstart: startISO,
    };

    const now = new Date();

    return {
      userId,
      id: template.id,
      title: template.title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      rrule: JSON.stringify(rule),
      duration: template.duration * 60 * 1000, // Convert to milliseconds
      extendedProps: {
        id: uuidv4(),
        eventId: template.id,
        itemType: "template",
        completedStartTime: null,
        completedEndTime: null,
        parentId: null,
      },
      backgroundColor: (template.color as string) || calendarColors[0],
      borderColor: "transparent",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  /**
   * Expand a single template for a specific week (DEPRECATED)
   * Kept only for generateSimpleTemplateEvents
   */

  /**
   * Generate simple non-recurring template events for a week
   * (without RRule, for slot calculation)
   */
  generateSimpleTemplateEvents(
    userId: string,
    templates: EventTemplate[],
    weekStartDate: Date
  ): SimpleEvent[] {
    const events: SimpleEvent[] = [];

    for (const template of templates) {
      if (
        !template.startDay ||
        !template.startTime ||
        template.duration === undefined
      ) {
        continue;
      }

      const startDayIndex = WEEKDAY_NAMES.indexOf(template.startDay);
      if (startDayIndex === -1) continue;

      const dayOffset = (startDayIndex - this.weekStartDay + 7) % 7;
      const eventDate = dateTimeService.shiftDays(weekStartDate, dayOffset);
      const startDate = dateTimeService.setTimeOnDate(
        eventDate,
        template.startTime
      );
      const endDate = dateTimeService.addDuration(startDate, template.duration);

      const now = new Date();

      events.push({
        userId,
        id: template.id,
        title: template.title,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        duration: null,
        rrule: null,
        extendedProps: {
          id: uuidv4(),
          eventId: template.id,
          itemType: "template",
          completedStartTime: null,
          completedEndTime: null,
          parentId: null,
        },
        backgroundColor: (template.color as string) || calendarColors[0],
        borderColor: "transparent",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    return events;
  }

  /**
   * Calculate the largest gap in the template
   */
  calculateLargestGap(templates: EventTemplate[]): number {
    if (templates.length === 0) {
      return TIME_CONSTANTS.MINUTES_PER_WEEK;
    }

    // Create a dummy week to calculate gaps. Use per-template masks so uneven
    // templates are considered when calculating the largest free gap.
    const weekStart = dateTimeService.startOfDay(new Date());
    const masks = this.getPerTemplateMasks(templates);
    const simpleEvents = this.generateSimpleEventsFromPerTemplateMasks(
      "temp",
      masks,
      weekStart,
      7
    );

    // Sort by start time
    const sorted = simpleEvents.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    let largestGap = 0;
    const weekEnd = dateTimeService.shiftDays(weekStart, 7);

    // Gap before first event
    if (sorted.length > 0) {
      const firstStart = new Date(sorted[0].start);
      largestGap = Math.max(
        largestGap,
        dateTimeService.getMinutesDifference(weekStart, firstStart)
      );
    }

    // Gaps between events
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd = new Date(sorted[i].end);
      const nextStart = new Date(sorted[i + 1].start);
      const gap = dateTimeService.getMinutesDifference(currentEnd, nextStart);
      largestGap = Math.max(largestGap, gap);
    }

    // Gap after last event
    if (sorted.length > 0) {
      const lastEnd = new Date(sorted[sorted.length - 1].end);
      const gap = dateTimeService.getMinutesDifference(lastEnd, weekEnd);
      largestGap = Math.max(largestGap, gap);
    }

    // If no events, the entire week is available
    if (sorted.length === 0) {
      largestGap = TIME_CONSTANTS.MINUTES_PER_WEEK;
    }

    return largestGap;
  }

  /**
   * Get all weeks that fall within a date range
   */
  private getWeeksInRange(startDate: Date, endDate: Date): Date[] {
    const weeks: Date[] = [];
    let current = dateTimeService.getWeekFirstDate(
      startDate,
      this.weekStartDay
    );

    while (current <= endDate) {
      weeks.push(new Date(current));
      current = dateTimeService.shiftDays(current, 7);
    }

    return weeks;
  }

  /**
   * Get unique week key for caching
   */
  private getWeekKey(weekStartDate: Date): string {
    return `${weekStartDate.getFullYear()}-W${Math.floor(
      weekStartDate.getTime() / TIME_CONSTANTS.MS_PER_WEEK
    )}`;
  }

  /**
   * Convert day index to RRule Weekday
   */
  private getRRuleDayFromIndex(day: number): Weekday {
    const rruleWeekdays = [
      RRule.SU,
      RRule.MO,
      RRule.TU,
      RRule.WE,
      RRule.TH,
      RRule.FR,
      RRule.SA,
    ];
    return rruleWeekdays[day];
  }

  /**
   * Clear template cache
   */
  clear(): void {
    this.expandedTemplates.clear();
  }

  /**
   * Build a weekly mask from templates: for each weekday produce a list of
   * unavailable time intervals (HH:MM strings). This mask can be applied to
   * any week to derive concrete occupied times for that date.
   */
  getWeeklyMask(templates: EventTemplate[]): TemplateMask {
    const weeklyMask: WeeklyMask = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    const exceptions: DateException[] = [];

    for (const template of templates) {
      if (
        !template.startDay ||
        !template.startTime ||
        template.duration === undefined
      ) {
        continue;
      }

      const startDayIndex = WEEKDAY_NAMES.indexOf(template.startDay);
      if (startDayIndex === -1) continue;

      // compute end time by adding duration
      const [h, m] = template.startTime.split(":").map((s) => parseInt(s, 10));
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + template.duration;

      // If endMinutes crosses midnight, split across two days
      if (endMinutes <= 24 * 60) {
        weeklyMask[startDayIndex].push({
          startTime: template.startTime,
          endTime: minutesToTimeString(endMinutes),
        });
      } else {
        // portion on startDay
        weeklyMask[startDayIndex].push({
          startTime: template.startTime,
          endTime: "24:00",
        });
        // portion on next day
        const nextDay = (startDayIndex + 1) % 7;
        weeklyMask[nextDay].push({
          startTime: "00:00",
          endTime: minutesToTimeString(endMinutes - 24 * 60),
        });
      }
    }

    // Merge overlapping intervals per day
    for (let d = 0; d < 7; d++) {
      weeklyMask[d] = mergeDayMaskIntervals(weeklyMask[d]);
    }

    return {
      weeklyMask,
      exceptions: exceptions.length ? exceptions : undefined,
    };
  }

  /**
   * Return the list of unavailable time intervals for a specific date,
   * applying any exceptions.
   */
  getDayMaskForDate(mask: TemplateMask, date: Date): TimeInterval[] {
    const weekday = date.getDay();
    let intervals = mask.weeklyMask[weekday] || [];

    if (mask.exceptions && mask.exceptions.length > 0) {
      const iso = date.toISOString().slice(0, 10);
      const dayExceptions = mask.exceptions.find((ex) => ex.dateISO === iso);
      if (dayExceptions) {
        // remove specified intervals
        if (dayExceptions.removed && dayExceptions.removed.length > 0) {
          intervals = intervals.filter(
            (intv) =>
              !dayExceptions.removed!.some(
                (r) =>
                  r.startTime === intv.startTime && r.endTime === intv.endTime
              )
          );
        }
        // add specified intervals
        if (dayExceptions.added && dayExceptions.added.length > 0) {
          intervals = intervals.concat(dayExceptions.added);
        }
        intervals = mergeDayMaskIntervals(intervals);
      }
    }

    return intervals;
  }

  /**
   * Generate concrete `SimpleEvent` instances for a date range using a
   * weekly mask. These are intended only for slot-calculation masking and
   * should not be added to the final calendar as separate template events.
   */
  generateSimpleEventsFromMask(
    userId: string,
    mask: TemplateMask,
    rangeStart: Date,
    numDays: number
  ): SimpleEvent[] {
    const events: SimpleEvent[] = [];

    for (let i = 0; i < numDays; i++) {
      const date = dateTimeService.shiftDays(rangeStart, i);
      const intervals = this.getDayMaskForDate(mask, date);

      for (const intv of intervals) {
        const start = dateTimeService.setTimeOnDate(date, intv.startTime);
        const end = dateTimeService.setTimeOnDate(date, intv.endTime);
        const now = new Date();

        events.push({
          userId,
          id: uuidv4(),
          title: "template-mask",
          start: start.toISOString(),
          end: end.toISOString(),
          duration: null,
          rrule: null,
          extendedProps: {
            id: uuidv4(),
            eventId: "",
            itemType: "template",
            completedStartTime: null,
            completedEndTime: null,
            parentId: null,
          },
          backgroundColor: calendarColors[0],
          borderColor: "transparent",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
      }
    }

    return events;
  }

  /**
   * Build per-template sparse masks from templates. Each template with a
   * weekly time definition will be turned into a `PerTemplateMask` that lists
   * only the weekdays where it has times defined. Exceptions are kept per-time.
   */
  getPerTemplateMasks(templates: EventTemplate[]): PerTemplateMask[] {
    const masks: PerTemplateMask[] = [];

    for (const template of templates) {
      if (
        !template.startDay ||
        !template.startTime ||
        template.duration === undefined
      ) {
        continue;
      }

      const startDayIndex = WEEKDAY_NAMES.indexOf(template.startDay);
      if (startDayIndex === -1) continue;

      const endMinutes = (() => {
        const [h, m] = template.startTime
          .split(":")
          .map((s) => parseInt(s, 10));
        return h * 60 + m + template.duration;
      })();

      const times: TemplateTimeWithExceptions[] = [];

      if (endMinutes <= 24 * 60) {
        times.push({
          startTime: template.startTime,
          endTime: minutesToTimeString(endMinutes),
          exceptions: [],
        });
      } else {
        // split across days
        times.push({
          startTime: template.startTime,
          endTime: "24:00",
          exceptions: [],
        });
        // For the next day, we add a separate day def below
      }

      const occs: TemplateDayDef[] = [{ day: startDayIndex, times }];

      // If it crosses midnight, add next day portion
      if (endMinutes > 24 * 60) {
        const nextDay = (startDayIndex + 1) % 7;
        occs.push({
          day: nextDay,
          times: [
            {
              startTime: "00:00",
              endTime: minutesToTimeString(endMinutes - 24 * 60),
              exceptions: [],
            },
          ],
        });
      }

      masks.push({
        templateId: template.id,
        title: template.title,
        color: template.color as string,
        occurrences: occs,
        // Populate optional interval metadata if present on the template record.
        // Support common field names that might be used for uneven recurrences.
        startDateISO: (() => {
          const t = template as unknown as Record<string, unknown>;
          if (typeof t.startDateISO === "string") return t.startDateISO;
          if (typeof t.startDate === "string") return t.startDate;
          if (typeof t.anchorDate === "string") return t.anchorDate;
          return undefined;
        })(),
        intervalDays: (() => {
          const t = template as unknown as Record<string, unknown>;
          if (typeof t.intervalDays === "number") return t.intervalDays;
          if (typeof t.repeatEveryDays === "number") return t.repeatEveryDays;
          if (typeof t.repeatInterval === "number") return t.repeatInterval;
          return undefined;
        })(),
      });
    }

    return masks;
  }

  /**
   * Generate concrete `SimpleEvent` instances from per-template masks for a date range.
   * These are used only for slot calculation and are not returned in the final calendar.
   */
  generateSimpleEventsFromPerTemplateMasks(
    userId: string,
    masks: PerTemplateMask[],
    rangeStart: Date,
    numDays: number
  ): SimpleEvent[] {
    const events: SimpleEvent[] = [];

    for (let i = 0; i < numDays; i++) {
      const date = dateTimeService.shiftDays(rangeStart, i);
      const isoDate = date.toISOString().slice(0, 10);
      const weekday = date.getDay();

      for (const mask of masks) {
        // If mask defines an interval-based recurrence (every N days) and has an
        // anchor start date, apply arithmetic to determine whether this date is
        // a repeat anchor. For interval-based masks we generate occurrences for
        // the anchor date and any occurrence parts that fall on subsequent days
        // (e.g., cross-midnight parts) by mapping day definitions relative to
        // the anchor.
        if (mask.intervalDays && mask.startDateISO) {
          const anchorDate = dateTimeService.fromISO(mask.startDateISO);
          const daysSinceStart = dateTimeService.getDaysDifference(
            anchorDate,
            date
          );

          if (daysSinceStart >= 0 && daysSinceStart % mask.intervalDays === 0) {
            // This `date` is an anchor occurrence. Map each day-def to the
            // appropriate date relative to the anchor and emit events.
            const anchorWeekday = anchorDate.getDay();

            for (const occ of mask.occurrences) {
              const offset = (occ.day - anchorWeekday + 7) % 7;
              const eventDate = dateTimeService.shiftDays(date, offset);
              const eventIso = eventDate.toISOString().slice(0, 10);

              for (const t of occ.times) {
                if (t.exceptions && t.exceptions.includes(eventIso)) continue;

                const start = dateTimeService.setTimeOnDate(
                  eventDate,
                  t.startTime
                );
                const end = dateTimeService.setTimeOnDate(eventDate, t.endTime);
                const now = new Date();

                events.push({
                  userId,
                  id: `${mask.templateId}-${eventIso}-${t.startTime}`,
                  title: mask.title || "template",
                  start: start.toISOString(),
                  end: end.toISOString(),
                  duration: null,
                  rrule: null,
                  extendedProps: {
                    id: uuidv4(),
                    eventId: mask.templateId,
                    itemType: "template",
                    completedStartTime: null,
                    completedEndTime: null,
                    parentId: null,
                  },
                  backgroundColor: mask.color || calendarColors[0],
                  borderColor: "transparent",
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString(),
                });
              }
            }
          }
          // For interval-based masks we skip the regular weekday-matching
          // behavior for this date.
          continue;
        }

        // Default weekly behavior: only emit when the occurrence day matches
        // the weekday we're iterating.
        for (const occ of mask.occurrences) {
          if (occ.day !== weekday) continue;

          for (const t of occ.times) {
            // apply exceptions per-time
            if (t.exceptions && t.exceptions.includes(isoDate)) continue;

            const start = dateTimeService.setTimeOnDate(date, t.startTime);
            const end = dateTimeService.setTimeOnDate(date, t.endTime);
            const now = new Date();

            events.push({
              userId,
              id: `${mask.templateId}-${isoDate}-${t.startTime}`,
              title: mask.title || "template",
              start: start.toISOString(),
              end: end.toISOString(),
              duration: null,
              rrule: null,
              extendedProps: {
                id: uuidv4(),
                eventId: mask.templateId,
                itemType: "template",
                completedStartTime: null,
                completedEndTime: null,
                parentId: null,
              },
              backgroundColor: mask.color || calendarColors[0],
              borderColor: "transparent",
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
            });
          }
        }
      }
    }

    return events;
  }
}

/** Helpers **/
function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function mergeDayMaskIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];

  // Convert to minutes and sort
  const normalized = intervals
    .map((it) => {
      const [sh, sm] = it.startTime.split(":").map((s) => parseInt(s, 10));
      const [eh, em] = it.endTime.split(":").map((s) => parseInt(s, 10));
      return { start: sh * 60 + sm, end: eh * 60 + em };
    })
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  let cur = normalized[0];
  for (let i = 1; i < normalized.length; i++) {
    const nxt = normalized[i];
    if (nxt.start <= cur.end) {
      cur.end = Math.max(cur.end, nxt.end);
    } else {
      merged.push(cur);
      cur = nxt;
    }
  }
  merged.push(cur);

  return merged.map((m) => ({
    startTime: minutesToTimeString(m.start),
    endTime: minutesToTimeString(m.end),
  }));
}
