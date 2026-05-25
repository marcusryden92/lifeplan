import { Slot } from "../../models/TimeSlot";

export function canPlaceStandaloneTravelBefore(
  slots: Slot[],
  bufferTimeMinutes: number,
  travelEnd: Date,
  travelMinutes: number,
): boolean {
  if (travelMinutes <= 0) return false;

  const travelEndMs = travelEnd.getTime();
  const travelStartMs = travelEndMs - travelMinutes * 60000;
  const bufferMs = bufferTimeMinutes * 60000;

  return (
    slots.findIndex(
      (slot) =>
        slot.type === "available" &&
        slot.start.getTime() - bufferMs <= travelStartMs &&
        slot.end.getTime() >= travelEndMs,
    ) !== -1
  );
}
