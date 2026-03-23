import { TimeSlot, TimeSlotUtils } from "../../models/TimeSlot";
import { TravelManager } from "../TravelManager";
import { v4 as uuidv4 } from "uuid";

export function tryReturnAbsorption(
  travelManager: TravelManager,
  slot: TimeSlot,
  nextSlot: TimeSlot | null,
  prevLoc: string,
  nextLoc: string,
  travelMinutes: number,
  occupiedSlots: TimeSlot[],
  result: TimeSlot[],
): { handled: boolean; skipNext?: boolean } {
  if (
    travelMinutes < slot.durationMinutes ||
    !nextSlot?.isAvailable ||
    nextSlot.categoryId ||
    nextSlot.start.getTime() !== slot.end.getTime() ||
    nextSlot.prevLocationId !== nextLoc ||
    !nextSlot.nextLocationId
  ) {
    return { handled: false };
  }

  const dLoc = nextSlot.nextLocationId;
  const directMinutes = travelManager.getTravelTime(
    prevLoc,
    dLoc,
    slot.start,
  );
  const spanEnd = nextSlot.end;
  const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);

  if (travelEnd.getTime() <= spanEnd.getTime()) {
    occupiedSlots.push(
      TimeSlotUtils.createTravelSlot(
        slot.start,
        travelEnd,
        prevLoc,
        dLoc,
        "preliminary",
        uuidv4(),
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
        prevLocationId: dLoc,
        nextLocationId: nextSlot.nextLocationId,
        categoryId: null,
        isStrictCategory: false,
      });
    }
  } else {
    occupiedSlots.push(
      TimeSlotUtils.createTravelSlot(
        slot.start,
        spanEnd,
        prevLoc,
        dLoc,
        "preliminary",
        uuidv4(),
        { insufficientTravel: true, requiredTravelMinutes: directMinutes },
      ),
    );
  }
  return { handled: true, skipNext: true };
}
