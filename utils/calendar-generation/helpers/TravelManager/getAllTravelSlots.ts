import { OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { isTravelSlot } from "../../utils/timeSlotUtils";

export function getAllTravelSlots(occupiedSlots: (OccupiedSlot | TravelSlot)[]): TravelSlot[] {
  return occupiedSlots.filter(isTravelSlot);
}
