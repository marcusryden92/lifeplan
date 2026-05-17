import { Slot, TravelSlot } from "../../models/TimeSlot";

export function findPrecedingGapTravel(
  slots: Slot[],
  bufferTimeMinutes: number,
  slotStart: Date,
): TravelSlot | null {
  const bufferMs = bufferTimeMinutes * 60000;
  const expectedEnd = slotStart.getTime() - bufferMs;
  const toleranceMs = bufferMs + 10 * 60 * 1000;

  for (const slot of slots) {
    if (slot.type !== "travel") continue;
    if (slot.travelType !== "preliminary" && slot.travelType !== "outbound")
      continue;
    if (!slot.travelFromLocationId) continue;
    if (Math.abs(slot.end.getTime() - expectedEnd) <= toleranceMs) {
      return slot;
    }
  }
  return null;
}
