/**
 * Scheduling Context Preparation
 *
 * Prepares the context object for scheduling
 */

import { Planner, SimpleEvent, Category } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import {
  SchedulingContext,
  SchedulingMetrics,
} from "../../models/SchedulingModels";
import { dateTimeService } from "../../utils/dateTimeService";
import { getDaySlots } from "../TimeSlotManager/getDaySlots";

export function prepareSchedulingContext(
  userId: string,
  currentDate: Date,
  weekStartDay: WeekDayIntegers,
  allPlanners: Planner[],
  scheduledEvents: SimpleEvent[],
  timeSlotManager: TimeSlotManager,
  metrics: SchedulingMetrics,
  scheduledCategories: Category[],
  plannerLocationMap: Map<string, string | null>,
  plannerCategoryMap: Map<string, string | null>,
): SchedulingContext {
  const weekStart = dateTimeService.getWeekFirstDate(currentDate, weekStartDay);

  let availableMinutesPerWeek = 0;
  for (let i = 0; i < 7; i++) {
    const date = dateTimeService.shiftDays(weekStart, i);
    const slots = getDaySlots(timeSlotManager.slots, date);
    availableMinutesPerWeek += slots.reduce((t, s) => t + s.durationMinutes, 0);
  }

  const categoryById = new Map<string, Category>(
    scheduledCategories.map((c) => [c.id, c]),
  );

  return {
    currentDate,
    userId,
    weekStartDay,
    allPlanners,
    scheduledEvents,
    availableMinutesPerWeek,
    metrics,
    categories: categoryById,
    plannerLocationMap,
    plannerCategoryMap,
  };
}
