/**
 * Reserve Task Slot
 *
 * Calculates task timing, places standalone travel-before if possible,
 * and reserves the slot with travel handling.
 */

import { Planner } from "@/types/prisma";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { SchedulingFailure, ReservationResult } from "../../models/SchedulingModels";
import { TimeSlot } from "../../models/TimeSlot";
import { SchedulingFailureReason } from "../../constants";
import { dateTimeService } from "../../utils/dateTimeService";

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
  reclaimPrecedingGapTravel: TimeSlot | null = null,
): ReservationResult | { failure: SchedulingFailure } {
  const bufferMinutes = slotManager.getBufferTimeMinutes();

  // When reclaiming a preceding gap travel (e.g. Gamla Stan → Home), use the gap
  // travel's real origin as prevLocationId so travel-before is routed correctly.
  const effectivePrevLocationId = reclaimPrecedingGapTravel
    ? reclaimPrecedingGapTravel.travelFromLocationId ?? selectedSlot.prevLocationId
    : selectedSlot.prevLocationId;

  // Calculate task times.
  // Layout: [leading buffer] [travelBefore] [buffer] [task] [buffer] [travel-after] [buffer] [FREE]
  // slot.start = eventEnd (no pre-baked buffer). The leading buffer is added here so
  // the task starts at eventEnd + bufferMinutes (or eventEnd + buffer + travel + buffer).
  // Absorb cases (absorbPrevTravelAfter) already have a buffer baked into absorbedTravelStart.

  // Leading buffer: skipped only when absorbing a previous task's travel-after,
  // because absorbedTravelStart is already positioned past that buffer.
  const leadingBuffer = absorbPrevTravelAfter ? 0 : bufferMinutes;

  let offsetToTaskStart = leadingBuffer;
  let effectiveTravelBefore = travelBefore;

  if (travelBefore > 0) {
    // travelEnd = slot.start = eventEnd (standalone travel ends here, task starts after buffer)
    const travelEnd = new Date(selectedSlot.start.getTime());
    const canPlaceOutside = slotManager.canPlaceStandaloneTravelBefore(
      travelEnd,
      travelBefore
    );
    offsetToTaskStart = canPlaceOutside ? leadingBuffer : leadingBuffer + travelBefore + bufferMinutes;
  }

  // When absorbing the previous task's travel-after, or reclaiming a preceding gap travel,
  // start at the reclaimed position instead of the free slot start.
  const effectiveSlotStart = absorbedTravelStart ?? selectedSlot.start;

  const taskStartDate = dateTimeService.addDuration(
    effectiveSlotStart,
    offsetToTaskStart
  );
  const taskEndDate = dateTimeService.addDuration(
    taskStartDate,
    task.duration
  );

  // Reserve the slot with travel placement.
  // If placing travel-before outside, reserve it separately and omit travel-before inside.
  if (effectiveTravelBefore > 0 && effectivePrevLocationId && taskLocationId) {
    const travelEnd = new Date(selectedSlot.start.getTime());
    const placed = slotManager.reserveStandaloneTravelBefore(
      travelEnd,
      effectiveTravelBefore,
      effectivePrevLocationId,
      taskLocationId,
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
    effectivePrevLocationId ?? null,
    selectedSlot.nextLocationId ?? null,
    reusableTravelStart,
    absorbPrevTravelAfter,
    reclaimPrecedingGapTravel,
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
