/**
 * Scheduling Context Preparation
 *
 * Prepares the context object for scheduling
 */

import { Planner, SimpleEvent, Category } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import {
  SchedulingContext,
  SchedulingMetrics,
} from "../../models/SchedulingModels";
import { SchedulerRecorder } from "../Scheduler/SchedulerRecorder";

export function prepareSchedulingContext(
  userId: string,
  currentDate: Date,
  weekStartDay: WeekDayIntegers,
  allPlanners: Planner[],
  scheduledEvents: SimpleEvent[],
  metrics: SchedulingMetrics,
  scheduledCategories: Category[],
  plannerLocationMap: Map<string, string | null>,
  plannerCategoryMap: Map<string, string | null>,
  schedulerRecorder: SchedulerRecorder | null,
  previousCalendarById?: Map<string, SimpleEvent>,
): SchedulingContext {
  const categoryById = new Map<string, Category>(
    scheduledCategories.map((c) => [c.id, c]),
  );

  return {
    currentDate,
    userId,
    weekStartDay,
    allPlanners,
    scheduledEvents,
    metrics,
    categories: categoryById,
    plannerLocationMap,
    plannerCategoryMap,
    schedulerRecorder,
    previousCalendarById,
  };
}
