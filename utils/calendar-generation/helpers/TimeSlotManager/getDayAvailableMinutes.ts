import { AvailableSlot } from "../../models/TimeSlot";
import { getDaySlots } from "./getDaySlots";

export function getDayAvailableMinutes(
  availableSlots: AvailableSlot[],
  date: Date,
): number {
  const slots = getDaySlots(availableSlots, date);
  return slots.reduce((total, slot) => total + slot.durationMinutes, 0);
}
