import { TimeSlot } from "../../models/TimeSlot";
import { isTravelSlot } from "../../utils/timeSlotUtils";
import { dateTimeService } from "../../utils/dateTimeService";

export function findAdjacentTravelFrom(
  occupiedSlots: Map<string, TimeSlot[]>,
  bufferTimeMinutes: number,
  nearTime: Date,
  fromLocationId: string,
): TimeSlot | null {
  const dayKey = dateTimeService.getDayKey(nearTime);
  const slots = occupiedSlots.get(dayKey) || [];

  const bufferMs = bufferTimeMinutes * 60000;
  const searchWindowMs = bufferMs + 10 * 60 * 1000;

  for (const slot of slots) {
    if (
      isTravelSlot(slot) &&
      slot.travelFromLocationId === fromLocationId &&
      slot.travelType === "outbound"
    ) {
      const timeDiff = Math.abs(slot.end.getTime() - nearTime.getTime());
      if (timeDiff <= searchWindowMs) {
        return slot;
      }
    }
  }

  return null;
}
