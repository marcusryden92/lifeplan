import { Slot } from "../../models/TimeSlot";
import { getDaySlots } from "./getDaySlots";

export function getDayAvailableMinutes(slots: Slot[], date: Date): number {
  const daySlots = getDaySlots(slots, date);
  return daySlots.reduce((total, slot) => total + slot.durationMinutes, 0);
}
