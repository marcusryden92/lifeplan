import { TimeSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

export function reserveStandaloneTravelBefore(
  availableSlots: TimeSlot[],
  occupiedSlots: TimeSlot[],
  bufferTimeMinutes: number,
  travelEnd: Date,
  travelMinutes: number,
  fromLocationId: string,
  toLocationId: string,
  force: boolean = false,
): { success: boolean } {
  const travelEndMs = travelEnd.getTime();
  const travelStart = new Date(travelEndMs - travelMinutes * 60000);
  const travelStartMs = travelStart.getTime();

  const travelSlot = createTravelSlot(
    travelStart,
    travelEnd,
    fromLocationId,
    toLocationId,
    "inbound",
    uuidv4(),
  );

  if (force) {
    occupiedSlots.push(travelSlot);

    for (let i = availableSlots.length - 1; i >= 0; i--) {
      const slot = availableSlots[i];
      if (!slot.isAvailable) continue;
      const slotStartMs = slot.start.getTime();
      const slotEndMs = slot.end.getTime();
      if (slotEndMs <= travelStartMs || slotStartMs >= travelEndMs) continue;

      const replacements: TimeSlot[] = [];
      if (slotStartMs < travelStartMs) {
        replacements.push({
          ...slot,
          end: travelStart,
          durationMinutes: Math.floor((travelStartMs - slotStartMs) / 60000),
        });
      }
      if (slotEndMs > travelEndMs) {
        replacements.push({
          ...slot,
          start: travelEnd,
          durationMinutes: Math.floor((slotEndMs - travelEndMs) / 60000),
          prevLocationId: toLocationId,
        });
      }
      availableSlots.splice(i, 1, ...replacements);
    }

    return { success: true };
  }

  const bufferMs = bufferTimeMinutes * 60000;
  const slotIndex = availableSlots.findIndex(
    (slot) =>
      slot.isAvailable &&
      slot.start.getTime() - bufferMs <= travelStartMs &&
      slot.end.getTime() >= travelEndMs,
  );
  if (slotIndex === -1) return { success: false };

  const slot = availableSlots[slotIndex];
  const newSlots: TimeSlot[] = [];

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

  newSlots.push(travelSlot);

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
