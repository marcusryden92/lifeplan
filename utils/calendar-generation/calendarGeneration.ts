/**
 * Calendar Generation - Main Entry Point
 *
 * This file maintains backward compatibility while using the new
 * CalendarGenerator architecture under the hood.
 */

import { WeekDayIntegers } from "@/types/calendarTypes";
import { Planner, EventTemplate, SimpleEvent } from "@/types/prisma";
import { CalendarGenerator } from "./core/CalendarGenerator";
import { SCHEDULING_CONFIG } from "./constants";

/**
 * Generate calendar events from planners and templates
 *
 * @param userId - User ID
 * @param weekStartDay - Day the week starts on (0-6, Sunday-Saturday)
 * @param template - Event templates (recurring scheduled blocks)
 * @param planner - Planner items (tasks, goals, plans)
 * @param prevCalendar - Previous calendar events to preserve
 * @returns Array of calendar events
 */
export function generateCalendar(
  userId: string,
  weekStartDay: WeekDayIntegers,
  template: EventTemplate[],
  planner: Planner[],
  prevCalendar: SimpleEvent[]
): SimpleEvent[] {
  // Use the new CalendarGenerator
  const generator = new CalendarGenerator(weekStartDay);

  const result = generator.generate({
    userId,
    weekStartDay,
    templates: template,
    planners: planner,
    previousCalendar: prevCalendar,
    config: {
      maxDaysAhead: SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH,
      enableLogging: false,
    },
  });

  // Log detailed info in development
  if (process.env.NODE_ENV === "development") {
    console.log("Calendar Generation Metrics:", result.metrics);
    console.log("Templates passed:", template?.length || 0);
    console.log(
      "Template events generated:",
      result.metrics.templateEventsGenerated
    );
    console.log("Total events returned:", result.events.length);
    console.log(
      "Template events in result:",
      result.events.filter((e) => e.extendedProps?.itemType === "template")
        .length
    );
    if (result.failures.length > 0) {
      console.warn("Scheduling Failures:", result.failures);
      console.table(
        result.failures.map((f) => ({
          task: f.taskTitle,
          reason: f.reason,
          details: f.details,
        }))
      );
    }
  }

  return result.events;
}
