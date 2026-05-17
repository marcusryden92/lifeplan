import { Slot } from "../../models/TimeSlot";

export function findAdjacentTravelTo(
  slots: Slot[],
  bufferTimeMinutes: number,
  nearTime: Date,
  toLocationId: string,
): Date | null {
  const searchWindowMs = bufferTimeMinutes * 60000 + 10 * 60 * 1000;

  for (const slot of slots) {
    if (
      slot.type === "travel" &&
      slot.travelToLocationId === toLocationId &&
      Math.abs(slot.start.getTime() - nearTime.getTime()) <= searchWindowMs
    ) {
      return new Date(slot.start.getTime());
    }
  }

  return null;
}
