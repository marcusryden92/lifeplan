import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { occupySlot } from "../../utils/timeSlotUtils";
import { ItemType } from "@/types/prisma";

export function reserveSlot(
  availableSlots: AvailableSlot[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  start: Date,
  end: Date,
  eventId: string,
  eventType: Exclude<ItemType, "travel" | "category">,
  locationId?: string | null,
): boolean {
  const startTime = start.getTime();
  const endTime = end.getTime();

  const slotIndex = availableSlots.findIndex(
    (slot) =>
      slot.start.getTime() <= startTime &&
      slot.end.getTime() >= endTime,
  );

  if (slotIndex === -1) return false;

  const slot = availableSlots[slotIndex];
  const newSlots = occupySlot(slot, start, end, eventId, eventType, locationId);

  availableSlots.splice(slotIndex, 1, ...newSlots.filter((s): s is AvailableSlot => s.isAvailable));
  occupiedSlots.push(...newSlots.filter((s): s is OccupiedSlot => !s.isAvailable));

  return true;
}
