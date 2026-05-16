import type { Category } from "@/types/prisma";
import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";
import {
  createTravelSlot,
  pushInsufficientTravel,
} from "../../utils/timeSlotUtils";
import { expandSlotForDay } from "../TimeSlotManager/expandSlotForDay";
import { v4 as uuidv4 } from "uuid";

/**
 * Category layover bypass — when two adjacent slots span a too-tight category
 * layover, collapse the two-hop trip into a single direct hop and skip the
 * category location entirely.
 *
 *   Outbound:  prev → [too-tight category] → next    →  prev → next
 *   Return:    foreign → [too-tight category] → final →  foreign → final
 *
 * Each detector: (a) ELIGIBILITY, (b) DECIDE, (c) EMIT.
 */

export type BypassResult = { handled: boolean; slotsConsumed: number };

export function tryBypassOutboundCategoryLayover(
  slot: AvailableSlot,
  nextSlot: AvailableSlot | null,
  slots: AvailableSlot[],
  slotIndex: number,
  travelManager: TravelManager,
  categories: Category[],
  bufferTimeMinutes: number,
  previousLocation: string,
  categoryLocation: string,
  travelToCategoryMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): BypassResult {
  // (a) ELIGIBILITY — pattern: [non-category] → [contiguous category, inside
  // its period, heading onward to a 3rd location]. If the category is at the
  // end of its period, normal placement handles the outgoing at the period
  // boundary, so we skip.
  if (slot.categoryId) return { handled: false, slotsConsumed: 0 };
  if (!nextSlot?.categoryId) return { handled: false, slotsConsumed: 0 };
  if (nextSlot.start.getTime() !== slot.end.getTime())
    return { handled: false, slotsConsumed: 0 };
  if (!nextSlot.nextLocationId || nextSlot.nextLocationId === categoryLocation)
    return { handled: false, slotsConsumed: 0 };
  const categoryPeriodEnd = findCategoryPeriodEnd(nextSlot, categories);
  if (
    categoryPeriodEnd === undefined ||
    nextSlot.end.getTime() >= categoryPeriodEnd.getTime()
  ) {
    return { handled: false, slotsConsumed: 0 };
  }

  // (b) DECIDE — two independent triggers; either one demands a bypass.
  const finalDestination = nextSlot.nextLocationId;
  const travelCategoryToDestination = travelManager.getTravelTime(
    categoryLocation,
    finalDestination,
    nextSlot.end,
  );
  if (travelCategoryToDestination <= 0)
    return { handled: false, slotsConsumed: 0 };

  // Category slot can't hold its own outgoing travel.
  const categorySlotCannotHoldOutgoing =
    travelCategoryToDestination > nextSlot.durationMinutes;
  // Combined span can't hold both hops + buffer.
  const combinedSpanCannotHoldBoth =
    travelToCategoryMinutes + bufferTimeMinutes + travelCategoryToDestination >
    slot.durationMinutes + nextSlot.durationMinutes;

  if (!categorySlotCannotHoldOutgoing && !combinedSpanCannotHoldBoth) {
    return { handled: false, slotsConsumed: 0 };
  }

  // (c) EMIT — anchor depends on which trigger fired:
  //   category slot too small  → span END (preserves leftover before)
  //   combined span too tight  → span START (trims category slot after)
  const spanEnd = nextSlot.end;

  if (categorySlotCannotHoldOutgoing) {
    const directMinutes = travelManager.getTravelTime(
      previousLocation,
      finalDestination,
      spanEnd,
    );
    emitDirectTravelAnchoredAtSpanEnd(
      slot.start,
      spanEnd,
      previousLocation,
      finalDestination,
      directMinutes,
      slot,
      occupiedSlots,
      result,
    );
    return { handled: true, slotsConsumed: 2 };
  }

  const directMinutes = travelManager.getTravelTime(
    previousLocation,
    finalDestination,
    slot.start,
  );
  const bothSlotsConsumed = emitDirectTravelAnchoredAtSpanStartTrimmingNext(
    slot,
    nextSlot,
    slots,
    slotIndex,
    spanEnd,
    previousLocation,
    categoryLocation,
    finalDestination,
    directMinutes,
    occupiedSlots,
  );
  return { handled: true, slotsConsumed: bothSlotsConsumed ? 2 : 1 };
}

export function tryBypassReturnCategoryLayover(
  slot: AvailableSlot,
  nextSlot: AvailableSlot | null,
  travelManager: TravelManager,
  foreignLocation: string,
  categoryLocation: string,
  returnTravelMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): BypassResult {
  // (a) ELIGIBILITY — pattern: [category, returning from foreign] →
  // [contiguous non-category leaving the category location for a 3rd loc].
  // The "return travel longer than category slot" check also doubles as the
  // tightness trigger (so step (b) is implicit).
  if (!slot.categoryId) return { handled: false, slotsConsumed: 0 };
  if (returnTravelMinutes < slot.durationMinutes)
    return { handled: false, slotsConsumed: 0 };
  if (!nextSlot || nextSlot.categoryId)
    return { handled: false, slotsConsumed: 0 };
  if (nextSlot.start.getTime() !== slot.end.getTime())
    return { handled: false, slotsConsumed: 0 };
  if (nextSlot.prevLocationId !== categoryLocation || !nextSlot.nextLocationId)
    return { handled: false, slotsConsumed: 0 };

  // (c) EMIT — direct foreign → destination anchored at span START.
  // Leftover at the end becomes available time at the destination.
  const finalDestination = nextSlot.nextLocationId;
  const directMinutes = travelManager.getTravelTime(
    foreignLocation,
    finalDestination,
    slot.start,
  );
  emitDirectTravelAnchoredAtSpanStartWithLeftover(
    slot,
    nextSlot,
    foreignLocation,
    finalDestination,
    directMinutes,
    occupiedSlots,
    result,
  );
  return { handled: true, slotsConsumed: 2 };
}

