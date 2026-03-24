/**
 * TemplateExpander
 *
 * Handles expansion of EventTemplate into actual SimpleEvent instances.
 * Pre-generates recurring template events for a date range using RRule.
 */

import { EventTemplate, SimpleEvent, EventType } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { dateTimeService } from "../utils/dateTimeService";
import { WEEKDAY_NAMES, TIME_CONSTANTS } from "../constants";
import { RRule, Weekday } from "rrule";
import { v4 as uuidv4 } from "uuid";
import { calendarColors } from "@/data/calendarColors";
import { PerTemplateMask } from "../models/TemplateModels";
export type { PerTemplateMask };

export class TemplateExpander {
  private expandedTemplates: Map<string, SimpleEvent[]> = new Map();
  private templateFailureCount: number = 0;

  constructor(private weekStartDay: WeekDayIntegers) {}

  /**
   * Expand templates for a date range
   * Creates ONE event per template with RRule for recurrence
   */
  expandTemplates(
    userId: string,
    templates: EventTemplate[],
    startDate: Date,
    // Comment: unused variable, implement for multiple templates
    _endDate: Date,
  ): SimpleEvent[] {
    const events: SimpleEvent[] = [];
    this.templateFailureCount = 0;

    for (const template of templates) {
      const event = this.createRecurringTemplateEvent(
        userId,
        template,
        startDate,
      );
      if (event) {
        events.push(event);
      } else {
        this.templateFailureCount++;
      }
    }

    return events;
  }

  /**
   * Get the count of templates that failed to expand
   */
  getTemplateFailureCount(): number {
    return this.templateFailureCount;
  }

  /**
   * Create a single recurring template event with RRule
   */
  private createRecurringTemplateEvent(
    userId: string,
    template: EventTemplate,
    weekStartDate: Date,
  ): SimpleEvent | null {
    if (
      !template.startDay ||
      !template.startTime ||
      template.duration === undefined
    ) {
      console.error("Template details incomplete:", template);
      return null;
    }

    // Comment: Should WEEKDAY_NAMES be an enum?
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
      template.startTime,
    );
    const endMinutes =
      startDate.getHours() * 60 + startDate.getMinutes() + template.duration;
    const endDayOffset = Math.floor(endMinutes / 1440);
    const endTimeMinutes = endMinutes % 1440;
    const endDate = new Date(eventDate);
    endDate.setDate(endDate.getDate() + endDayOffset);
    endDate.setHours(
      Math.floor(endTimeMinutes / 60),
      endTimeMinutes % 60,
      0,
      0,
    );

    const rruleDay = this.getRRuleDayFromIndex(startDate.getDay());

    const pad = (n: number) => String(n).padStart(2, "0");
    const startISO = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}T${pad(startDate.getHours())}:${pad(startDate.getMinutes())}:${pad(startDate.getSeconds())}`;

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
        plannerType: null,
        eventType: EventType.template,
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
    date: Date,
  ): Array<{ start: Date; end: Date }> {
    const dayOfWeek = date.getDay();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    return masks
      .filter((mask) => mask.dayOfWeek === dayOfWeek)
      .map((mask) => {
        const start = new Date(dayStart);
        start.setHours(
          Math.floor(mask.startMinutes / 60),
          mask.startMinutes % 60,
          0,
          0,
        );

        const endDayOffset = Math.floor(mask.endMinutes / 1440);
        const endTimeMinutes = mask.endMinutes % 1440;
        const end = new Date(dayStart);
        end.setDate(end.getDate() + endDayOffset);
        end.setHours(
          Math.floor(endTimeMinutes / 60),
          endTimeMinutes % 60,
          0,
          0,
        );

        return { start, end };
      });
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

      const [h, m] = template.startTime.split(":").map((s) => parseInt(s, 10));
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + template.duration;

      const t = template as unknown as Record<string, unknown>;

      masks.push({
        templateId: template.id,
        title: template.title,
        color: template.color as string,
        locationId: template.locationId ?? null,
        dayOfWeek: startDayIndex,
        startMinutes,
        endMinutes,
        startDateISO: (() => {
          if (typeof t.startDateISO === "string") return t.startDateISO;
          if (typeof t.startDate === "string") return t.startDate;
          if (typeof t.anchorDate === "string") return t.anchorDate;
          return undefined;
        })(),
        intervalDays: (() => {
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
