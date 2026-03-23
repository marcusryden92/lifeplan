import { TimeSlot } from "../../models/TimeSlot";

export function canPlaceStandaloneTravelBefore(
  availableSlots: TimeSlot[],
  bufferTimeMinutes: number,
  travelEnd: Date,
  travelMinutes: number,
): boolean {
  if (travelMinutes <= 0) return false;

  const travelEndMs = travelEnd.getTime();
  const travelStartMs = travelEndMs - travelMinutes * 60000;
  const bufferMs = bufferTimeMinutes * 60000;

  return availableSlots.findIndex(
    (slot) =>
      slot.isAvailable &&
      slot.start.getTime() - bufferMs <= travelStartMs &&
      slot.end.getTime() >= travelEndMs,
  ) !== -1;
}
