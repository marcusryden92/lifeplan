/**
 * Utilities for working with category time constraints in scheduling
 */

import type { CategoryTimeSlot } from "@/types/categoryTypes";
import type { CategoryConstraint } from "../models/SchedulingModels";
import { Category } from "@/types/prisma";
import { parseCategoryTimeSlots } from "@/utils/categoryHelpers";

/**
 * Check if a given date/time falls within any of the category's time slots
 */
export function isTimeInCategorySlots(
  date: Date,
  timeSlots: CategoryTimeSlot[]
): boolean {
  if (!timeSlots || timeSlots.length === 0) return true;

  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const timeString = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;

  for (const slot of timeSlots) {
    // Check if this day is included in the slot
    if (!slot.days.includes(dayOfWeek)) continue;

    // Check if time falls within the slot
    if (timeString >= slot.startTime && timeString <= slot.endTime) {
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
): Array<{
  start: Date;
  end: Date;
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  isStrict: boolean;
}> {
  const periods: Array<{
    start: Date;
    end: Date;
    categoryId: string;
    categoryName: string;
    categoryColor?: string | null;
    isStrict: boolean;
  }> = [];

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
 */
export function canScheduleAtTime(
  date: Date,
  categoryId: string | null | undefined,
  categoryConstraints: Map<string, CategoryConstraint>
): boolean {
  // If item has no category, it can be scheduled anywhere (unless there's a strict category slot)
  if (!categoryId) {
    // Check if this time falls in any strict category slot
    for (const constraint of categoryConstraints.values()) {
      const timeSlots = constraint.timeSlots;

      if (constraint.isStrict && isTimeInCategorySlots(date, timeSlots)) {
        return false; // Strict slot blocks uncategorized items
      }
    }
    return true;
  }

  // Get the category constraint

  const constraint = categoryConstraints.get(categoryId);
  if (!constraint) return true; // No constraint, can schedule anywhere

  // Item must be within its category's time slots
  const timeSlots = constraint.timeSlots;
  return isTimeInCategorySlots(date, timeSlots);
}
