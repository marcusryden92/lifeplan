import { OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { isTravelSlot } from "../../utils/timeSlotUtils";

export function findPrecedingGapTravel(
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  bufferTimeMinutes: number,
  slotStart: Date,
): TravelSlot | null {
  const bufferMs = bufferTimeMinutes * 60000;
  const expectedEnd = slotStart.getTime() - bufferMs;
  const toleranceMs = bufferMs + 10 * 60 * 1000;

  for (const slot of occupiedSlots) {
    if (!isTravelSlot(slot)) continue;
    if (slot.travelType !== "preliminary" && slot.travelType !== "outbound") continue;
    if (!slot.travelFromLocationId) continue;
    if (Math.abs(slot.end.getTime() - expectedEnd) <= toleranceMs) {
      return slot;
    }
  }
  return null;
}
