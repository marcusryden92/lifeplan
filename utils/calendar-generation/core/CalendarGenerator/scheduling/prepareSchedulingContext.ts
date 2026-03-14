/**
 * Scheduling Context Preparation
 *
 * Prepares the context object for scheduling
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { TimeSlotManager } from "../../TimeSlotManager";
import {
  SchedulingContext,
  SchedulingMetrics,
  CategoryConstraint,
} from "../../../models/SchedulingModels";
import { dateTimeService } from "../../../utils/dateTimeService";

export function prepareSchedulingContext(
  userId: string,
  currentDate: Date,
  weekStartDay: WeekDayIntegers,
  allPlanners: Planner[],
  scheduledEvents: SimpleEvent[],
  slotManager: TimeSlotManager,
  metrics: SchedulingMetrics,
  categoryConstraints: Map<string, CategoryConstraint>,
  plannerLocationMap: Map<string, string | null>,
  plannerCategoryMap: Map<string, string | null>,
  plannerTravelLocationMap?: Map<string, string | null>
): SchedulingContext {
  const weekStart = dateTimeService.getWeekFirstDate(currentDate, weekStartDay);

  return {
    currentDate,
    userId,
    weekStartDay,
    allPlanners,
    scheduledEvents,
    availableMinutesPerWeek: slotManager.getWeekAvailableMinutes(weekStart),
    metrics,
    categoryConstraints,
    plannerLocationMap,
    plannerTravelLocationMap,
    plannerCategoryMap,
  };
}
