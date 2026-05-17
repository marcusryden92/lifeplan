import { AvailableSlot, Slot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

export function reserveInsufficientTravelAfter(
  slots: Slot[],
  bufferTimeMinutes: number,
  travelStart: Date,
  requiredTravelMinutes: number,
  fromLocationId: string,
  toLocationId: string,
): { success: boolean } {
  const travelStartMs = travelStart.getTime();
  const bufferMs = bufferTimeMinutes * 60000;

  const slotIdx = slots.findIndex(
    (s) =>
      s.type === "available" &&
      s.start.getTime() - bufferMs <= travelStartMs &&
      s.end.getTime() > travelStartMs,
  );
  if (slotIdx === -1) return { success: false };

  const slot = slots[slotIdx] as AvailableSlot;
  const travelEnd = slot.end;
  const travelEndMs = travelEnd.getTime();

  if (travelStartMs >= travelEndMs) return { success: false };

  const replacements: Slot[] = [];
  if (travelStartMs > slot.start.getTime()) {
    replacements.push({
      start: slot.start,
      end: travelStart,
      durationMinutes: Math.floor(
        (travelStartMs - slot.start.getTime()) / 60000,
      ),
      type: "available",
      prevLocationId: slot.prevLocationId,
      nextLocationId: fromLocationId,
    });
  }
  replacements.push(
    createTravelSlot(
      travelStart,
      travelEnd,
      fromLocationId,
      toLocationId,
      "outbound",
      uuidv4(),
      { insufficientTravel: true, requiredTravelMinutes },
    ),
  );

  slots.splice(slotIdx, 1, ...replacements);
  return { success: true };
}
