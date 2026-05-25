/**
 * Find Valid Slots
 *
 * Resolves task location, finds fitting slots, and filters by category constraints.
 */

import { Planner } from "@/types/prisma";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import {
  SchedulingContext,
  SchedulingFailure,
  FindValidSlotsResult,
} from "../../models/SchedulingModels";
import { SchedulingFailureReason } from "../../constants";
import { findAllFittingSlots } from "../TimeSlotManager/findAllFittingSlots";

export function findValidSlots(
  task: Planner,
  slotManager: TimeSlotManager,
  context: SchedulingContext,
  afterTime?: Date,
): FindValidSlotsResult | { failure: SchedulingFailure } {
  const taskLocationId = context.plannerLocationMap?.get(task.id) ?? null;

  // Resolve effective category from parent chain via pre-built map
  const effectiveCategoryId =
    context.plannerCategoryMap?.get(task.id) ?? task.categoryId;

  const constraintForTask =
    effectiveCategoryId && context.categories
      ? context.categories.get(effectiveCategoryId) || undefined
      : undefined;

  // Find all slots that can fit the base requirement (duration + buffer)
  const fittingSlots = findAllFittingSlots(
    slotManager.slots,
    slotManager.bufferTimeMinutes,
    task.duration,
    afterTime || context.currentDate,
    undefined,
    constraintForTask,
    context.placementCutoffDate,
  );

  if (fittingSlots.length === 0) {
    return {
      failure: {
        taskId: task.id,
        taskTitle: task.title,
        reason: SchedulingFailureReason.NO_SLOTS,
        details: `No available time slots found for ${task.duration} minutes`,
      },
    };
  }

  // findAllFittingSlots already filters by category membership via
  // categoryConstraint; the post-filter from the old AvailableSlot model is no
  // longer needed.
  return {
    validSlots: fittingSlots,
    fittingSlots,
    taskLocationId,
    constraintForTask,
  };
}
