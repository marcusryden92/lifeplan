import { TimeSlot } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";

export function canPlaceStandaloneTravelBefore(
  availableSlots: Map<string, TimeSlot[]>,
  bufferTimeMinutes: number,
  travelEnd: Date,
  travelMinutes: number,
): boolean {
  const dayKey = dateTimeService.getDayKey(travelEnd);
  const slots = availableSlots.get(dayKey) || [];

  const travelEndMs = travelEnd.getTime();
  const travelStartMs = travelEndMs - travelMinutes * 60000;

  if (travelMinutes <= 0 || travelStartMs >= travelEndMs) return false;

  const bufferMs = bufferTimeMinutes * 60000;

  return (
    slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.start.getTime() - bufferMs <= travelStartMs &&
        slot.end.getTime() >= travelEndMs,
    ) !== -1
  );
}
