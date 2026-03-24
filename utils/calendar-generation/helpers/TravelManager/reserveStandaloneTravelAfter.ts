import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

export function reserveStandaloneTravelAfter(
  availableSlots: AvailableSlot[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  bufferTimeMinutes: number,
  travelStart: Date,
  travelMinutes: number,
  fromLocationId: string,
  toLocationId: string,
  force: boolean = false,
): { success: boolean } {
  const travelStartMs = travelStart.getTime();
  const travelEnd = new Date(travelStartMs + travelMinutes * 60000);
  const travelEndMs = travelEnd.getTime();

  const travelSlot = createTravelSlot(
    travelStart,
    travelEnd,
    fromLocationId,
    toLocationId,
    "outbound",
    uuidv4(),
  );

  if (force) {
    occupiedSlots.push(travelSlot);

    for (let i = availableSlots.length - 1; i >= 0; i--) {
      const slot = availableSlots[i];
      const slotStartMs = slot.start.getTime();
      const slotEndMs = slot.end.getTime();
      if (slotEndMs <= travelStartMs || slotStartMs >= travelEndMs) continue;

      const replacements: AvailableSlot[] = [];
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
      slot.start.getTime() - bufferMs <= travelStartMs &&
      slot.end.getTime() >= travelEndMs,
  );
  if (slotIndex === -1) return { success: false };

  const slot = availableSlots[slotIndex];
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

  availableSlots.splice(slotIndex, 1, ...newSlots.filter((s): s is AvailableSlot => s.isAvailable));
  occupiedSlots.push(...newSlots.filter((s): s is TravelSlot => !s.isAvailable));

  return { success: true };
}
