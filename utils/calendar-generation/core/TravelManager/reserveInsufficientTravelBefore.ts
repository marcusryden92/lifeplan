import { TimeSlot, TimeSlotUtils } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";
import { v4 as uuidv4 } from "uuid";

export function reserveInsufficientTravelBefore(
  availableSlots: Map<string, TimeSlot[]>,
  occupiedSlots: Map<string, TimeSlot[]>,
  bufferTimeMinutes: number,
  travelEnd: Date,
  requiredTravelMinutes: number,
  fromLocationId: string,
  toLocationId: string,
): { success: boolean } {
  const dayKey = dateTimeService.getDayKey(travelEnd);
  const slots = availableSlots.get(dayKey);
  if (!slots) return { success: false };

  const travelEndMs = travelEnd.getTime();
  const bufferMs = bufferTimeMinutes * 60000;

  const slotIndex = slots.findIndex(
    (slot) => slot.isAvailable && slot.end.getTime() >= travelEndMs,
  );
  if (slotIndex === -1) return { success: false };

  const slot = slots[slotIndex];

  const travelStart = new Date(slot.start.getTime() - bufferMs);
  const travelStartMs = travelStart.getTime();

  if (travelStartMs >= travelEndMs) return { success: false };

  const newSlots: TimeSlot[] = [];

  const travelSlot = TimeSlotUtils.createTravelSlot(
    travelStart,
    travelEnd,
    fromLocationId,
    toLocationId,
    "inbound",
    uuidv4(),
    {
      insufficientTravel: true,
      requiredTravelMinutes,
    },
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
