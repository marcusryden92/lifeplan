import { AvailableSlot, Slot } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";

export function getDaySlots(slots: Slot[], date: Date): AvailableSlot[] {
  const dayStart = dateTimeService.startOfDay(date);
  const dayEnd = dateTimeService.endOfDay(date);
  return slots.filter(
    (slot): slot is AvailableSlot =>
      slot.type === "available" && slot.start < dayEnd && slot.end > dayStart,
  );
}
