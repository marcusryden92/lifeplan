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
  locationId?: string | null;
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
    _endDate: Date // Comment: unused variable, implement for multiple templates
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
   * Calculate the largest gap in the template
   */
  calculateLargestGap(templates: EventTemplate[]): number {
    if (templates.length === 0) {
      return TIME_CONSTANTS.MINUTES_PER_WEEK;
    }

    // Use masks directly to calculate the largest gap across a week
    const weekStart = dateTimeService.startOfDay(new Date());
    const masks = this.getPerTemplateMasks(templates);

    let largestGap = 0;

    // Check each day of the week for gaps
    for (let d = 0; d < 7; d++) {
      const dayStart = dateTimeService.shiftDays(weekStart, d);
      const dayEnd = dateTimeService.endOfDay(dayStart);

      // Convert masks to intervals for this day
      const intervals = this.masksToIntervalsForDay(masks, dayStart);

      if (intervals.length === 0) {
        // Entire day is available
        const dayMinutes =
          (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60);
        largestGap = Math.max(largestGap, dayMinutes);
        continue;
      }

      // Sort intervals by start time
      intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

      // Gap before first interval
      const firstGap =
        (intervals[0].start.getTime() - dayStart.getTime()) / (1000 * 60);
      largestGap = Math.max(largestGap, firstGap);

      // Gaps between intervals
      for (let i = 0; i < intervals.length - 1; i++) {
        const gap =
          (intervals[i + 1].start.getTime() - intervals[i].end.getTime()) /
          (1000 * 60);
        largestGap = Math.max(largestGap, gap);
      }

      // Gap after last interval
      const lastGap =
        (dayEnd.getTime() - intervals[intervals.length - 1].end.getTime()) /
        (1000 * 60);
      largestGap = Math.max(largestGap, lastGap);
    }

    return largestGap;
  }

  /**
   * Convert masks to intervals for a specific day (helper for calculateLargestGap)
   */
  private masksToIntervalsForDay(
    masks: PerTemplateMask[],
    date: Date
  ): Array<{ start: Date; end: Date }> {
    const dayOfWeek = date.getDay();
    const intervals: Array<{ start: Date; end: Date }> = [];

    for (const mask of masks) {
      const dayDef = mask.occurrences.find((occ) => occ.day === dayOfWeek);
      if (!dayDef) continue;

      for (const time of dayDef.times) {
        const dateISO = date.toISOString().split("T")[0];
        if (time.exceptions?.includes(dateISO)) continue;

        const [startH, startM] = time.startTime.split(":").map(Number);
        const [endH, endM] = time.endTime.split(":").map(Number);

        const start = new Date(date);
        start.setHours(startH, startM, 0, 0);

        const end = new Date(date);
        end.setHours(endH, endM, 0, 0);

        if (time.endTime === "24:00") {
          end.setHours(23, 59, 59, 999);
        }

        intervals.push({ start, end });
      }
    }

    return intervals;
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

      // Get exceptions if available (will be populated when UX is implemented)
      const templateExceptions: string[] = (() => {
        const t = template as unknown as Record<string, unknown>; // Comment: Why is this unknown?
        if (Array.isArray(t.exceptions)) return t.exceptions as string[];
        return [];
      })();

      const times: TemplateTimeWithExceptions[] = [];

      if (endMinutes <= 24 * 60) {
        times.push({
          startTime: template.startTime,
          endTime: minutesToTimeString(endMinutes),
          exceptions: templateExceptions,
        });
      } else {
        // split across days - start day part uses original exception dates
        times.push({
          startTime: template.startTime,
          endTime: "24:00",
          exceptions: templateExceptions,
        });
        // For the next day, we add a separate day def below
      }

      const occs: TemplateDayDef[] = [{ day: startDayIndex, times }];

      // If it crosses midnight, add next day portion
      if (endMinutes > 24 * 60) {
        const nextDay = (startDayIndex + 1) % 7;
        // Next day part needs exceptions shifted by +1 day
        const shiftedExceptions = templateExceptions.map((dateISO) => {
          const d = new Date(dateISO);
          d.setDate(d.getDate() + 1);
          return d.toISOString().split("T")[0];
        });
        occs.push({
          day: nextDay,
          times: [
            {
              startTime: "00:00",
              endTime: minutesToTimeString(endMinutes - 24 * 60),
              exceptions: shiftedExceptions,
            },
          ],
        });
      }

      masks.push({
        templateId: template.id,
        title: template.title,
        color: template.color as string,
        locationId: template.locationId ?? null,
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
}

/** Helpers **/
function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
