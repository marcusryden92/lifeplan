import { TimeSlot } from "../../models/TimeSlot";
import { isTravelSlot } from "../../utils/timeSlotUtils";
import { dateTimeService } from "../../utils/dateTimeService";

export function findPrecedingGapTravel(
  occupiedSlots: Map<string, TimeSlot[]>,
  bufferTimeMinutes: number,
  slotStart: Date,
): TimeSlot | null {
  const dayKey = dateTimeService.getDayKey(slotStart);
  const slots = occupiedSlots.get(dayKey) || [];
  const bufferMs = bufferTimeMinutes * 60000;
  const expectedEnd = slotStart.getTime() - bufferMs;
  const toleranceMs = bufferMs + 10 * 60 * 1000;

  for (const slot of slots) {
    if (!isTravelSlot(slot)) continue;
    if (slot.travelType !== "preliminary" && slot.travelType !== "outbound") continue;
    if (!slot.travelFromLocationId) continue;
    const timeDiff = Math.abs(slot.end.getTime() - expectedEnd);
    if (timeDiff <= toleranceMs) {
      return slot;
    }
  }
  return null;
}
