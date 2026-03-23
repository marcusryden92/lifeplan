import { TimeSlot } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";

export function getDaySlots(availableSlots: TimeSlot[], date: Date): TimeSlot[] {
  const dayStart = dateTimeService.startOfDay(date);
  const dayEnd = dateTimeService.endOfDay(date);
  return availableSlots.filter(
    (slot) => slot.start < dayEnd && slot.end > dayStart,
  );
}
