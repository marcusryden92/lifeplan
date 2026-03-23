import { TimeSlot } from "../../models/TimeSlot";
import { isTravelSlot } from "../../utils/timeSlotUtils";

export function getAllTravelSlots(occupiedSlots: TimeSlot[]): TimeSlot[] {
  return occupiedSlots.filter(isTravelSlot);
}
