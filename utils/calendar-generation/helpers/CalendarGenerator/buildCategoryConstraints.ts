import { Category } from "@/types/prisma";
import type { CategoryConstraint } from "@/types/categoryTypes";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { CategoryPeriodsResult } from "../../models/SchedulingModels";

function buildCategoryConstraintMap(
  categories: Category[],
): Map<string, CategoryConstraint> {
  const map = new Map<string, CategoryConstraint>();

  for (const category of categories) {
    if (category.timeSlots.length === 0) continue;
    map.set(category.id, {
      id: category.id,
      name: category.name,
      color: category.color,
      timeSlots: category.timeSlots.map((ts) => ({
        days: ts.days as WeekDayIntegers[],
        startTime: ts.startTime,
        endTime: ts.endTime,
      })),
      isStrict: category.isStrict,
      locationId: category.locationId as string | null | undefined,
    });
  }

  return map;
}

export function buildCategoryConstraints(
  categories: Category[] | undefined,
): CategoryPeriodsResult {
  if (!categories || categories.length === 0) {
    return {
      categoryConstraintMap: new Map(),
      categoryConstraintsList: [],
    };
  }

  const categoryConstraintMap = buildCategoryConstraintMap(categories);
  const categoryConstraintsList = Array.from(categoryConstraintMap.values());

  return {
    categoryConstraintMap,
    categoryConstraintsList,
  };
}
