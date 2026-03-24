import { CategoryPeriod } from "@/types/categoryTypes";
import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { tryDirectBypass } from "./tryDirectBypass";
import { tryDoubleTransition } from "./tryDoubleTransition";
import { tryReturnAbsorption } from "./tryReturnAbsorption";
import { carveAtStart } from "./carveAtStart";
import { carveAtEnd } from "./carveAtEnd";

export function carveTravelFromChain(
  hasPlannerLocationMap: boolean,
  categoryPeriods: CategoryPeriod[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  slots: AvailableSlot[],
): AvailableSlot[] {
  if (!hasPlannerLocationMap) return slots;

  const result: AvailableSlot[] = [];
  const departureLocations = new Set<string>();

  let skipNextSlot = false;
  for (let i = 0; i < slots.length; i++) {
    if (skipNextSlot) {
      skipNextSlot = false;
      continue;
    }
    const slot = slots[i];

    const prevLocation = slot.prevLocationId;
    const nextLocation = slot.nextLocationId;
    if (!prevLocation || !nextLocation || prevLocation === nextLocation) {
      result.push(slot);
      continue;
    }
    if (slot.durationMinutes <= 0) {
      result.push(slot);
      continue;
    }

    const placeAtStart = departureLocations.has(nextLocation);
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

    if (!placeAtStart && !slot.categoryId) {
      const bypass = tryDirectBypass(
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
        departureLocations.add(prevLocation);
        if (bypass.skipNext) skipNextSlot = true;
        continue;
      }
    }

    if (slot.categoryId) {
      const dbl = tryDoubleTransition(
        categoryPeriods,
        travelManager,
        slot,
        prevLocation,
        nextLocation,
        occupiedSlots,
        result,
      );
      if (dbl.handled) {
        departureLocations.add(prevLocation);
        if (dbl.categoryLocation) departureLocations.add(dbl.categoryLocation);
        continue;
      }
    }

    if (placeAtStart && slot.categoryId) {
      const absorb = tryReturnAbsorption(
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
        departureLocations.add(prevLocation);
        if (absorb.skipNext) skipNextSlot = true;
        continue;
      }
    }

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
    departureLocations.add(prevLocation);
  }

  return result;
}
