import { Slot, TravelSlot } from "../../models/TimeSlot";

export function findAdjacentTravelFrom(
  slots: Slot[],
  bufferTimeMinutes: number,
  nearTime: Date,
  fromLocationId: string,
): TravelSlot | null {
  const searchWindowMs = bufferTimeMinutes * 60000 + 10 * 60 * 1000;

  for (const slot of slots) {
    if (
      slot.type === "travel" &&
      slot.travelFromLocationId === fromLocationId &&
      slot.travelType === "outbound" &&
      Math.abs(slot.end.getTime() - nearTime.getTime()) <= searchWindowMs
    ) {
      return slot;
    }
  }

  return null;
}
