import type { CategoryConstraint } from "@/types/categoryTypes";
import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { TravelManager } from "../../core/TravelManager";
import { expandSlotForDay } from "../TimeSlotManager/expandSlotForDay";
import { v4 as uuidv4 } from "uuid";

function getContainingPeriodEnd(
  slot: AvailableSlot,
  constraints: CategoryConstraint[],
): Date | undefined {
  if (!slot.categoryId) return undefined;
  const constraint = constraints.find((c) => c.id === slot.categoryId);
  if (!constraint) return undefined;

  const dayStart = new Date(slot.start);
  dayStart.setHours(0, 0, 0, 0);
  const slotStartMs = slot.start.getTime();
  const slotEndMs = slot.end.getTime();

  for (const catSlot of constraint.timeSlots) {
    const period = expandSlotForDay(catSlot, dayStart);
    if (!period) continue;

    if (period.start.getTime() <= slotStartMs && period.end.getTime() >= slotEndMs)
      return period.end;
  }

  return undefined;
}

// Handles the case where two consecutive slots — a plain slot followed by a
// category slot — don't have enough combined space to fit both the inbound
// travel (prev→category) and the outbound travel (category→next) separately.
// Instead of carving two travel events, it collapses them into a single direct
// travel (prev→next), bypassing the category location entirely.
//
// Only fires when:
//  - The current slot is not a category slot itself
//  - The next slot IS a category slot that sits inside a larger category period
//    (i.e. it isn't the last slot in the period, so the outgoing travel hasn't
//    already been handled at the period boundary)
//  - The two slots are contiguous
//  - Either the category slot is too small to fit its own outgoing travel, or
//    the combined space is too tight for both transitions
export function attemptDirectBypass(
  constraints: CategoryConstraint[],
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  slot: AvailableSlot,
  nextSlot: AvailableSlot | null,
  slots: AvailableSlot[],
  slotIndex: number,
  prevLocation: string,
  nextLocation: string,
  travelMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): { handled: boolean; skipNext?: boolean } {
  const catPeriodEnd = nextSlot?.categoryId
    ? getContainingPeriodEnd(nextSlot, constraints)
    : undefined;

  // Only act if the next slot is in the middle of a category period — if it's
  // the last slot in the period, outgoing travel is handled by normal carving.
  const nextLocIsInsideCatB =
    catPeriodEnd !== undefined &&
    nextSlot!.end.getTime() < catPeriodEnd.getTime();

  if (
    !nextLocIsInsideCatB ||
    !nextSlot?.categoryId ||
    nextSlot.start.getTime() !== slot.end.getTime() ||
    !nextSlot.nextLocationId ||
    nextSlot.nextLocationId === nextLocation
  ) {
    return { handled: false };
  }

  const bLocation = nextSlot.nextLocationId;
  const travelCatToB = travelManager.getTravelTime(
    nextLocation,
    bLocation,
    nextSlot.end,
  );
  if (travelCatToB <= 0) return { handled: false };

  const catSlotTooSmall = travelCatToB > nextSlot.durationMinutes;
  const availableMinutes = slot.durationMinutes + nextSlot.durationMinutes;
  const combinedTooSmall =
    travelMinutes + bufferTimeMinutes + travelCatToB > availableMinutes;

  if (!catSlotTooSmall && !combinedTooSmall) return { handled: false };

  const spanEnd = nextSlot.end;

  if (catSlotTooSmall) {
    // The category slot can't even fit its own outgoing travel — place the
    // direct prev→next travel at the end of the combined span, leaving any
    // remaining time before it as usable space in the first slot.
    const directMinutes = travelManager.getTravelTime(
      prevLocation,
      bLocation,
      spanEnd,
    );
    const travelStart = new Date(spanEnd.getTime() - directMinutes * 60000);
    if (travelStart.getTime() >= slot.start.getTime()) {
      occupiedSlots.push(
        createTravelSlot(
          travelStart,
          spanEnd,
          prevLocation,
          bLocation,
          "preliminary",
          uuidv4(),
          {
            categoryId: slot.categoryId,
            isStrictCategory: slot.isStrictCategory,
          },
        ),
      );
      const availEnd = new Date(travelStart.getTime());
      if (availEnd.getTime() > slot.start.getTime()) {
        result.push({
          start: slot.start,
          end: availEnd,
          durationMinutes: Math.floor(
            (availEnd.getTime() - slot.start.getTime()) / 60000,
          ),
          isAvailable: true,
          prevLocationId: slot.prevLocationId,
          nextLocationId: bLocation,
          categoryId: slot.categoryId,
          isStrictCategory: slot.isStrictCategory,
        });
      }
    } else {
      occupiedSlots.push(
        createTravelSlot(
          slot.start,
          spanEnd,
          prevLocation,
          bLocation,
          "preliminary",
          uuidv4(),
          {
            insufficientTravel: true,
            requiredTravelMinutes: directMinutes,
            categoryId: slot.categoryId,
            isStrictCategory: slot.isStrictCategory,
          },
        ),
      );
    }
    return { handled: true, skipNext: true };
  } else {
    // Both slots together have enough space, but not enough to do two separate
    // transitions cleanly. Place the direct prev→next travel at the start of
    // the current slot and trim the category slot to start after it.
    const directMinutes = travelManager.getTravelTime(
      prevLocation,
      bLocation,
      slot.start,
    );
    const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);
    if (travelEnd.getTime() <= spanEnd.getTime()) {
      occupiedSlots.push(
        createTravelSlot(
          slot.start,
          travelEnd,
          prevLocation,
          bLocation,
          "preliminary",
          uuidv4(),
          {
            categoryId: slot.categoryId,
            isStrictCategory: slot.isStrictCategory,
          },
        ),
      );
      const newCatStart = new Date(travelEnd.getTime());
      if (newCatStart.getTime() < spanEnd.getTime()) {
        // The remaining category slot is trimmed. Its prevLocationId stays as
        // the category location (nextLocation) — tasks placed here are still
        // at the category location even though we bypassed the inbound travel.
        slots[slotIndex + 1] = {
          ...nextSlot,
          start: newCatStart,
          durationMinutes: Math.floor(
            (spanEnd.getTime() - newCatStart.getTime()) / 60000,
          ),
          prevLocationId: nextLocation,
        };
        return { handled: true, skipNext: false };
      }
    } else {
      occupiedSlots.push(
        createTravelSlot(
          slot.start,
          spanEnd,
          prevLocation,
          bLocation,
          "preliminary",
          uuidv4(),
          {
            insufficientTravel: true,
            requiredTravelMinutes: directMinutes,
            categoryId: slot.categoryId,
            isStrictCategory: slot.isStrictCategory,
          },
        ),
      );
    }
    return { handled: true, skipNext: true };
  }
}
