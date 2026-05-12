import type { CategoryConstraint } from "@/types/categoryTypes";
import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { pushInsufficientTravel } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";
import {
  placeTravelAtSlotEnd,
  placeTravelAtSlotStart,
} from "./travelPlacement";
import {
  tryShiftTravelBackward,
  tryExtendForwardIntoCategory,
} from "./travelExtension";
import {
  tryBypassOutboundCategoryLayover,
  tryBypassReturnCategoryLayover,
} from "./categoryLayoverBypass";

/* ============================================================================
 *  preliminaryTravelPass — walks the day's slots and places travel events at
 *  every location transition. For each slot, the dispatcher classifies the
 *  transition (no transition / outbound / return) and runs the matching tree.
 *  First leaf whose condition matches wins.
 *
 *  OUTBOUND (travel placed at slot END)
 *    Next slot is a too-tight contiguous category heading onward to a 3rd loc
 *      → BYPASS: one direct prev→destination across both slots
 *    Travel < slot
 *      → place at slot end, leftover at start
 *    Travel == slot
 *      Previous slot can absorb it
 *        → shift travel backward into previous, freeing this slot
 *      Otherwise
 *        → place travel filling slot exactly
 *    Travel > slot
 *      Previous slot can absorb AND (this or previous is in a category)
 *        → shift travel backward into previous
 *      Next slot is a contiguous category
 *        → extend travel forward into it
 *      Otherwise
 *        → mark slot as insufficient travel
 *
 *  RETURN (travel placed at slot START)
 *    Current is category, next non-category contiguous, return travel longer
 *    than category slot
 *      → BYPASS: one direct foreign→destination across both slots
 *    Travel fits
 *      → place at slot start, leftover at end
 *    Travel doesn't fit
 *      → mark slot as insufficient travel
 *
 *  Bypass logic: categoryLayoverBypass.ts.
 *  Single-slot placement: travelPlacement.ts.
 *  Stretching strategies: travelExtension.ts.
 * ============================================================================
 */
export function preliminaryTravelPass(
  hasPlannerLocationMap: boolean,
  categoryConstraints: CategoryConstraint[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  slots: AvailableSlot[],
): AvailableSlot[] {
  if (!hasPlannerLocationMap) return slots;

  const result: AvailableSlot[] = [];
  let i = 0;
  while (i < slots.length) {
    i += processSlot(
      slots,
      i,
      travelManager,
      categoryConstraints,
      occupiedSlots,
      bufferTimeMinutes,
      result,
    );
  }
  return result;
}

function processSlot(
  slots: AvailableSlot[],
  slotIndex: number,
  travelManager: TravelManager,
  categoryConstraints: CategoryConstraint[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  bufferTimeMinutes: number,
  result: AvailableSlot[],
): number {
  const slot = slots[slotIndex];
  if (slot.durationMinutes <= 0) return 1;

  const travel = travelManager.resolveTravel(slot);
  if (!travel) {
    result.push(slot);
    return 1;
  }

  return travel.placeAtSlotStart
    ? handleReturn(
        slots,
        slotIndex,
        travelManager,
        travel.prevLocation,
        travel.nextLocation,
        travel.travelMinutes,
        occupiedSlots,
        result,
      )
    : handleOutbound(
        slots,
        slotIndex,
        travelManager,
        categoryConstraints,
        bufferTimeMinutes,
        travel.prevLocation,
        travel.nextLocation,
        travel.travelMinutes,
        occupiedSlots,
        result,
      );
}

function handleOutbound(
  slots: AvailableSlot[],
  slotIndex: number,
  travelManager: TravelManager,
  categoryConstraints: CategoryConstraint[],
  bufferTimeMinutes: number,
  previousLocation: string,
  nextLocation: string,
  travelMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): number {
  const slot = slots[slotIndex];
  const nextSlot = slots[slotIndex + 1] ?? null;
  const bufferMilliseconds = bufferTimeMinutes * 60000;

  // Next slot is a too-tight category layover → collapse into one direct hop.
  const bypass = tryBypassOutboundCategoryLayover(
    slot,
    nextSlot,
    slots,
    slotIndex,
    travelManager,
    categoryConstraints,
    bufferTimeMinutes,
    previousLocation,
    nextLocation,
    travelMinutes,
    occupiedSlots,
    result,
  );
  if (bypass.handled) return bypass.slotsConsumed;

  // Travel < slot → place at end, leftover at start.
  if (travelMinutes < slot.durationMinutes) {
    placeTravelAtSlotEnd(
      slot,
      previousLocation,
      nextLocation,
      travelMinutes,
      occupiedSlots,
      result,
    );
    return 1;
  }

  // Travel == slot → shift backward if we can (free win), else fill exactly.
  if (travelMinutes === slot.durationMinutes) {
    const shifted = tryShiftTravelBackward(
      slot,
      previousLocation,
      nextLocation,
      travelMinutes,
      bufferMilliseconds,
      true,
      occupiedSlots,
      result,
    );
    if (shifted) return 1;

    placeTravelAtSlotEnd(
      slot,
      previousLocation,
      nextLocation,
      travelMinutes,
      occupiedSlots,
      result,
    );
    return 1;
  }

  // Travel > slot → try stretching into adjacent slots, else mark insufficient.

  // Shift backward (restricted to category-related slots).
  const shifted = tryShiftTravelBackward(
    slot,
    previousLocation,
    nextLocation,
    travelMinutes,
    bufferMilliseconds,
    false,
    occupiedSlots,
    result,
  );
  if (shifted) return 1;

  // Extend forward into a contiguous next category slot.
  const extendedForward = tryExtendForwardIntoCategory(
    slot,
    slots,
    slotIndex,
    previousLocation,
    nextLocation,
    travelMinutes,
    bufferMilliseconds,
    occupiedSlots,
  );
  if (extendedForward) return 1;

  // Nothing fit — mark the slot insufficient (renders red on the calendar).
  pushInsufficientTravel(
    occupiedSlots,
    slot.start,
    slot.end,
    previousLocation,
    nextLocation,
    travelMinutes,
    slot,
    uuidv4(),
  );
  return 1;
}

function handleReturn(
  slots: AvailableSlot[],
  slotIndex: number,
  travelManager: TravelManager,
  previousLocation: string,
  nextLocation: string,
  travelMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): number {
  const slot = slots[slotIndex];
  const nextSlot = slots[slotIndex + 1] ?? null;

  // Current category, return travel longer than category slot, non-cat after
  // → collapse into one direct hop.
  const bypass = tryBypassReturnCategoryLayover(
    slot,
    nextSlot,
    travelManager,
    previousLocation,
    nextLocation,
    travelMinutes,
    occupiedSlots,
    result,
  );
  if (bypass.handled) return bypass.slotsConsumed;

  // Otherwise place at slot start (falls through to insufficient if it doesn't fit).
  placeTravelAtSlotStart(
    slot,
    previousLocation,
    nextLocation,
    travelMinutes,
    occupiedSlots,
    result,
  );
  return 1;
}
