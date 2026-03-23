import { TimeSlot, TimeSlotUtils } from "../../models/TimeSlot";

export function getAllTravelSlots(occupiedSlots: Map<string, TimeSlot[]>): TimeSlot[] {
  const travelSlots: TimeSlot[] = [];
  for (const slots of occupiedSlots.values()) {
    for (const slot of slots) {
      if (TimeSlotUtils.isTravelSlot(slot)) {
        travelSlots.push(slot);
      }
    }
  }
  return travelSlots;
}