// === Bypass placement helpers ===============================================
//
// These emit direct travel across a two-slot span. They're private to the
// bypass logic — single-slot placement lives in travelPlacement.ts.

function emitDirectTravelAnchoredAtSpanEnd(
  spanStart: Date,
  spanEnd: Date,
  previousLocation: string,
  finalDestination: string,
  directMinutes: number,
  slot: AvailableSlot,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): void {
  const travelStart = new Date(spanEnd.getTime() - directMinutes * 60000);

  if (travelStart.getTime() < spanStart.getTime()) {
    pushInsufficientTravel(
      occupiedSlots,
      spanStart,
      spanEnd,
      previousLocation,
      finalDestination,
      directMinutes,
      slot,
      uuidv4(),
    );
    return;
  }

  occupiedSlots.push(
    createTravelSlot(
      travelStart,
      spanEnd,
      previousLocation,
      finalDestination,
      "preliminary",
      uuidv4(),
      { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
    ),
  );
  if (travelStart.getTime() > spanStart.getTime()) {
    result.push({
      start: spanStart,
      end: travelStart,
      durationMinutes: Math.floor(
        (travelStart.getTime() - spanStart.getTime()) / 60000,
      ),
      isAvailable: true,
      prevLocationId: slot.prevLocationId,
      nextLocationId: finalDestination,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    });
  }
}

function emitDirectTravelAnchoredAtSpanStartTrimmingNext(
  slot: AvailableSlot,
  nextSlot: AvailableSlot,
  slots: AvailableSlot[],
  slotIndex: number,
  spanEnd: Date,
  previousLocation: string,
  categoryLocation: string,
  finalDestination: string,
  directMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
): boolean {
  const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);

  if (travelEnd.getTime() > spanEnd.getTime()) {
    pushInsufficientTravel(
      occupiedSlots,
      slot.start,
      spanEnd,
      previousLocation,
      finalDestination,
      directMinutes,
      slot,
      uuidv4(),
    );
    return true;
  }

  occupiedSlots.push(
    createTravelSlot(
      slot.start,
      travelEnd,
      previousLocation,
      finalDestination,
      "preliminary",
      uuidv4(),
      { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
    ),
  );

  if (travelEnd.getTime() < spanEnd.getTime()) {
    // Trim the next (category) slot in place — it still holds available time
    // at the category location after the direct travel completes.
    slots[slotIndex + 1] = {
      ...nextSlot,
      start: travelEnd,
      durationMinutes: Math.floor(
        (spanEnd.getTime() - travelEnd.getTime()) / 60000,
      ),
      prevLocationId: categoryLocation,
    };
    return false;
  }
  return true;
}

function emitDirectTravelAnchoredAtSpanStartWithLeftover(
  slot: AvailableSlot,
  nextSlot: AvailableSlot,
  foreignLocation: string,
  finalDestination: string,
  directMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): void {
  const spanEnd = nextSlot.end;
  const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);

  if (travelEnd.getTime() > spanEnd.getTime()) {
    pushInsufficientTravel(
      occupiedSlots,
      slot.start,
      spanEnd,
      foreignLocation,
      finalDestination,
      directMinutes,
      slot,
      uuidv4(),
    );
    return;
  }

  occupiedSlots.push(
    createTravelSlot(
      slot.start,
      travelEnd,
      foreignLocation,
      finalDestination,
      "preliminary",
      uuidv4(),
      { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
    ),
  );
  if (travelEnd.getTime() < spanEnd.getTime()) {
    result.push({
      start: travelEnd,
      end: spanEnd,
      durationMinutes: Math.floor(
        (spanEnd.getTime() - travelEnd.getTime()) / 60000,
      ),
      isAvailable: true,
      prevLocationId: finalDestination,
      nextLocationId: nextSlot.nextLocationId,
      categoryId: null,
      isStrictCategory: false,
    });
  }
}

function findCategoryPeriodEnd(
  slot: AvailableSlot,
  constraints: Category[],
): Date | undefined {
  if (!slot.categoryId) return undefined;
  const constraint = constraints.find((c) => c.id === slot.categoryId);
  if (!constraint) return undefined;

  const dayStart = new Date(slot.start);
  dayStart.setHours(0, 0, 0, 0);
  const slotStartMs = slot.start.getTime();
  const slotEndMs = slot.end.getTime();

  for (const categoryTimeSlot of constraint.timeSlots) {
    const period = expandSlotForDay(categoryTimeSlot, dayStart);
    if (!period) continue;
    if (
      period.start.getTime() <= slotStartMs &&
      period.end.getTime() >= slotEndMs
    ) {
      return period.end;
    }
  }
  return undefined;
}
