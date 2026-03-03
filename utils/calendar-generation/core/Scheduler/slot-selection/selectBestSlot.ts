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
  absorbPrevTravelAfter: boolean;
  absorbedTravelStart: Date | null;
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
  let selectedAbsorbPrevTravel = false;
  let selectedAbsorbedTravelStart: Date | null = null;

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

    let canAbsorbPrevTravel = false;
    let absorbableTravel: ReturnType<typeof slotManager.findAdjacentTravelFrom> = null;

    if (taskLocationId) {
      // Travel BEFORE: needed if prev location differs from task location
      if (slot.prevLocationId && slot.prevLocationId !== taskLocationId) {
        // Check if the prev location is actually a travel destination from a previous
        // task at OUR location. e.g., B4 (Uppsala) placed travel-after Uppsala->GamlaStan,
        // so the free slot has prevLocationId=GamlaStan. If B5 is also Uppsala, we can
        // absorb B4's travel-after instead of creating new travel-before.
        absorbableTravel = slotManager.findAdjacentTravelFrom(
          slot.start,
          taskLocationId
        );
        if (absorbableTravel) {
          canAbsorbPrevTravel = true;
          needTravelBefore = 0;
        } else {
          needTravelBefore = slotManager.getTravelTime(
            slot.prevLocationId,
            taskLocationId,
            slot.start
          );
        }
      }

      // Travel AFTER: needed if next location differs from task location
      if (slot.nextLocationId && slot.nextLocationId !== taskLocationId) {
        needTravelAfter = slotManager.getTravelTime(
          taskLocationId,
          slot.nextLocationId,
          slot.start
        );
      }
    }

    // Calculate required inside-slot time:
    // Layout: [task] [buffer] [travel-after] [buffer]
    // If travel-before can be placed outside, it is excluded from inside-slot requirement.

    // Check if existing travel to the destination can be reused
    let effectiveTravelAfter = needTravelAfter;
    let reusableTravelStart: Date | null = null;

    if (needTravelAfter > 0 && slot.nextLocationId) {
      reusableTravelStart = slotManager.findAdjacentTravelTo(
        slot.end,
        slot.nextLocationId
      );
      if (reusableTravelStart) {
        effectiveTravelAfter = 0;
      }
    }

    let canPlaceTravelOutside = false;
    let requiredInside = task.duration + bufferMinutes
      + (effectiveTravelAfter > 0 ? effectiveTravelAfter + bufferMinutes : 0);

    if (needTravelBefore > 0 && slot.prevLocationId && taskLocationId) {
      const travelEnd = new Date(
        slot.start.getTime() - bufferMinutes * 60000
      );
      canPlaceTravelOutside = slotManager.canPlaceStandaloneTravelBefore(
        travelEnd,
        needTravelBefore
      );
      if (!canPlaceTravelOutside) {
        requiredInside += needTravelBefore + bufferMinutes;
      }
    }

    // When absorbing a previous task's travel-after, the reclaimed travel space
    // adds to the effective slot capacity (travel duration + buffer before it)
    let effectiveCapacity = slot.durationMinutes;
    let absorbedStart: Date | null = null;
    if (canAbsorbPrevTravel && absorbableTravel) {
      effectiveCapacity += absorbableTravel.durationMinutes + bufferMinutes;
      absorbedStart = new Date(absorbableTravel.start.getTime());
    }

    // Check if this slot has enough capacity
    if (effectiveCapacity >= requiredInside) {
      selectedSlot = slot;
      travelBefore = needTravelBefore;
      travelAfter = effectiveTravelAfter;
      selectedReusableTravelStart = reusableTravelStart;
      selectedAbsorbPrevTravel = canAbsorbPrevTravel;
      selectedAbsorbedTravelStart = absorbedStart;
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
    absorbPrevTravelAfter: selectedAbsorbPrevTravel,
    absorbedTravelStart: selectedAbsorbedTravelStart,
  };
}
