import { TimeSlot } from "../../models/TimeSlot";
import { occupySlot } from "../../utils/timeSlotUtils";

export function reserveSlot(
  availableSlots: TimeSlot[],
  occupiedSlots: TimeSlot[],
  start: Date,
  end: Date,
  eventId: string,
  eventType: "task" | "goal" | "plan" | "template" | "travel",
  locationId?: string | null,
): boolean {
  const startTime = start.getTime();
  const endTime = end.getTime();

  const slotIndex = availableSlots.findIndex(
    (slot) =>
      slot.isAvailable &&
      slot.start.getTime() <= startTime &&
      slot.end.getTime() >= endTime,
  );

  if (slotIndex === -1) return false;

  const slot = availableSlots[slotIndex];
  const newSlots = occupySlot(slot, start, end, eventId, eventType, locationId);

  availableSlots.splice(slotIndex, 1, ...newSlots.filter((s) => s.isAvailable));
  occupiedSlots.push(...newSlots.filter((s) => !s.isAvailable));

  return true;
}
