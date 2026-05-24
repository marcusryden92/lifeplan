/**
 * TemplateExpander
 *
 * Handles expansion of EventTemplate into actual SimpleEvent instances.
 * Pre-generates recurring template events for a date range using RRule.
 */

import { EventTemplate, SimpleEvent, EventType } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { dateTimeService } from "../utils/dateTimeService";
import { TIME_CONSTANTS } from "../constants";
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
      template.startDay === null ||
      template.startDay === undefined ||
      !template.startTime ||
      template.duration === undefined
    ) {
      console.error("Template details incomplete:", template);
      return null;
    }

    const dayOffset = (template.startDay - this.weekStartDay + 7) % 7;
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

    const weekStart = dateTimeService.startOfDay(new Date());
    const masks = this.getPerTemplateMasks(templates);

    let largestGap = 0;
    for (let d = 0; d < 7; d++) {
      const dayStart = dateTimeService.shiftDays(weekStart, d);
      const gaps = TemplateExpander.gapIntervalsForDay(masks, dayStart);
      for (const gap of gaps) {
        const len = (gap.end.getTime() - gap.start.getTime()) / 60000;
        if (len > largestGap) largestGap = len;
      }
    }

    return largestGap;
  }

  /**
   * Return the gap intervals (unoccupied stretches) for a single day, given
   * the per-template masks. Static so capacity-check code can subtract
   * strict-category windows from these gaps without holding a TemplateExpander
   * instance.
   */
  static gapIntervalsForDay(
    masks: PerTemplateMask[],
    date: Date,
  ): Array<{ start: Date; end: Date }> {
    const dayStart = dateTimeService.startOfDay(date);
    const dayEnd = dateTimeService.endOfDay(date);

    const occupied = TemplateExpander.masksToIntervalsForDay(masks, dayStart);

    if (occupied.length === 0) {
      return [{ start: dayStart, end: dayEnd }];
    }

    occupied.sort((a, b) => a.start.getTime() - b.start.getTime());

    const gaps: Array<{ start: Date; end: Date }> = [];

    if (occupied[0].start.getTime() > dayStart.getTime()) {
      gaps.push({ start: dayStart, end: occupied[0].start });
    }
    for (let i = 0; i < occupied.length - 1; i++) {
      if (occupied[i].end.getTime() < occupied[i + 1].start.getTime()) {
        gaps.push({ start: occupied[i].end, end: occupied[i + 1].start });
      }
    }
    const last = occupied[occupied.length - 1];
    if (last.end.getTime() < dayEnd.getTime()) {
      gaps.push({ start: last.end, end: dayEnd });
    }

    return gaps;
  }

  /**
   * Convert masks to intervals for a specific day. Static so gapIntervalsForDay
   * can call it without an instance.
   */
  private static masksToIntervalsForDay(
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
        template.startDay === null ||
        template.startDay === undefined ||
        !template.startTime ||
        template.duration === undefined
      ) {
        continue;
      }

      const [h, m] = template.startTime.split(":").map((s) => parseInt(s, 10));
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + template.duration;

      const t = template as unknown as Record<string, unknown>;

      masks.push({
        templateId: template.id,
        title: template.title,
        color: template.color as string,
        locationId: template.locationId ?? null,
        dayOfWeek: template.startDay,
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
