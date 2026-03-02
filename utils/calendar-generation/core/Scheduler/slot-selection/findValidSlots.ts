/**
 * Find Valid Slots
 *
 * Resolves task location, finds fitting slots, and filters by category constraints.
 */

import { Planner } from "@/types/prisma";
import { TimeSlotManager } from "../../TimeSlotManager";
import {
  SchedulingContext,
  SchedulingFailure,
  CategoryConstraint,
} from "../../../models/SchedulingModels";
import { TimeSlot } from "../../../models/TimeSlot";
import { SchedulingFailureReason } from "../../../constants";
import { canScheduleAtTime } from "../../../utils/categoryConstraintUtils";

export interface FindValidSlotsResult {
  validSlots: TimeSlot[];
  fittingSlots: TimeSlot[];
  taskLocationId: string | null | undefined;
  constraintForTask: CategoryConstraint | undefined;
}

export function findValidSlots(
  task: Planner,
  slotManager: TimeSlotManager,
  context: SchedulingContext,
  afterTime?: Date
): FindValidSlotsResult | { failure: SchedulingFailure } {
  // Get task's effective location for travel-aware scheduling
  // Prefer explicit task location; else inherit from category via context map
  const taskLocationId =
    (task.locationId ?? null) !== null
      ? task.locationId
      : (context.plannerLocationMap?.get(task.id) ?? null);

  // Resolve effective category from parent chain via pre-built map
  const effectiveCategoryId =
    context.plannerCategoryMap?.get(task.id) ?? task.categoryId;

  const constraintForTask =
    effectiveCategoryId && context.categoryConstraints
      ? context.categoryConstraints.get(effectiveCategoryId) || undefined
      : undefined;

  // Find all slots that can fit the base requirement (duration + buffer)
  const fittingSlots = slotManager.findAllFittingSlots(
    task.duration,
    afterTime || context.currentDate,
    undefined,
    constraintForTask
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

  // Filter slots by category time constraints
  const categoryConstraints = context.categoryConstraints;

  const validSlots = categoryConstraints
    ? fittingSlots.filter((slot) =>
        canScheduleAtTime(
          slot.start,
          effectiveCategoryId,
          categoryConstraints,
          task.duration
        )
      )
    : fittingSlots;

  if (validSlots.length === 0) {
    return {
      failure: {
        taskId: task.id,
        taskTitle: task.title,
        reason: SchedulingFailureReason.NO_SLOTS,
        details: `No available time slots found within category time constraints`,
      },
    };
  }

  return { validSlots, fittingSlots, taskLocationId, constraintForTask };
}
