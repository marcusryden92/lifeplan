/**
 * Utilities for working with category time constraints in scheduling
 */

import type { CategoryTimeSlot } from "@/types/categoryTypes";
import type { CategoryConstraint, CategoryPeriod } from "../models/SchedulingModels";
import { Category, Planner } from "@/types/prisma";
import { parseCategoryTimeSlots } from "@/utils/categoryHelpers";

/**
 * Check if a given date/time falls within any of the category's time slots
 */
/**
 * Convert time string (HH:MM) to minutes since midnight for reliable comparison
 */
function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isTimeInCategorySlots(
  date: Date,
  timeSlots: CategoryTimeSlot[]
): boolean {
  if (!timeSlots || timeSlots.length === 0) return true;

  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const taskMinutes = date.getHours() * 60 + date.getMinutes();

  for (const slot of timeSlots) {
    // Check if this day is included in the slot
    if (!slot.days.includes(dayOfWeek)) continue;

    // Check if time falls within the slot using numeric comparison
    const startMinutes = timeStringToMinutes(slot.startTime);
    const endMinutes = timeStringToMinutes(slot.endTime);
    if (taskMinutes >= startMinutes && taskMinutes <= endMinutes) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a time range completely fits within any of the category's time slots
 */
export function doesTimeRangeFitInCategorySlots(
  startDate: Date,
  endDate: Date,
  timeSlots: CategoryTimeSlot[]
): boolean {
  if (!timeSlots || timeSlots.length === 0) return true;

  const dayOfWeek = startDate.getDay();
  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
  const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

  // Check if both start and end are on the same day
  if (startDate.getDay() !== endDate.getDay()) {
    // Task spans multiple days - need to check if it fits within slots on both days
    // For now, we'll be conservative and say it doesn't fit
    return false;
  }

  // Find a slot on this day that contains the entire time range
  for (const slot of timeSlots) {
    if (!slot.days.includes(dayOfWeek)) continue;

    // Check if both start and end times fit within this slot using numeric comparison
    const slotStartMinutes = timeStringToMinutes(slot.startTime);
    const slotEndMinutes = timeStringToMinutes(slot.endTime);
    const fits =
      startMinutes >= slotStartMinutes && endMinutes <= slotEndMinutes;

    if (fits) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a time range overlaps with any of the category's time slots
 */
export function doesTimeRangeOverlapCategorySlots(
  startDate: Date,
  endDate: Date,
  timeSlots: CategoryTimeSlot[]
): boolean {
  if (!timeSlots || timeSlots.length === 0) return true;

  // Check start and end times
  return (
    isTimeInCategorySlots(startDate, timeSlots) ||
    isTimeInCategorySlots(endDate, timeSlots)
  );
}

/**
 * Get all category time slot periods within a date range
 * Returns array of {start, end, categoryId} objects
 */
export function generateCategorySlotPeriods(
  startDate: Date,
  endDate: Date,
  categories: CategoryConstraint[]
): CategoryPeriod[] {
  const periods: CategoryPeriod[] = [];

  for (const category of categories) {
    const timeSlots = category.timeSlots;
    if (!timeSlots || timeSlots.length === 0) continue;

    // Iterate through each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Check each time slot
      for (const slot of timeSlots) {
        if (!slot.days.includes(dayOfWeek)) continue;

        // Parse start and end times
        const [startHour, startMin] = slot.startTime.split(":").map(Number);
        const [endHour, endMin] = slot.endTime.split(":").map(Number);

        const periodStart = new Date(currentDate);
        periodStart.setHours(startHour, startMin, 0, 0);

        const periodEnd = new Date(currentDate);
        periodEnd.setHours(endHour, endMin, 0, 0);

        // Only add if within the overall range
        if (periodStart >= startDate && periodEnd <= endDate) {
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
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }
  }

  // Sort by start time
  periods.sort((a, b) => a.start.getTime() - b.start.getTime());

  return periods;
}

/**
 * Build category constraint map from raw categories
 */
export function buildCategoryConstraintMap(
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

/**
 * Check if an item can be scheduled at a given time based on category constraints
 * @param startDate - When the item would start
 * @param categoryId - The category ID of the item
 * @param categoryConstraints - Map of category constraints
 * @param durationMinutes - How long the item lasts (optional, if provided checks entire duration fits)
 */
export function canScheduleAtTime(
  startDate: Date,
  categoryId: string | null | undefined,
  categoryConstraints: Map<string, CategoryConstraint>,
  durationMinutes?: number
): boolean {
  // If item has no category, it can be scheduled anywhere (unless there's a strict category slot)
  if (!categoryId) {
    // Check if this time falls in any strict category slot
    for (const constraint of categoryConstraints.values()) {
      const timeSlots = constraint.timeSlots;

      if (constraint.isStrict) {
        // If duration provided, check if the entire duration overlaps with strict slot
        if (durationMinutes) {
          const endDate = new Date(
            startDate.getTime() + durationMinutes * 60 * 1000
          );
          if (
            doesTimeRangeOverlapCategorySlots(startDate, endDate, timeSlots)
          ) {
            return false; // Strict slot blocks uncategorized items
          }
        } else if (isTimeInCategorySlots(startDate, timeSlots)) {
          return false; // Strict slot blocks uncategorized items
        }
      }
    }
    return true;
  }

  // Get the category constraint
  const constraint = categoryConstraints.get(categoryId);
  if (!constraint) return true; // No constraint, can schedule anywhere

  // Item must be within its category's time slots
  const timeSlots = constraint.timeSlots;

  // If duration provided, check if entire task fits within time slots
  if (durationMinutes) {
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    return doesTimeRangeFitInCategorySlots(startDate, endDate, timeSlots);
  }

  return isTimeInCategorySlots(startDate, timeSlots);
}

/**
 * Build a map of planner ID -> effective categoryId by walking up the parent chain.
 * Only the root item needs categoryId stored; descendants inherit it automatically.
 * Uses memoization so each node is resolved at most once — O(n) total regardless of tree depth.
 */
export function buildPlannerCategoryMap(
  planners: Planner[]
): Map<string, string | null> {
  const plannerMap = new Map(planners.map((p) => [p.id, p]));
  const result = new Map<string, string | null>();

  function resolve(id: string): string | null {
    if (result.has(id)) return result.get(id)!;

    const planner = plannerMap.get(id);
    if (!planner) {
      result.set(id, null);
      return null;
    }

    if (planner.categoryId) {
      result.set(id, planner.categoryId);
      return planner.categoryId;
    }

    const resolved = planner.parentId ? resolve(planner.parentId) : null;
    result.set(id, resolved);
    return resolved;
  }

  for (const planner of planners) {
    resolve(planner.id);
  }

  return result;
}
