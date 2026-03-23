import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { dateTimeService } from "../../utils/dateTimeService";
import { tryDirectBypass } from "./tryDirectBypass";
import { tryDoubleTransition } from "./tryDoubleTransition";
import { tryReturnAbsorption } from "./tryReturnAbsorption";
import { carveAtStart } from "./carveAtStart";
import { carveAtEnd } from "./carveAtEnd";

export function carveTravelFromChain(
  categoryPeriods: CategoryPeriod[],
  occupiedSlotsMap: Map<string, TimeSlot[]>,
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  slots: TimeSlot[],
  dayStart: Date,
): TimeSlot[] {
  const dayKey = dateTimeService.getDayKey(dayStart);
  const occupiedSlots = (occupiedSlotsMap.get(dayKey) || []).filter(
    (s) => s.travelType !== "preliminary",
  );
  const result: TimeSlot[] = [];

  const departureLocations = new Set<string>();

  let skipNextSlot = false;
  for (let i = 0; i < slots.length; i++) {
    if (skipNextSlot) {
      skipNextSlot = false;
      continue;
    }
    const slot = slots[i];

    if (!slot.isAvailable) {
      result.push(slot);
      continue;
    }

    const prevLoc = slot.prevLocationId;
    const nextLoc = slot.nextLocationId;
    if (!prevLoc || !nextLoc || prevLoc === nextLoc) {
      result.push(slot);
      continue;
    }
    if (slot.durationMinutes <= 0) {
      result.push(slot);
      continue;
    }

    const placeAtStart = departureLocations.has(nextLoc);
    const travelMinutes = travelManager.getTravelTime(
      prevLoc,
      nextLoc,
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
        prevLoc,
        nextLoc,
        travelMinutes,
        occupiedSlots,
        result,
      );
      if (bypass.handled) {
        departureLocations.add(prevLoc);
        if (bypass.skipNext) skipNextSlot = true;
        continue;
      }
    }

    if (slot.categoryId) {
      const dbl = tryDoubleTransition(
        categoryPeriods,
        travelManager,
        slot,
        prevLoc,
        nextLoc,
        occupiedSlots,
        result,
      );
      if (dbl.handled) {
        departureLocations.add(prevLoc);
        if (dbl.catLoc) departureLocations.add(dbl.catLoc);
        continue;
      }
    }

    if (placeAtStart && slot.categoryId) {
      const absorb = tryReturnAbsorption(
        travelManager,
        slot,
        nextSlot,
        prevLoc,
        nextLoc,
        travelMinutes,
        occupiedSlots,
        result,
      );
      if (absorb.handled) {
        departureLocations.add(prevLoc);
        if (absorb.skipNext) skipNextSlot = true;
        continue;
      }
    }

    if (placeAtStart) {
      carveAtStart(
        slot,
        prevLoc,
        nextLoc,
        travelMinutes,
        occupiedSlots,
        result,
      );
    } else {
      carveAtEnd(
        slot,
        slots,
        i,
        prevLoc,
        nextLoc,
        travelMinutes,
        bufferTimeMinutes,
        occupiedSlots,
        result,
      );
    }
    departureLocations.add(prevLoc);
  }

  occupiedSlotsMap.set(dayKey, occupiedSlots);
  return result;
}
