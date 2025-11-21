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
    endDate: Date
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

    // Create a dummy week to calculate gaps
    const weekStart = dateTimeService.startOfDay(new Date());
    const simpleEvents = this.generateSimpleTemplateEvents(
      "temp",
      templates,
      weekStart
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
}
