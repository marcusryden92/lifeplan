/**
 * Category Constraints Builder
 *
 * Builds category constraint map and generates time slot periods
 */

import { Category } from "@/types/prisma";
import type { CategoryConstraint, CategoryPeriod } from "@/types/categoryTypes";
import { parseCategoryTimeSlots } from "@/utils/categoryHelpers";
import { dateTimeService } from "../../utils/dateTimeService";
import { TIME_CONSTANTS } from "../../constants";
import { WeekDayIntegers } from "@/types/calendarTypes";

export interface CategoryPeriodsResult {
  categoryConstraintMap: Map<string, CategoryConstraint>;
  categoryConstraintsList: CategoryConstraint[];
  categoryPeriods: CategoryPeriod[];
}

function buildCategoryConstraintMap(
  categories: Category[]
): Map<string, CategoryConstraint> {
  const map = new Map<string, CategoryConstraint>();

  for (const category of categories) {
    const timeSlots = parseCategoryTimeSlots(category.timeSlots);
    if (timeSlots && timeSlots.length > 0) {
      map.set(category.id, {
        id: category.id,
        name: category.name,
        color: category.color,
        timeSlots,
        isStrict: category.isStrict,
        locationId: category.locationId as string | null | undefined,
      });
    }
  }

  return map;
}

function generateCategorySlotPeriods(
  startDate: Date,
  endDate: Date,
  categories: CategoryConstraint[]
): CategoryPeriod[] {
  const periods: CategoryPeriod[] = [];
  const { MS_PER_WEEK } = TIME_CONSTANTS;

  for (const category of categories) {
    const timeSlots = category.timeSlots;
    if (!timeSlots || timeSlots.length === 0) continue;

    for (const slot of timeSlots) {
      const [startHour, startMin] = slot.startTime.split(":").map(Number);
      const [endHour, endMin] = slot.endTime.split(":").map(Number);

      const startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;
      // Overnight slot: end is on the following day
      if (endMinutes <= startMinutes) endMinutes += 24 * 60;
      const durationMs = (endMinutes - startMinutes) * 60000;

      for (const dayOfWeek of slot.days) {
        const searchBase = new Date(startDate);
        searchBase.setHours(0, 0, 0, 0);
        const daysUntil = (dayOfWeek - searchBase.getDay() + 7) % 7;
        searchBase.setDate(searchBase.getDate() + daysUntil);

        while (searchBase <= endDate) {
          const periodStart = new Date(searchBase);
          periodStart.setHours(startHour, startMin, 0, 0);
          const periodEnd = new Date(periodStart.getTime() + durationMs);

          if (periodEnd > startDate && periodStart < endDate) {
            periods.push({
              start: periodStart,
              end: periodEnd,
              categoryId: category.id,
              categoryName: category.name,
              categoryColor: category.color,
              locationId: category.locationId ?? null,
              isStrict: category.isStrict,
            });
          }

          searchBase.setTime(searchBase.getTime() + MS_PER_WEEK);
        }
      }
    }
  }

  periods.sort((a, b) => a.start.getTime() - b.start.getTime());

  return periods;
}

export function buildCategoryConstraints(
  categories: Category[] | undefined,
  currentDate: Date,
  weekStartDay: WeekDayIntegers,
  maxDaysAhead: number
): CategoryPeriodsResult {
  if (!categories || categories.length === 0) {
    return {
      categoryConstraintMap: new Map(),
      categoryConstraintsList: [],
      categoryPeriods: [],
    };
  }

  const categoryConstraintMap = buildCategoryConstraintMap(categories);
  const categoryConstraintsList = Array.from(categoryConstraintMap.values());

  const weekStart = dateTimeService.getWeekFirstDate(currentDate, weekStartDay);
  const searchEndDate = dateTimeService.shiftDays(weekStart, maxDaysAhead);

  const categoryPeriods =
    categoryConstraintsList.length > 0
      ? generateCategorySlotPeriods(currentDate, searchEndDate, categoryConstraintsList)
      : [];

  return {
    categoryConstraintMap,
    categoryConstraintsList,
    categoryPeriods,
  };
}
