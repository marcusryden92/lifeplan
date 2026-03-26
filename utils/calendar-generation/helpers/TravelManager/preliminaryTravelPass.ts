import { CategoryPeriod } from "@/types/categoryTypes";
import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { attemptDirectBypass } from "./attemptDirectBypass";
import { attemptReturnAbsorption } from "./attemptReturnAbsorption";
import { carveAtStart } from "./carveAtStart";
import { carveAtEnd } from "./carveAtEnd";

// Iterates all available slots in the timeline and carves travel events into
// the boundaries between slots at different locations.
//
// Travel placement — start vs end:
//   Outbound trips (first time travelling from A to B) get carved at the END
//   of the departing slot, so available time before the departure is preserved.
//
//   Return trips (travelling back to a location already departed from) get
//   carved at the START of the arriving slot, creating the inbound/outbound
//   sandwich: [A→B travel][B time][B→A travel].
//
// Return detection uses an open-legs list. Each outbound travel registers an
// open leg. When a mirror is found (B→A matches an open A→B), the leg is
// consumed so it can't be matched again. This ensures that after a completed
// round trip A→B→A, a new A→B is treated as a fresh outbound, not a return.
export function preliminaryTravelPass(
  hasPlannerLocationMap: boolean,
  categoryPeriods: CategoryPeriod[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  slots: AvailableSlot[],
): AvailableSlot[] {
  if (!hasPlannerLocationMap) return slots;

  const result: AvailableSlot[] = [];

  // Tracks outbound legs that haven't been matched by a return yet.
  const openLegs: { from: string; to: string }[] = [];

  const hasMirror = (from: string, to: string): boolean =>
    openLegs.findLastIndex((t) => t.from === to && t.to === from) !== -1;

  // For outbound trips, registers a new open leg.
  // For return trips, consumes the matching open leg so it can't fire again.
  const recordTravel = (from: string, to: string, isReturn: boolean) => {
    if (isReturn) {
      const idx = openLegs.findLastIndex((t) => t.from === to && t.to === from);
      if (idx !== -1) openLegs.splice(idx, 1);
    } else {
      openLegs.push({ from, to });
    }
  };

  let skipNextSlot = false;
  for (let i = 0; i < slots.length; i++) {
    if (skipNextSlot) {
      skipNextSlot = false;
      continue;
    }

    const slot = slots[i];
    if (slot.durationMinutes <= 0) {
      continue;
    }

    const prevLocation = slot.prevLocationId;
    const nextLocation = slot.nextLocationId;
    if (!prevLocation || !nextLocation || prevLocation === nextLocation) {
      result.push(slot);
      continue;
    }

    const placeAtStart = hasMirror(prevLocation, nextLocation);
    const travelMinutes = travelManager.getTravelTime(
      prevLocation,
      nextLocation,
      placeAtStart ? slot.start : slot.end,
    );
    if (travelMinutes <= 0) {
      result.push(slot);
      continue;
    }

    const nextSlot = i + 1 < slots.length ? slots[i + 1] : null;

    // When the current slot is a plain outbound (not a return, not inside a
    // category), check whether the adjacent category slot ahead is too cramped
    // to fit both transitions separately. If so, collapse to a direct bypass.
    if (!placeAtStart && !slot.categoryId) {
      const bypass = attemptDirectBypass(
        categoryPeriods,
        travelManager,
        bufferTimeMinutes,
        slot,
        nextSlot,
        slots,
        i,
        prevLocation,
        nextLocation,
        travelMinutes,
        occupiedSlots,
        result,
      );
      if (bypass.handled) {
        recordTravel(prevLocation, nextLocation, false);
        if (bypass.skipNext) skipNextSlot = true;
        continue;
      }
    }

    // Return trip into a category slot — try to absorb the travel into the
    // slot itself rather than carving a hard boundary.
    if (placeAtStart && slot.categoryId) {
      const absorb = attemptReturnAbsorption(
        travelManager,
        slot,
        nextSlot,
        prevLocation,
        nextLocation,
        travelMinutes,
        occupiedSlots,
        result,
      );
      if (absorb.handled) {
        recordTravel(prevLocation, nextLocation, true);
        if (absorb.skipNext) skipNextSlot = true;
        continue;
      }
    }

    // Standard carving: return trips get travel at the start, outbound at the end.
    if (placeAtStart) {
      carveAtStart(
        slot,
        prevLocation,
        nextLocation,
        travelMinutes,
        occupiedSlots,
        result,
      );
    } else {
      carveAtEnd(
        slot,
        slots,
        i,
        prevLocation,
        nextLocation,
        travelMinutes,
        bufferTimeMinutes,
        occupiedSlots,
        result,
      );
    }
    recordTravel(prevLocation, nextLocation, placeAtStart);
  }

  return result;
}
