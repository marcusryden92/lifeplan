import { OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { isTravelSlot } from "../../utils/timeSlotUtils";

export function findAdjacentTravelFrom(
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  bufferTimeMinutes: number,
  nearTime: Date,
  fromLocationId: string,
): TravelSlot | null {
  const searchWindowMs = bufferTimeMinutes * 60000 + 10 * 60 * 1000;

  for (const slot of occupiedSlots) {
    if (
      isTravelSlot(slot) &&
      slot.travelFromLocationId === fromLocationId &&
      slot.travelType === "outbound" &&
      Math.abs(slot.end.getTime() - nearTime.getTime()) <= searchWindowMs
    ) {
      return slot;
    }
  }

  return null;
}
