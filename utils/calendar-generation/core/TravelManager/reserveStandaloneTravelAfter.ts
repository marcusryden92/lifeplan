import { TimeSlot, TimeSlotUtils } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";
import { v4 as uuidv4 } from "uuid";

export function reserveStandaloneTravelAfter(
  availableSlots: Map<string, TimeSlot[]>,
  occupiedSlots: Map<string, TimeSlot[]>,
  bufferTimeMinutes: number,
  travelStart: Date,
  travelMinutes: number,
  fromLocationId: string,
  toLocationId: string,
  force: boolean = false,
): { success: boolean } {
  const dayKey = dateTimeService.getDayKey(travelStart);
  const travelStartMs = travelStart.getTime();
  const travelEnd = new Date(travelStartMs + travelMinutes * 60000);
  const travelEndMs = travelEnd.getTime();

  if (force) {
    const travelSlot = TimeSlotUtils.createTravelSlot(
      travelStart,
      travelEnd,
      fromLocationId,
      toLocationId,
      "outbound",
      uuidv4(),
    );
    const occupied = occupiedSlots.get(dayKey) || [];
    occupied.push(travelSlot);
    occupiedSlots.set(dayKey, occupied);

    const slots = availableSlots.get(dayKey);
    if (slots) {
      const newSlots: TimeSlot[] = [];
      for (const slot of slots) {
        if (!slot.isAvailable) {
          newSlots.push(slot);
          continue;
        }
        const slotStartMs = slot.start.getTime();
        const slotEndMs = slot.end.getTime();

        if (slotEndMs <= travelStartMs || slotStartMs >= travelEndMs) {
          newSlots.push(slot);
          continue;
        }

        if (slotStartMs < travelStartMs) {
          newSlots.push({
            ...slot,
            end: travelStart,
            durationMinutes: Math.floor(
              (travelStartMs - slotStartMs) / 60000,
            ),
          });
        }

        if (slotEndMs > travelEndMs) {
          newSlots.push({
            ...slot,
            start: travelEnd,
            durationMinutes: Math.floor((slotEndMs - travelEndMs) / 60000),
            prevLocationId: toLocationId,
          });
        }
      }
      availableSlots.set(dayKey, newSlots);
    }

    return { success: true };
  }

  const slots = availableSlots.get(dayKey);
  if (!slots) return { success: false };

  const bufferMs = bufferTimeMinutes * 60000;
  const slotIndex = slots.findIndex(
    (slot) =>
      slot.isAvailable &&
      slot.start.getTime() - bufferMs <= travelStartMs &&
      slot.end.getTime() >= travelEndMs,
  );
  if (slotIndex === -1) return { success: false };

  const slot = slots[slotIndex];
  const newSlots: TimeSlot[] = [];

  if (travelStartMs > slot.start.getTime()) {
    newSlots.push({
      start: slot.start,
      end: travelStart,
      durationMinutes: Math.floor(
        (travelStartMs - slot.start.getTime()) / 60000,
      ),
      isAvailable: true,
      prevLocationId: slot.prevLocationId,
      nextLocationId: fromLocationId,
    });
  }

  const travelSlot = TimeSlotUtils.createTravelSlot(
    travelStart,
    travelEnd,
    fromLocationId,
    toLocationId,
    "outbound",
    uuidv4(),
  );
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

  const availableNewSlots = newSlots.filter((s) => s.isAvailable);
  slots.splice(slotIndex, 1, ...availableNewSlots);

  const occupied = occupiedSlots.get(dayKey) || [];
  occupied.push(...newSlots.filter((s) => !s.isAvailable));
  occupiedSlots.set(dayKey, occupied);

  return { success: true };
}
