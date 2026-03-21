/**
 * Category Constraints Builder
 *
 * Builds category constraint map and generates time slot periods
 */

import { Category } from "@/types/prisma";
import { CategoryConstraint, CategoryPeriod } from "../../../models/SchedulingModels";
import {
  buildCategoryConstraintMap,
  generateCategorySlotPeriods,
} from "../../../utils/categoryConstraintUtils";
import { dateTimeService } from "../../../utils/dateTimeService";
import { WeekDayIntegers } from "@/types/calendarTypes";

export interface CategoryPeriodsResult {
  categoryConstraintMap: Map<string, CategoryConstraint>;
  categoryConstraintsList: CategoryConstraint[];
  categoryPeriods: CategoryPeriod[];
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
