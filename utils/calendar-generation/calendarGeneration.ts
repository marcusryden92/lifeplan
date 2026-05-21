/**
 * Calendar Generation - Main Entry Point
 *
 * This file maintains backward compatibility while using the new
 * CalendarGenerator architecture under the hood.
 */

import { WeekDayIntegers } from "@/types/calendarTypes";
import { Planner, EventTemplate, SimpleEvent, Category } from "@/types/prisma";
import { CalendarGenerator } from "./core/CalendarGenerator";
import { SCHEDULING_CONFIG } from "./constants";
import type {
  TravelTimeEntry,
  LocationGroupingScoresConfig,
  LocationGroupingPenaltiesConfig,
} from "./models/SchedulingModels";

/**
 * Options for calendar generation
 */
export interface GenerateCalendarOptions {
  bufferTimeMinutes?: number;
  travelTimeMatrix?: Map<string, TravelTimeEntry>;
  injectTravelEvents?: boolean;
  strategyWeights?: {
    earliestSlot?: number;
    locationGrouping?: number;
  };
  locationGroupingScores?: LocationGroupingScoresConfig;
  locationGroupingPenalties?: LocationGroupingPenaltiesConfig;
  categories?: Category[];
}

/**
 * Generate calendar events from planners and templates
 *
 * @param userId - User ID
 * @param weekStartDay - Day the week starts on (0-6, Sunday-Saturday)
 * @param template - Event templates (recurring scheduled blocks)
 * @param planner - Planner items (tasks, goals, plans)
 * @param prevCalendar - Previous calendar events to preserve
 * @param options - Optional configuration (bufferTimeMinutes, travelTimeMatrix, injectTravelEvents)
 * @returns Array of calendar events
 */
export function generateCalendar(
  userId: string,
  weekStartDay: WeekDayIntegers,
  template: EventTemplate[],
  planner: Planner[],
  prevCalendar: SimpleEvent[],
  options: GenerateCalendarOptions | number = {},
): SimpleEvent[] {
  // Handle backwards compatibility - if a number is passed, treat it as bufferTimeMinutes
  const opts: GenerateCalendarOptions =
    typeof options === "number" ? { bufferTimeMinutes: options } : options;

  const bufferTimeMinutes = opts.bufferTimeMinutes ?? 10;

  // Logging configuration - set enableLogging to false to disable all logging.
  // dateRangeStart / dateRangeEnd limit event-based logs (finalEvents,
  // leanCalendar, travelDebug, the [travel] dump in assembleFinalEvents) to
  // items whose start falls within [dateRangeStart, dateRangeEnd]. Either bound
  // can be null to leave that side open.
  const enableLogging = true;
  const logging = {
    metrics: false,
    failures: false,
    travelDebug: false,
    templateInfo: false,
    planners: false,
    templates: false,
    locations: false,
    strategySettings: false,
    finalEvents: false,
    leanCalendar: false,
    preliminaryTravelPass: true,
    dateRangeStart: new Date("2026-05-23T08:00") as Date | null,
    dateRangeEnd: new Date("2026-05-23T17:00") as Date | null,
  };

  const result = new CalendarGenerator(weekStartDay, {
    userId,
    weekStartDay,
    templates: template,
    planners: planner,
    previousCalendar: prevCalendar,
    categories: opts.categories,
    config: {
      maxDaysAhead: SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH,
      enableLogging,
      logging,
      bufferTimeMinutes,
      travelTimeMatrix: opts.travelTimeMatrix,
      injectTravelEvents: opts.injectTravelEvents,
      strategyWeights: opts.strategyWeights,
      locationGroupingScores: opts.locationGroupingScores,
      locationGroupingPenalties: opts.locationGroupingPenalties,
    },
  }).generate();

  return result.events;
}
