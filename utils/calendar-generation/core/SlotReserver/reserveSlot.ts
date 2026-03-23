import { TimeSlot, TimeSlotUtils } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";

export function reserveSlot(
  availableSlots: Map<string, TimeSlot[]>,
  occupiedSlots: Map<string, TimeSlot[]>,
  start: Date,
  end: Date,
  eventId: string,
  eventType: "task" | "goal" | "plan" | "template" | "travel",
  locationId?: string | null,
): boolean {
  const dayKey = dateTimeService.getDayKey(start);
  const slots = availableSlots.get(dayKey);

  if (!slots) return false;

  const startTime = start.getTime();
  const endTime = end.getTime();

  const slotIndex = slots.findIndex(
    (slot) =>
      slot.isAvailable &&
      slot.start.getTime() <= startTime &&
      slot.end.getTime() >= endTime,
  );

  if (slotIndex === -1) return false;

  const slot = slots[slotIndex];

  const newSlots = TimeSlotUtils.occupySlot(
    slot,
    start,
    end,
    eventId,
    eventType,
    locationId,
  );

  const availableNewSlots = newSlots.filter((s) => s.isAvailable);
  slots.splice(slotIndex, 1, ...availableNewSlots);

  const occupied = occupiedSlots.get(dayKey) || [];
  occupied.push(...newSlots.filter((s) => !s.isAvailable));
  occupiedSlots.set(dayKey, occupied);

  return true;
}
