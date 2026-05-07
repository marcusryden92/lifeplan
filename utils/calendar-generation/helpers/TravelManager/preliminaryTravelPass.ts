import { CategoryPeriod } from "@/types/categoryTypes";
import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { attemptDirectBypass } from "./attemptDirectBypass";
import { attemptReturnAbsorption } from "./attemptReturnAbsorption";
import { carveAtStart } from "./carveAtStart";
import { carveAtEnd } from "./carveAtEnd";

/**
 * Iterates all available slots and carves travel events into boundaries between
 * slots at different locations.
 *
 * Outbound trips (A→B, first visit) are carved at the END of the departing slot,
 * preserving available time before departure.
 *
 * Return trips (B→A, back to a previously visited location) are carved at the
 * START of the arriving slot, forming the sandwich: [A→B travel][B time][B→A travel].
 *
 * @param hasPlannerLocationMap - Skip the pass entirely if no location data exists.
 * @param categoryPeriods - Category time boundaries, used for bypass decisions.
 * @param occupiedSlots - Already-placed events; travel slots are appended here.
 * @param travelManager - Provides travel durations between locations.
 * @param bufferTimeMinutes - Minimum buffer to maintain around travel events.
 * @param slots - Available slots to process.
 * @returns Revised available slots with travel carved out.
 */
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
  let skipNextSlot = false;

  for (let i = 0; i < slots.length; i++) {
    if (skipNextSlot) {
      skipNextSlot = false;
      continue;
    }
    skipNextSlot = processSlot(
      slots,
      i,
      travelManager,
      categoryPeriods,
      occupiedSlots,
      bufferTimeMinutes,
      result,
    );
  }

  return result;
}

function processSlot(
  slots: AvailableSlot[],
  i: number,
  travelManager: TravelManager,
  categoryPeriods: CategoryPeriod[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  bufferTimeMinutes: number,
  result: AvailableSlot[],
): boolean {
  const slot = slots[i];

  // Skip zero-duration slots
  if (slot.durationMinutes <= 0) return false;

  // Resolve travel direction and duration; no travel means pass the slot through unchanged
  const travel = travelManager.resolveTravel(slot);
  if (!travel) {
    result.push(slot);
    return false;
  }

  const { prevLocation, nextLocation, placeAtSlotStart, travelMinutes } =
    travel;
  const nextSlot = i + 1 < slots.length ? slots[i + 1] : null;

  // Outbound into a category boundary — collapse both transitions into a direct bypass if the gap is too tight
  if (!placeAtSlotStart && !slot.categoryId) {
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
    if (bypass.handled) return bypass.skipNext ?? false;
  }

  // Return into a category slot — absorb travel into the slot rather than carving a hard boundary
  if (placeAtSlotStart && slot.categoryId) {
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
    if (absorb.handled) return absorb.skipNext ?? false;
  }

  // Standard carve — outbound at end, return at start
  if (placeAtSlotStart) {
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
  return false;
}
