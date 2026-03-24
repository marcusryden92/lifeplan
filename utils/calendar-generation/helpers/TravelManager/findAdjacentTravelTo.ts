import { OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { isTravelSlot } from "../../utils/timeSlotUtils";

export function findAdjacentTravelTo(
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  bufferTimeMinutes: number,
  nearTime: Date,
  toLocationId: string,
): Date | null {
  const searchWindowMs = bufferTimeMinutes * 60000 + 10 * 60 * 1000;

  for (const slot of occupiedSlots) {
    if (
      isTravelSlot(slot) &&
      slot.travelToLocationId === toLocationId &&
      Math.abs(slot.start.getTime() - nearTime.getTime()) <= searchWindowMs
    ) {
      return new Date(slot.start.getTime());
    }
  }

  return null;
}
