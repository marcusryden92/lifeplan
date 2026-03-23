import { TimeSlot, TimeSlotUtils } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";

export function findAdjacentTravelTo(
  occupiedSlots: Map<string, TimeSlot[]>,
  bufferTimeMinutes: number,
  nearTime: Date,
  toLocationId: string,
): Date | null {
  const dayKey = dateTimeService.getDayKey(nearTime);
  const slots = occupiedSlots.get(dayKey) || [];

  const bufferMs = bufferTimeMinutes * 60000;
  const searchWindowMs = bufferMs + 10 * 60 * 1000;

  for (const slot of slots) {
    if (
      TimeSlotUtils.isTravelSlot(slot) &&
      slot.travelToLocationId === toLocationId
    ) {
      const timeDiff = Math.abs(slot.start.getTime() - nearTime.getTime());
      if (timeDiff <= searchWindowMs) {
        return new Date(slot.start.getTime());
      }
    }
  }

  return null;
}
