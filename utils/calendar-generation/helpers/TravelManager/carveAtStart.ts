import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

export function carveAtStart(
  slot: AvailableSlot,
  prevLoc: string,
  nextLoc: string,
  travelMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): void {
  const travelMs = travelMinutes * 60000;
  const travelEnd = new Date(slot.start.getTime() + travelMs);

  if (travelEnd.getTime() <= slot.end.getTime()) {
    occupiedSlots.push(
      createTravelSlot(
        slot.start,
        travelEnd,
        prevLoc,
        nextLoc,
        "preliminary",
        uuidv4(),
      ),
    );
    const availableStartMs = travelEnd.getTime();
    if (availableStartMs < slot.end.getTime()) {
      result.push({
        start: new Date(availableStartMs),
        end: slot.end,
        durationMinutes: Math.floor(
          (slot.end.getTime() - availableStartMs) / 60000,
        ),
        isAvailable: true,
        prevLocationId: nextLoc,
        nextLocationId: slot.nextLocationId,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
      });
    }
  } else {
    occupiedSlots.push(
      createTravelSlot(
        slot.start,
        slot.end,
        prevLoc,
        nextLoc,
        "preliminary",
        uuidv4(),
        { insufficientTravel: true, requiredTravelMinutes: travelMinutes },
      ),
    );
  }
}
