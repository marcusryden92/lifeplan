import { TimeSlot, TimeSlotUtils } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";
import { v4 as uuidv4 } from "uuid";

export function reserveInsufficientTravelAfter(
  availableSlots: Map<string, TimeSlot[]>,
  occupiedSlots: Map<string, TimeSlot[]>,
  bufferTimeMinutes: number,
  travelStart: Date,
  requiredTravelMinutes: number,
  fromLocationId: string,
  toLocationId: string,
): { success: boolean } {
  const dayKey = dateTimeService.getDayKey(travelStart);
  const slots = availableSlots.get(dayKey);
  if (!slots) return { success: false };

  const travelStartMs = travelStart.getTime();
  const bufferMs = bufferTimeMinutes * 60000;

  const slotIndex = slots.findIndex(
    (slot) =>
      slot.isAvailable &&
      slot.start.getTime() - bufferMs <= travelStartMs &&
      slot.end.getTime() > travelStartMs,
  );
  if (slotIndex === -1) return { success: false };

  const slot = slots[slotIndex];

  const travelEnd = slot.end;
  const travelEndMs = travelEnd.getTime();

  if (travelStartMs >= travelEndMs) return { success: false };

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
    {
      insufficientTravel: true,
      requiredTravelMinutes,
    },
  );
  newSlots.push(travelSlot);

  const availableNewSlots = newSlots.filter((s) => s.isAvailable);
  slots.splice(slotIndex, 1, ...availableNewSlots);

  const occupied = occupiedSlots.get(dayKey) || [];
  occupied.push(...newSlots.filter((s) => !s.isAvailable));
  occupiedSlots.set(dayKey, occupied);

  return { success: true };
}
