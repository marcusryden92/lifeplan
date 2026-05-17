import { Slot, TravelSlot } from "../../models/TimeSlot";

export function getAllTravelSlots(slots: Slot[]): TravelSlot[] {
  return slots.filter((s): s is TravelSlot => s.type === "travel");
}
