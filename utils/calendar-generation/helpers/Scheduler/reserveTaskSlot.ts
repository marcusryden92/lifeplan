/**
 * Reserve Task Slot
 *
 * Calculates task timing, places standalone travel-before if possible,
 * and reserves the slot with travel handling.
 */

import { Planner } from "@/types/prisma";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { TravelManager } from "../../core/TravelManager";
import {
  SchedulingFailure,
  ReservationResult,
} from "../../models/SchedulingModels";
import { PlaceableSlot } from "../../models/TimeSlot";
import { SchedulingFailureReason } from "../../constants";
import { dateTimeService } from "../../utils/dateTimeService";
import { reserveSlotWithTravel } from "../TimeSlotManager/reserveSlotWithTravel";
import type { TravelShardSpan } from "../../utils/timeSlotUtils";
import type { SchedulerRecorder } from "./SchedulerRecorder";
import { SM } from "./schedulerMessages";

export function reserveTaskSlot(
  task: Planner,
  selectedSlot: PlaceableSlot,
  travelBefore: number,
  travelAfter: number,
  taskLocationId: string | null | undefined,
  reusableTravelStart: Date | null,
  slotManager: TimeSlotManager,
  travelManager: TravelManager,
  absorbPrevTravelAfter: boolean = false,
  absorbedTravelStart: Date | null = null,
  reclaimPrecedingGapTravel: TravelShardSpan | null = null,
  recorder?: SchedulerRecorder | null,
): ReservationResult | { failure: SchedulingFailure } {
  const bufferMinutes = slotManager.bufferTimeMinutes;

  // For a CategorySlot, the task lands in the category interior — the user is
  // at currentLocationId on both sides of the task. (Category entry/exit
  // transitions live at the slot's edges and are handled separately.)
  const slotPrevLoc =
    selectedSlot.type === "category"
      ? selectedSlot.currentLocationId
      : selectedSlot.prevLocationId;
  const slotNextLoc =
    selectedSlot.type === "category"
      ? selectedSlot.currentLocationId
      : selectedSlot.nextLocationId;

  // When reclaiming a preceding gap travel (e.g. Gamla Stan → Home), use the gap
  // travel's real origin as prevLocationId so travel-before is routed correctly.
  const effectivePrevLocationId = reclaimPrecedingGapTravel
    ? (reclaimPrecedingGapTravel.travelFromLocationId ?? slotPrevLoc ?? null)
    : (slotPrevLoc ?? null);

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
    const canPlaceOutside = travelManager.canPlaceStandaloneTravelBefore(
      travelEnd,
      travelBefore,
    );
    offsetToTaskStart = canPlaceOutside
      ? leadingBuffer
      : leadingBuffer + travelBefore + bufferMinutes;
  }

  // When absorbing the previous task's travel-after, or reclaiming a preceding gap travel,
  // start at the reclaimed position instead of the free slot start.
  const effectiveSlotStart = absorbedTravelStart ?? selectedSlot.start;

  const taskStartDate = dateTimeService.addDuration(
    effectiveSlotStart,
    offsetToTaskStart,
  );
  const taskEndDate = dateTimeService.addDuration(taskStartDate, task.duration);

  recorder?.decision(
    SM.reserveTaskSlot.layout(
      recorder.fmtDate(taskStartDate),
      recorder.fmtDate(taskEndDate),
      offsetToTaskStart,
      recorder.fmtDate(effectiveSlotStart),
    ),
    1,
  );

  // Reserve the slot with travel placement.
  // If placing travel-before outside, reserve it separately and omit travel-before inside.
  if (effectiveTravelBefore > 0 && effectivePrevLocationId && taskLocationId) {
    const travelEnd = new Date(selectedSlot.start.getTime());
    const placed = travelManager.reserveStandaloneTravelBefore(
      travelEnd,
      effectiveTravelBefore,
      effectivePrevLocationId,
      taskLocationId,
    );
    if (placed.success) {
      // Travel-before placed outside; do not include it inside reserveSlotWithTravel
      effectiveTravelBefore = 0;
      recorder?.action(
        SM.reserveTaskSlot.standaloneTravelBeforePlaced(
          recorder.locName(effectivePrevLocationId),
          recorder.locName(taskLocationId),
          travelBefore,
        ),
      );
    } else {
      recorder?.decision(
        SM.reserveTaskSlot.standaloneTravelBeforeFailed,
        2,
      );
    }
    // Fallback handled by offsetToTaskStart above (travel placed inside the slot)
  }

  const result = reserveSlotWithTravel(
    slotManager.slots,
    slotManager.bufferTimeMinutes,
    taskStartDate,
    taskEndDate,
    task.id,
    task.plannerType,
    taskLocationId ?? null,
    effectiveTravelBefore,
    travelAfter,
    effectivePrevLocationId,
    slotNextLoc ?? null,
    reusableTravelStart,
    absorbPrevTravelAfter,
    reclaimPrecedingGapTravel,
    recorder,
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
