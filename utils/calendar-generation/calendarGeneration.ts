/**
 * Calendar Generation - Main Entry Point
 *
 * This file maintains backward compatibility while using the new
 * CalendarGenerator architecture under the hood.
 */

import { WeekDayIntegers } from "@/types/calendarTypes";
import {
  Planner,
  EventTemplate,
  SimpleEvent,
  Category,
  CategoryEvent,
  TravelEvent,
  EngineMessage,
} from "@/types/prisma";
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
  /**
   * Prior engine messages array, consulted at emit time to carry forward
   * the user-owned `dismissed` flag by id. Callers pass the current Redux
   * engineMessages slice.
   */
  previousEngineMessages?: EngineMessage[];
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
 * @returns `{ events, categoryEvents, travelEvents }` — events are plans +
 *   scheduled tasks; categoryEvents are the materialized weekly category
 *   occurrences (with trespass info); travelEvents are the materialized travel
 *   blocks between scheduled items.
 */
export function generateCalendar(
  userId: string,
  weekStartDay: WeekDayIntegers,
  template: EventTemplate[],
  planner: Planner[],
  prevCalendar: SimpleEvent[],
  options: GenerateCalendarOptions | number = {},
): {
  events: SimpleEvent[];
  categoryEvents: CategoryEvent[];
  travelEvents: TravelEvent[];
  plannerScores: Record<string, number>;
  messages: EngineMessage[];
} {
  // Handle backwards compatibility - if a number is passed, treat it as bufferTimeMinutes
  const opts: GenerateCalendarOptions =
    typeof options === "number" ? { bufferTimeMinutes: options } : options;

  const bufferTimeMinutes = opts.bufferTimeMinutes ?? 10;

  // Untriaged rows are Capture-inbox jots (duration 0, no start time) — they
  // are not real scheduling input, and letting them through poisons the whole
  // regen: validatePlanners errors on a zero-duration task or a start-less
  // plan, and the generator returns empty events on any validation failure.
  // Drop them once here, at the input boundary.
  const scheduledPlanners = planner.filter((p) => p.isTriaged !== false);

  // Logging configuration - set enableLogging to false to disable all logging.
  // dateRangeStart / dateRangeEnd limit event-based logs (finalEvents,
  // leanCalendar, travelDebug, the [travel] dump in assembleFinalEvents) to
  // items whose start falls within [dateRangeStart, dateRangeEnd]. Either bound
  // can be null to leave that side open.
  // Off by default: the engine runs on every planner edit, and an enabled
  // recorder accumulates decision/action/slot-snapshot records for every
  // failed task on every retry pass — real per-keystroke cost, not just
  // console noise. Flip locally when debugging.
  const enableLogging = false;
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
    staticEventTravelPass: false,
    dynamicScheduling: false,
    dateRangeStart: null as Date | null,
    dateRangeEnd: null as Date | null,
  };

  const result = new CalendarGenerator(weekStartDay, {
    userId,
    weekStartDay,
    templates: template,
    planners: scheduledPlanners,
    previousCalendar: prevCalendar,
    previousEngineMessages: opts.previousEngineMessages,
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

  return {
    events: result.events,
    categoryEvents: result.categoryEvents,
    travelEvents: result.travelEvents,
    plannerScores: result.plannerScores,
    messages: result.messages,
  };
}
