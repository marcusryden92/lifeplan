import { TimeSlot } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";

export function getDaySlots(
  availableSlots: Map<string, TimeSlot[]>,
  date: Date,
): TimeSlot[] {
  const dayKey = dateTimeService.getDayKey(date);
  return availableSlots.get(dayKey) || [];
}
