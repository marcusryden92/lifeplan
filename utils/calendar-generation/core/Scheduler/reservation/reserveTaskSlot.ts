/**
 * Reserve Task Slot
 *
 * Calculates task timing, places standalone travel-before if possible,
 * and reserves the slot with travel handling.
 */

import { Planner } from "@/types/prisma";
import { TimeSlotManager } from "../../TimeSlotManager";
import { SchedulingFailure } from "../../../models/SchedulingModels";
import { TimeSlot } from "../../../models/TimeSlot";
import { SchedulingFailureReason } from "../../../constants";
import { dateTimeService } from "../../../utils/dateTimeService";

export interface ReservationResult {
  taskStartDate: Date;
  taskEndDate: Date;
}

export function reserveTaskSlot(
  task: Planner,
  selectedSlot: TimeSlot,
  travelBefore: number,
  travelAfter: number,
  taskLocationId: string | null | undefined,
  reusableTravelStart: Date | null,
  slotManager: TimeSlotManager,
  absorbPrevTravelAfter: boolean = false,
  absorbedTravelStart: Date | null = null,
): ReservationResult | { failure: SchedulingFailure } {
  const bufferMinutes = slotManager.getBufferTimeMinutes();

  // Calculate task times
  // Layout: [travelBefore] [buffer] [task] [buffer] [travel-after] [buffer] [FREE]

  // Calculate offset to task start from slot start
  // If travel-before is placed outside, task starts at slot.start.
  // Otherwise, task starts after [travel-before + buffer] inside the slot.
  let offsetToTaskStart = 0;
  let effectiveTravelBefore = travelBefore;

  if (travelBefore > 0) {
    const travelEnd = new Date(
      selectedSlot.start.getTime() - bufferMinutes * 60000
    );
    const canPlaceOutside = slotManager.canPlaceStandaloneTravelBefore(
      travelEnd,
      travelBefore
    );
    offsetToTaskStart = canPlaceOutside ? 0 : travelBefore + bufferMinutes;
  }

  // When absorbing the previous task's travel-after, start at the absorbed travel's
  // position instead of the free slot start (which is after the travel + buffer)
  const effectiveSlotStart = absorbedTravelStart ?? selectedSlot.start;

  const taskStartDate = dateTimeService.addDuration(
    effectiveSlotStart,
    offsetToTaskStart
  );
  const taskEndDate = dateTimeService.addDuration(
    taskStartDate,
    task.duration
  );

  // Reserve the slot with travel placement
  // Travel-before is placed at the START of the slot
  // Travel-after is placed at the END of the slot
  // If placing travel-before outside, reserve it separately and omit travel-before inside
  if (effectiveTravelBefore > 0 && selectedSlot.prevLocationId && taskLocationId) {
    const travelEnd = new Date(
      selectedSlot.start.getTime() - bufferMinutes * 60000
    );
    const placed = slotManager.reserveStandaloneTravelBefore(
      travelEnd,
      effectiveTravelBefore,
      selectedSlot.prevLocationId,
      taskLocationId,
      task.id
    );
    if (placed.success) {
      // Travel-before placed outside; do not include it inside reserveSlotWithTravel
      effectiveTravelBefore = 0;
    }
    // Fallback handled by offsetToTaskStart above (travel placed inside the slot)
  }

  const result = slotManager.reserveSlotWithTravel(
    taskStartDate,
    taskEndDate,
    task.id,
    task.itemType as "task" | "goal" | "plan" | "template",
    taskLocationId ?? null,
    effectiveTravelBefore,
    travelAfter,
    selectedSlot.prevLocationId ?? null,
    selectedSlot.nextLocationId ?? null,
    reusableTravelStart,
    absorbPrevTravelAfter,
  );

  if (!result.success) {
    return {
      failure: {
        taskId: task.id,
        taskTitle: task.title,
        reason: SchedulingFailureReason.NO_SLOTS,
        details: "Failed to reserve slot (may have been taken)",
      },
    };
  }

  return { taskStartDate, taskEndDate };
}
