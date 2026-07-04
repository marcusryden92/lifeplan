/**
 * Select Best Slot
 *
 * Scores valid slots using the strategy, calculates travel requirements,
 * and selects the best slot with enough capacity.
 */

import { Planner } from "@/types/prisma";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { TravelManager } from "../../core/TravelManager";
import { SchedulingStrategy } from "../../strategies/SchedulingStrategy";
import {
  SchedulingContext,
  SchedulingFailure,
  ScoredSlot,
  SlotSelectionResult,
} from "../../models/SchedulingModels";
import { PlaceableSlot } from "../../models/TimeSlot";
import { SchedulingFailureReason } from "../../constants";
import type { TravelShardSpan } from "../../utils/timeSlotUtils";
import { SM } from "./schedulerMessages";

/**
 * Score time slots for a task using the strategy
 */
function scoreSlots(
  task: Planner,
  slots: PlaceableSlot[],
  strategy: SchedulingStrategy,
  context: SchedulingContext,
): ScoredSlot[] {
  const scored: ScoredSlot[] = slots.map((slot) => {
    const score = strategy.score(task, slot, context);

    return {
      slot: {
        start: slot.start,
        end: slot.end,
        durationMinutes: slot.durationMinutes,
      },
      source: slot,
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
  validSlots: PlaceableSlot[],
  taskLocationId: string | null | undefined,
  slotManager: TimeSlotManager,
  travelManager: TravelManager,
  strategy: SchedulingStrategy,
  context: SchedulingContext,
): SlotSelectionResult | { failure: SchedulingFailure } {
  const recorder = context.schedulerRecorder;

  // Score ALL slots using the strategy (includes location adjacency scoring)
  const scoredSlots = scoreSlots(task, validSlots, strategy, context);

  recorder?.decision(SM.selectBestSlot.header(scoredSlots.length), 1);

  // Iterate through scored slots and find first one with enough capacity
  const bufferMinutes = slotManager.bufferTimeMinutes;

  let selectedSlot: PlaceableSlot | null = null;
  let travelBefore = 0;
  let travelAfter = 0;
  let selectedReusableTravelStart: Date | null = null;
  let selectedAbsorbableTravel: TravelShardSpan | null = null;
  let selectedReclaimPrecedingGapTravel: TravelShardSpan | null = null;

  let candidateIdx = 0;
  for (const scoredSlot of scoredSlots) {
    candidateIdx += 1;
    const slot = scoredSlot.source;

    recorder?.noteSlotInRange(slot);
    recorder?.decision(
      SM.selectBestSlot.candidateHeader(
        candidateIdx,
        recorder.label(slot),
        scoredSlot.score,
      ),
      2,
    );

    // Calculate travel times based on location
    // Null-location tasks ("everywhere") don't need travel - they're transparent
    let needTravelBefore = 0;
    let needTravelAfter = 0;

    let canAbsorbPrevTravel = false;
    let absorbableTravel: TravelShardSpan | null = null;
    let reclaimPrecedingGapTravel: TravelShardSpan | null = null;

    // For a CategorySlot, the task lands inside the category interior, so
    // the user's effective location on both sides of the task is the
    // category's currentLocationId. Entry/exit of the category itself is
    // handled separately at the slot's edges.
    const slotPrevLoc =
      slot.type === "category" ? slot.currentLocationId : slot.prevLocationId;
    const slotNextLoc =
      slot.type === "category" ? slot.currentLocationId : slot.nextLocationId;

    if (recorder) {
      recorder.decision(
        SM.selectBestSlot.locationsSnapshot(
          recorder.locName(slotPrevLoc),
          recorder.locName(slotNextLoc),
          recorder.locName(taskLocationId),
        ),
        3,
      );
    }

    if (taskLocationId) {
      // Travel BEFORE: needed if prev location differs from task location
      if (slotPrevLoc && slotPrevLoc !== taskLocationId) {
        // Check if the prev location is actually a travel destination from a previous
        // task at OUR location. e.g., B4 (Uppsala) placed travel-after Uppsala->GamlaStan,
        // so the free slot has prevLocationId=GamlaStan. If B5 is also Uppsala, we can
        // absorb B4's travel-after instead of creating new travel-before.
        absorbableTravel = travelManager.findAdjacentTravelFrom(
          slot.start,
          taskLocationId,
        );
        if (absorbableTravel) {
          canAbsorbPrevTravel = true;
          needTravelBefore = 0;
          if (recorder) {
            const dur = Math.floor(
              (absorbableTravel.travelEnd.getTime() -
                absorbableTravel.travelStart.getTime()) /
                60000,
            );
            recorder.decision(
              SM.selectBestSlot.absorbPrevTravelAfter(
                recorder.locName(absorbableTravel.travelFromLocationId),
                recorder.fmtDate(absorbableTravel.travelStart),
                recorder.fmtDate(absorbableTravel.travelEnd),
                dur,
              ),
              3,
            );
          }
        } else {
          // Check if there is a pre-carved gap travel (e.g. a return trip Gamla Stan → Home)
          // immediately before this slot. If so, we can bypass the intermediate stop and
          // travel direct from the real origin (Gamla Stan) to the task location.
          const precedingGapTravel = travelManager.findPrecedingGapTravel(slot.start);
          if (
            precedingGapTravel?.travelFromLocationId &&
            precedingGapTravel.travelFromLocationId !== taskLocationId
          ) {
            const directTravel = travelManager.getTravelTime(
              precedingGapTravel.travelFromLocationId,
              taskLocationId,
              precedingGapTravel.travelStart,
            );
            if (directTravel > 0) {
              needTravelBefore = directTravel;
              reclaimPrecedingGapTravel = precedingGapTravel;
              if (recorder) {
                const dur = Math.floor(
                  (precedingGapTravel.travelEnd.getTime() -
                    precedingGapTravel.travelStart.getTime()) /
                    60000,
                );
                recorder.decision(
                  SM.selectBestSlot.reclaimPrecedingGapTravel(
                    recorder.locName(precedingGapTravel.travelFromLocationId),
                    directTravel,
                    recorder.fmtDate(precedingGapTravel.travelStart),
                    recorder.fmtDate(precedingGapTravel.travelEnd),
                    dur,
                  ),
                  3,
                );
              }
            }
          }

          if (!reclaimPrecedingGapTravel) {
            needTravelBefore = travelManager.getTravelTime(
              slotPrevLoc,
              taskLocationId,
              slot.start,
            );
            recorder?.decision(
              SM.selectBestSlot.travelBeforeRequired(
                recorder.locName(slotPrevLoc),
                recorder.locName(taskLocationId),
                needTravelBefore,
              ),
              3,
            );
          }
        }
      } else if (taskLocationId) {
        recorder?.decision(SM.selectBestSlot.travelBeforeNotNeeded, 3);
      }

      // Travel AFTER: needed if next location differs from task location.
      // Look up at the departure time (after travel-before + the task), not
      // slot.start — a long task can cross into a different rush-hour bucket,
      // and the reservation path prices the leg at its actual position.
      if (slotNextLoc && slotNextLoc !== taskLocationId) {
        const travelAfterDeparture = new Date(
          slot.start.getTime() +
            (needTravelBefore + task.duration) * 60 * 1000,
        );
        needTravelAfter = travelManager.getTravelTime(
          taskLocationId,
          slotNextLoc,
          travelAfterDeparture,
        );
        recorder?.decision(
          SM.selectBestSlot.travelAfterRequired(
            recorder.locName(taskLocationId),
            recorder.locName(slotNextLoc),
            needTravelAfter,
          ),
          3,
        );
      } else if (taskLocationId && slotNextLoc) {
        recorder?.decision(SM.selectBestSlot.travelAfterNotNeeded, 3);
      }
    }

    // Calculate required inside-slot time.
    // Layout: [leading buffer] [travel-before] [task] [travel-after] [trailing buffer]
    // Travel is flush with its owning task. A buffer separates the unit
    // from both slot boundaries; between two consecutive placements in the
    // same slot only the second unit's leading buffer applies, so the gap
    // is exactly one bufferMs.

    // Check if existing travel to the destination can be reused
    let effectiveTravelAfter = needTravelAfter;
    let reusableTravelStart: Date | null = null;

    if (needTravelAfter > 0 && slotNextLoc) {
      const reusableTravelSpan = travelManager.findAdjacentTravelTo(
        slot.end,
        slotNextLoc,
      );
      if (reusableTravelSpan) {
        // Use the SPAN's start, not the single shard's — the freed-up
        // region's downstream computation needs the logical travel's
        // true start.
        reusableTravelStart = reusableTravelSpan.travelStart;
        effectiveTravelAfter = 0;
        recorder?.decision(
          SM.selectBestSlot.travelAfterReusable(
            recorder.fmtDate(reusableTravelSpan.travelStart),
            needTravelAfter,
          ),
          3,
        );
      }
    }

    let canPlaceTravelOutside = false;
    // Baseline: task + travel-after + trailing buffer. Leading buffer is
    // added below unless travel-before is placed standalone (in which case
    // the standalone travel's end provides the leading boundary, so no
    // extra buffer at this slot's level).
    let requiredInside =
      task.duration +
      (effectiveTravelAfter > 0 ? effectiveTravelAfter : 0) +
      bufferMinutes;

    if (needTravelBefore > 0 && slotPrevLoc && taskLocationId) {
      const travelEnd = new Date(slot.start.getTime());
      canPlaceTravelOutside = travelManager.canPlaceStandaloneTravelBefore(
        travelEnd,
        needTravelBefore,
      );
      if (!canPlaceTravelOutside) {
        // Travel inside the slot, flush with task: buffer goes BEFORE travel.
        requiredInside += bufferMinutes + needTravelBefore;
        recorder?.decision(
          SM.selectBestSlot.travelBeforeInsideRequired(needTravelBefore),
          3,
        );
      } else {
        recorder?.decision(
          SM.selectBestSlot.travelBeforeOutsideOK(needTravelBefore),
          3,
        );
      }
    } else {
      // No travel-before: task is the leading thing; apply leading buffer.
      requiredInside += bufferMinutes;
    }

    // When absorbing a previous task's travel-after, or reclaiming a preceding gap travel,
    // the reclaimed travel space adds to the effective slot capacity. Use the
    // full multi-shard span duration (travelEnd - travelStart) so we count
    // every shard, not just the matched one.
    let effectiveCapacity = slot.durationMinutes;
    if (canAbsorbPrevTravel && absorbableTravel) {
      const spanDur = Math.floor(
        (absorbableTravel.travelEnd.getTime() -
          absorbableTravel.travelStart.getTime()) /
          60000,
      );
      effectiveCapacity += spanDur;
    } else if (reclaimPrecedingGapTravel) {
      // Expand capacity backward to include the gap travel window.
      const spanDur = Math.floor(
        (reclaimPrecedingGapTravel.travelEnd.getTime() -
          reclaimPrecedingGapTravel.travelStart.getTime()) /
          60000,
      );
      effectiveCapacity += spanDur;
    }

    // Check if this slot has enough capacity
    if (effectiveCapacity >= requiredInside) {
      recorder?.decision(
        SM.selectBestSlot.capacityOK(effectiveCapacity, requiredInside),
        3,
      );
      selectedSlot = slot;
      travelBefore = needTravelBefore;
      travelAfter = effectiveTravelAfter;
      selectedReusableTravelStart = reusableTravelStart;
      selectedAbsorbableTravel = canAbsorbPrevTravel ? absorbableTravel : null;
      selectedReclaimPrecedingGapTravel = reclaimPrecedingGapTravel;
      break;
    }
    recorder?.decision(
      SM.selectBestSlot.capacityInsufficient(effectiveCapacity, requiredInside),
      3,
    );
  }

  if (!selectedSlot) {
    recorder?.decision(SM.selectBestSlot.noSlotSelected, 1);
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
    absorbableTravel: selectedAbsorbableTravel,
    reclaimPrecedingGapTravel: selectedReclaimPrecedingGapTravel,
  };
}
