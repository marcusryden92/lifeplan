import type { Category } from "@/types/prisma";
import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import { pushInsufficientTravel } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";
import {
  placeTravelAtSlotEnd,
  placeTravelAtSlotStart,
  placeTravelCenteredOnBoundary,
} from "./travelPlacement";
import {
  tryShiftTravelBackward,
  tryExtendForwardIntoCategory,
} from "./travelExtension";
import {
  tryBypassOutboundCategoryLayover,
  tryBypassReturnCategoryLayover,
} from "./categoryLayoverBypass";
import { CategoryBoundaryTrespass } from "./categoryBoundaryTrespass";

/* ============================================================================
 *  preliminaryTravelPass — walks the day's slots and places travel events at
 *  every location transition. For each slot, the dispatcher classifies the
 *  transition (no transition / outbound / return) and runs the matching tree.
 *  First leaf whose condition matches wins.
 *
 *  OUTBOUND (travel placed at slot END)
 *    Next slot is a too-tight contiguous category heading onward to a 3rd loc
 *      → BYPASS: one direct prev→destination across both slots
 *    This slot AND next slot are both categories, contiguous, and each half
 *    of the travel fits in its respective slot
 *      → CENTER: place travel straddling the boundary, half in each category
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
  categories: Category[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  slots: AvailableSlot[],
  categoryBoundaryTrespasses: CategoryBoundaryTrespass[] = [],
): AvailableSlot[] {
  if (!hasPlannerLocationMap) return slots;

  const result: AvailableSlot[] = [];
  let i = 0;
  while (i < slots.length) {
    i += processSlot(
      slots,
      i,
      travelManager,
      categories,
      occupiedSlots,
      bufferTimeMinutes,
      result,
      categoryBoundaryTrespasses,
    );
  }
  return result;
}

function processSlot(
  slots: AvailableSlot[],
  slotIndex: number,
  travelManager: TravelManager,
  categories: Category[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  bufferTimeMinutes: number,
  result: AvailableSlot[],
  categoryBoundaryTrespasses: CategoryBoundaryTrespass[],
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
        categoryBoundaryTrespasses,
      )
    : handleOutbound(
        slots,
        slotIndex,
        travelManager,
        categories,
        bufferTimeMinutes,
        travel.prevLocation,
        travel.nextLocation,
        travel.travelMinutes,
        occupiedSlots,
        result,
        categoryBoundaryTrespasses,
      );
}

function handleOutbound(
  slots: AvailableSlot[],
  slotIndex: number,
  travelManager: TravelManager,
  categories: Category[],
  bufferTimeMinutes: number,
  previousLocation: string,
  nextLocation: string,
  travelMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
  categoryBoundaryTrespasses: CategoryBoundaryTrespass[],
): number {
  const slot = slots[slotIndex];
  const nextSlot = slots[slotIndex + 1] ?? null;
  const bufferMilliseconds = bufferTimeMinutes * 60000;
  // Compare in milliseconds (travelMinutes can be fractional, slot.durationMinutes
  // is floored — relying on the floored field misclassifies exact fits as overflows
  // when travelMinutes has a sub-minute component).
  const travelMs = Math.round(travelMinutes * 60000);
  const slotMs = slot.end.getTime() - slot.start.getTime();

  // Next slot is a too-tight category layover → collapse into one direct hop.
  const bypass = tryBypassOutboundCategoryLayover(
    slot,
    nextSlot,
    slots,
    slotIndex,
    travelManager,
    categories,
    bufferTimeMinutes,
    previousLocation,
    nextLocation,
    travelMinutes,
    occupiedSlots,
    result,
  );
  if (bypass.handled) return bypass.slotsConsumed;

  // Cat-to-cat at different locations and a clean fit on both sides → center
  // the travel on the boundary instead of consuming only the departing slot.
  // Each half eats from one of the adjacent categories.
  const nextSlotMs = nextSlot
    ? nextSlot.end.getTime() - nextSlot.start.getTime()
    : 0;
  const canCenterOnBoundary =
    !!slot.categoryId &&
    !!nextSlot?.categoryId &&
    nextSlot.start.getTime() === slot.end.getTime() &&
    travelMs / 2 <= slotMs &&
    travelMs / 2 <= nextSlotMs;
  if (canCenterOnBoundary && nextSlot) {
    placeTravelCenteredOnBoundary(
      slot,
      nextSlot,
      slots,
      slotIndex,
      previousLocation,
      nextLocation,
      travelMinutes,
      occupiedSlots,
      result,
    );
    return 1;
  }

  // Travel < slot → place at end, leftover at start.
  if (travelMs < slotMs) {
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
  if (travelMs === slotMs) {
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

    // Slot is a category and travel would consume it entirely → skip emit,
    // record a boundary trespass so the wrapper's bottom border renders red.
    if (slot.categoryId) {
      categoryBoundaryTrespasses.push({
        categoryId: slot.categoryId,
        slotStart: slot.start,
        slotEnd: slot.end,
        boundary: "end",
      });
      result.push(slot);
      return 1;
    }

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

  // Slot is a category and travel doesn't fit anywhere → skip emit and mark
  // the wrapper's bottom border red instead of consuming the slot.
  if (slot.categoryId) {
    categoryBoundaryTrespasses.push({
      categoryId: slot.categoryId,
      slotStart: slot.start,
      slotEnd: slot.end,
      boundary: "end",
    });
    result.push(slot);
    return 1;
  }

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
  categoryBoundaryTrespasses: CategoryBoundaryTrespass[],
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

  // Slot is a category and return travel would consume it entirely → skip
  // emit, record a boundary trespass so the wrapper's top border renders red.
  const travelMs = Math.round(travelMinutes * 60000);
  const slotMs = slot.end.getTime() - slot.start.getTime();
  if (slot.categoryId && travelMs >= slotMs) {
    categoryBoundaryTrespasses.push({
      categoryId: slot.categoryId,
      slotStart: slot.start,
      slotEnd: slot.end,
      boundary: "start",
    });
    result.push(slot);
    return 1;
  }

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
