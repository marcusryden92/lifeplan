import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import {
  createTravelSlot,
  pushInsufficientTravel,
} from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

/**
 * Single-slot placement primitives. Each emits a travel slot and any leftover
 * available fragment for a specific geometric situation. No decision logic —
 * callers decide WHEN to place; these functions decide HOW to emit slots.
 */

export function placeTravelAtSlotEnd(
  slot: AvailableSlot,
  previousLocation: string,
  nextLocation: string,
  travelMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): void {
  const travelStart = new Date(slot.end.getTime() - travelMinutes * 60000);
  occupiedSlots.push(
    createTravelSlot(
      travelStart,
      slot.end,
      previousLocation,
      nextLocation,
      "preliminary",
      uuidv4(),
      { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
    ),
  );
  if (travelStart.getTime() > slot.start.getTime()) {
    result.push({
      start: slot.start,
      end: travelStart,
      durationMinutes: Math.floor(
        (travelStart.getTime() - slot.start.getTime()) / 60000,
      ),
      isAvailable: true,
      prevLocationId: slot.prevLocationId,
      nextLocationId: nextLocation,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    });
  }
}

export function placeTravelAtSlotStart(
  slot: AvailableSlot,
  previousLocation: string,
  nextLocation: string,
  travelMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): void {
  const travelEnd = new Date(slot.start.getTime() + travelMinutes * 60000);

  if (travelEnd.getTime() > slot.end.getTime()) {
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
    return;
  }

  occupiedSlots.push(
    createTravelSlot(
      slot.start,
      travelEnd,
      previousLocation,
      nextLocation,
      "preliminary",
      uuidv4(),
      { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
    ),
  );
  if (travelEnd.getTime() < slot.end.getTime()) {
    result.push({
      start: travelEnd,
      end: slot.end,
      durationMinutes: Math.floor(
        (slot.end.getTime() - travelEnd.getTime()) / 60000,
      ),
      isAvailable: true,
      prevLocationId: nextLocation,
      nextLocationId: slot.nextLocationId,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    });
  }
}
