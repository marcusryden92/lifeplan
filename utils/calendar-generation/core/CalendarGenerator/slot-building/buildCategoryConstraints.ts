/**
 * Category Constraints Builder
 *
 * Builds category constraint map and generates time slot periods
 */

import { Category } from "@/types/prisma";
import { CategoryConstraint } from "../../../models/SchedulingModels";
import {
  buildCategoryConstraintMap,
  generateCategorySlotPeriods,
} from "../../../utils/categoryConstraintUtils";
import { dateTimeService } from "../../../utils/dateTimeService";
import { WeekDayIntegers } from "@/types/calendarTypes";

export interface CategoryPeriodsResult {
  categoryConstraintMap: Map<string, CategoryConstraint>;
  categoryConstraintsList: CategoryConstraint[];
  categoryPeriodsStatic: Array<{
    start: Date;
    end: Date;
    categoryId: string;
    categoryName: string;
    categoryColor?: string | null;
    isStrict: boolean;
  }>;
  wrapperPeriodsForManager: Array<{
    start: Date;
    end: Date;
    locationId: string | null;
    categoryId: string;
    isStrict: boolean;
  }>;
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
      categoryPeriodsStatic: [],
      wrapperPeriodsForManager: [],
    };
  }

  const categoryConstraintMap = buildCategoryConstraintMap(categories);
  const categoryConstraintsList = Array.from(categoryConstraintMap.values());

  const weekStart = dateTimeService.getWeekFirstDate(currentDate, weekStartDay);
  const searchEndDate = dateTimeService.shiftDays(weekStart, maxDaysAhead);

  const categoryPeriodsStatic =
    categoryConstraintsList.length > 0
      ? generateCategorySlotPeriods(
          currentDate,
          searchEndDate,
          categoryConstraintsList
        )
      : [];

  // Build wrapper periods for slot manager — all periods, not just those with locations,
  // so that location-less categories still participate in slot identity tagging.
  const wrapperPeriodsForManager = categoryPeriodsStatic.map((p) => ({
    start: p.start,
    end: p.end,
    locationId:
      categoryConstraintsList.find((c) => c.id === p.categoryId)?.locationId ??
      null,
    categoryId: p.categoryId,
    isStrict: p.isStrict,
  }));

  return {
    categoryConstraintMap,
    categoryConstraintsList,
    categoryPeriodsStatic,
    wrapperPeriodsForManager,
  };
}
