import { TimeSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

export function reserveInsufficientTravelBefore(
  availableSlots: TimeSlot[],
  occupiedSlots: TimeSlot[],
  bufferTimeMinutes: number,
  travelEnd: Date,
  requiredTravelMinutes: number,
  fromLocationId: string,
  toLocationId: string,
): { success: boolean } {
  const travelEndMs = travelEnd.getTime();
  const bufferMs = bufferTimeMinutes * 60000;

  const slotIndex = availableSlots.findIndex(
    (slot) => slot.isAvailable && slot.end.getTime() >= travelEndMs,
  );
  if (slotIndex === -1) return { success: false };

  const slot = availableSlots[slotIndex];
  const travelStart = new Date(slot.start.getTime() - bufferMs);
  const travelStartMs = travelStart.getTime();

  if (travelStartMs >= travelEndMs) return { success: false };

  const newSlots: TimeSlot[] = [];

  newSlots.push(
    createTravelSlot(travelStart, travelEnd, fromLocationId, toLocationId, "inbound", uuidv4(), {
      insufficientTravel: true,
      requiredTravelMinutes,
    }),
  );

  if (slot.end.getTime() > travelEndMs) {
    newSlots.push({
      start: travelEnd,
      end: slot.end,
      durationMinutes: Math.floor((slot.end.getTime() - travelEndMs) / 60000),
      isAvailable: true,
      prevLocationId: toLocationId,
      nextLocationId: slot.nextLocationId,
    });
  }

  availableSlots.splice(slotIndex, 1, ...newSlots.filter((s) => s.isAvailable));
  occupiedSlots.push(...newSlots.filter((s) => !s.isAvailable));

  return { success: true };
}
