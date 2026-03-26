import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { TravelManager } from "../../core/TravelManager";
import { v4 as uuidv4 } from "uuid";

export function attemptReturnAbsorption(
  travelManager: TravelManager,
  slot: AvailableSlot,
  nextSlot: AvailableSlot | null,
  prevLocation: string,
  nextLocation: string,
  travelMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): { handled: boolean; skipNext?: boolean } {
  if (
    travelMinutes < slot.durationMinutes ||
    !nextSlot ||
    nextSlot.categoryId ||
    nextSlot.start.getTime() !== slot.end.getTime() ||
    nextSlot.prevLocationId !== nextLocation ||
    !nextSlot.nextLocationId
  ) {
    return { handled: false };
  }

  const dLocation = nextSlot.nextLocationId;
  const directMinutes = travelManager.getTravelTime(
    prevLocation,
    dLocation,
    slot.start,
  );
  const spanEnd = nextSlot.end;
  const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);

  if (travelEnd.getTime() <= spanEnd.getTime()) {
    occupiedSlots.push(
      createTravelSlot(
        slot.start,
        travelEnd,
        prevLocation,
        dLocation,
        "preliminary",
        uuidv4(),
        {
          categoryId: slot.categoryId,
          isStrictCategory: slot.isStrictCategory,
        },
      ),
    );
    const availStart = new Date(travelEnd.getTime());
    if (availStart.getTime() < spanEnd.getTime()) {
      result.push({
        start: availStart,
        end: spanEnd,
        durationMinutes: Math.floor(
          (spanEnd.getTime() - availStart.getTime()) / 60000,
        ),
        isAvailable: true,
        prevLocationId: dLocation,
        nextLocationId: nextSlot.nextLocationId,
        categoryId: null,
        isStrictCategory: false,
      });
    }
  } else {
    occupiedSlots.push(
      createTravelSlot(
        slot.start,
        spanEnd,
        prevLocation,
        dLocation,
        "preliminary",
        uuidv4(),
        {
          insufficientTravel: true,
          requiredTravelMinutes: directMinutes,
          categoryId: slot.categoryId,
          isStrictCategory: slot.isStrictCategory,
        },
      ),
    );
  }
  return { handled: true, skipNext: true };
}
