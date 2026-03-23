import { TimeSlot } from "../../models/TimeSlot";
import { isTravelSlot } from "../../utils/timeSlotUtils";

export function getAllTravelSlots(occupiedSlots: Map<string, TimeSlot[]>): TimeSlot[] {
  const travelSlots: TimeSlot[] = [];
  for (const slots of occupiedSlots.values()) {
    for (const slot of slots) {
      if (isTravelSlot(slot)) {
        travelSlots.push(slot);
      }
    }
  }
  return travelSlots;
}
