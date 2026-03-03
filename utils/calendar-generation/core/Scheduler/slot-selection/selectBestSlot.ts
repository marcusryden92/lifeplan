/**
 * Select Best Slot
 *
 * Scores valid slots using the strategy, calculates travel requirements,
 * and selects the best slot with enough capacity.
 */

import { Planner } from "@/types/prisma";
import { TimeSlotManager } from "../../TimeSlotManager";
import { SchedulingStrategy } from "../../../strategies/SchedulingStrategy";
import {
  SchedulingContext,
  SchedulingFailure,
  ScoredSlot,
} from "../../../models/SchedulingModels";
import { TimeSlot } from "../../../models/TimeSlot";
import { SchedulingFailureReason } from "../../../constants";

export interface SlotSelectionResult {
  selectedSlot: TimeSlot;
  travelBefore: number;
  travelAfter: number;
  reusableTravelStart: Date | null;
  taskLocationId: string | null | undefined;
}

/**
 * Score time slots for a task using the strategy
 */
function scoreSlots(
  task: Planner,
  slots: TimeSlot[],
  strategy: SchedulingStrategy,
  context: SchedulingContext
): ScoredSlot[] {
  const scored: ScoredSlot[] = slots.map((slot) => {
    const score = strategy.score(task, slot, context);

    return {
      slot: {
        start: slot.start,
        end: slot.end,
        durationMinutes: slot.durationMinutes,
      },
      score,
      strategyScores: { [strategy.name]: score },
    };
  });

  // Sort by score (highest first), then by start time (earliest first) as tiebreaker
  return scored.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    return a.slot.start.getTime() - b.slot.start.getTime();
  });
}

export function selectBestSlot(
  task: Planner,
  validSlots: TimeSlot[],
  fittingSlots: TimeSlot[],
  taskLocationId: string | null | undefined,
  slotManager: TimeSlotManager,
  strategy: SchedulingStrategy,
  context: SchedulingContext
): SlotSelectionResult | { failure: SchedulingFailure } {
  // Score ALL slots using the strategy (includes location adjacency scoring)
  const scoredSlots = scoreSlots(task, validSlots, strategy, context);

  // Iterate through scored slots and find first one with enough capacity
  const bufferMinutes = slotManager.getBufferTimeMinutes();

  let selectedSlot: TimeSlot | null = null;
  let travelBefore = 0;
  let travelAfter = 0;
  let selectedReusableTravelStart: Date | null = null;

  for (const scoredSlot of scoredSlots) {
    // Find the original slot with location info
    const slot = fittingSlots.find(
      (s) => s.start.getTime() === scoredSlot.slot.start.getTime()
    );
    if (!slot) continue;

    // Calculate travel times based on location
    // Null-location tasks ("everywhere") don't need travel - they're transparent
    let needTravelBefore = 0;
    let needTravelAfter = 0;

    if (taskLocationId) {
      // Travel BEFORE: needed if prev location differs from task location
      if (slot.prevLocationId && slot.prevLocationId !== taskLocationId) {
        needTravelBefore = slotManager.getTravelTime(
          slot.prevLocationId,
          taskLocationId,
          slot.start
        );
        // DEBUG: Log travel-before triggers during scheduling
        console.log("SELECT SLOT TRAVEL BEFORE:", {
          task: task.title,
          taskLoc: taskLocationId,
          slotPrevLoc: slot.prevLocationId,
          slotStart: slot.start.toISOString(),
          slotEnd: slot.end.toISOString(),
          travelBefore: needTravelBefore,
        });
      }

      // Travel AFTER: needed if next location differs from task location
      // This travel will be placed at the END of the slot and shifts forward
      // as more tasks are added
      if (slot.nextLocationId && slot.nextLocationId !== taskLocationId) {
        needTravelAfter = slotManager.getTravelTime(
          taskLocationId,
          slot.nextLocationId,
          slot.start
        );
        // DEBUG: Log travel-after triggers during scheduling
        console.log("SELECT SLOT TRAVEL AFTER:", {
          task: task.title,
          taskLoc: taskLocationId,
          slotNextLoc: slot.nextLocationId,
          slotStart: slot.start.toISOString(),
          slotEnd: slot.end.toISOString(),
          travelAfter: needTravelAfter,
        });
      }
    }
    // Note: If taskLocationId is null, prevLocationId passes through unchanged
    // (null tasks are "transparent" for travel purposes)

    // Calculate required inside-slot time:
    // Layout: [task] [buffer] [FREE] [travelAfter]
    // If travel-before can be placed outside, it is excluded from inside-slot requirement.

    // Check if existing travel to the destination can be reused
    // Travel-after doesn't require NEW space if it replaces existing travel at the slot end
    let effectiveTravelAfter = needTravelAfter;
    let reusableTravelStart: Date | null = null;

    if (needTravelAfter > 0 && slot.nextLocationId) {
      // Check if there's already a travel slot going to nextLocationId near the end of this slot
      // If so, we can reuse it and don't need to reserve additional space
      reusableTravelStart = slotManager.findAdjacentTravelTo(
        slot.end,
        slot.nextLocationId
      );
      if (reusableTravelStart) {
        effectiveTravelAfter = 0;
      }
    }

    // If we can place travel-before outside the slot (ending buffer before slot.start),
    // reduce the inside-slot requirement accordingly.
    let canPlaceTravelOutside = false;
    let requiredInside = task.duration + effectiveTravelAfter + bufferMinutes; // buffer after task

    if (needTravelBefore > 0 && slot.prevLocationId && taskLocationId) {
      const travelEnd = new Date(
        slot.start.getTime() - bufferMinutes * 60000
      );
      canPlaceTravelOutside = slotManager.canPlaceStandaloneTravelBefore(
        travelEnd,
        needTravelBefore
      );
      if (!canPlaceTravelOutside) {
        // Fallback: include travel-before and its buffer inside the slot
        requiredInside += needTravelBefore + bufferMinutes;
      }
    }

    // Check if this slot has enough capacity
    if (slot.durationMinutes >= requiredInside) {
      selectedSlot = slot;
      travelBefore = needTravelBefore;
      // Use effectiveTravelAfter - if we're reusing existing travel, don't create new travel
      travelAfter = effectiveTravelAfter;
      selectedReusableTravelStart = reusableTravelStart;
      break;
    }
  }

  if (!selectedSlot) {
    return {
      failure: {
        taskId: task.id,
        taskTitle: task.title,
        reason: SchedulingFailureReason.NO_SLOTS,
        details: "No slots found with enough capacity for task + travel",
      },
    };
  }

  return {
    selectedSlot,
    travelBefore,
    travelAfter,
    reusableTravelStart: selectedReusableTravelStart,
    taskLocationId,
  };
}
