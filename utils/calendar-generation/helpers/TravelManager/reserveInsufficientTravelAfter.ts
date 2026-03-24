import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

export function reserveInsufficientTravelAfter(
  availableSlots: AvailableSlot[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  bufferTimeMinutes: number,
  travelStart: Date,
  requiredTravelMinutes: number,
  fromLocationId: string,
  toLocationId: string,
): { success: boolean } {
  const travelStartMs = travelStart.getTime();
  const bufferMs = bufferTimeMinutes * 60000;

  const slotIndex = availableSlots.findIndex(
    (slot) =>
      slot.start.getTime() - bufferMs <= travelStartMs &&
      slot.end.getTime() > travelStartMs,
  );
  if (slotIndex === -1) return { success: false };

  const slot = availableSlots[slotIndex];
  const travelEnd = slot.end;
  const travelEndMs = travelEnd.getTime();

  if (travelStartMs >= travelEndMs) return { success: false };

  const newSlots: (AvailableSlot | TravelSlot)[] = [];

  if (travelStartMs > slot.start.getTime()) {
    newSlots.push({
      start: slot.start,
      end: travelStart,
      durationMinutes: Math.floor((travelStartMs - slot.start.getTime()) / 60000),
      isAvailable: true,
      prevLocationId: slot.prevLocationId,
      nextLocationId: fromLocationId,
    });
  }

  newSlots.push(
    createTravelSlot(travelStart, travelEnd, fromLocationId, toLocationId, "outbound", uuidv4(), {
      insufficientTravel: true,
      requiredTravelMinutes,
    }),
  );

  availableSlots.splice(slotIndex, 1, ...newSlots.filter((s): s is AvailableSlot => s.isAvailable));
  occupiedSlots.push(...newSlots.filter((s): s is TravelSlot => !s.isAvailable));

  return { success: true };
}
