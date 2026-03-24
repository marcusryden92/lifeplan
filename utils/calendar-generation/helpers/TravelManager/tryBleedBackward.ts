import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

export function tryBleedBackward(
  slot: AvailableSlot,
  prevLoc: string,
  nextLoc: string,
  travelMinutes: number,
  bufferMs: number,
  requireSlotCategoryId: boolean,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): boolean {
  const lastResult = result.length > 0 ? result[result.length - 1] : null;
  const newTravelEnd = new Date(slot.end.getTime() - bufferMs);
  const newTravelStart = new Date(
    newTravelEnd.getTime() - travelMinutes * 60000,
  );
  const canBleed = !!(
    lastResult?.isAvailable &&
    lastResult.end.getTime() + bufferMs >= slot.start.getTime() &&
    newTravelStart.getTime() >= lastResult.start.getTime()
  );

  if (!canBleed) return false;

  // After canBleed check, lastResult is guaranteed to be an AvailableSlot
  const lastAvail = lastResult;

  if (!slot.categoryId && lastAvail.categoryId) {
    occupiedSlots.push(
      createTravelSlot(
        newTravelStart,
        newTravelEnd,
        prevLoc,
        nextLoc,
        "preliminary",
        uuidv4(),
        {
          categoryId: lastAvail.categoryId,
          isStrictCategory: lastAvail.isStrictCategory,
        },
      ),
    );
    const newCatEnd = new Date(newTravelStart.getTime() - bufferMs);
    if (newCatEnd.getTime() > lastAvail.start.getTime()) {
      result[result.length - 1] = {
        ...lastAvail,
        end: newCatEnd,
        durationMinutes: Math.floor(
          (newCatEnd.getTime() - lastAvail.start.getTime()) / 60000,
        ),
      };
    } else {
      result.pop();
    }
    return true;
  }

  if (!requireSlotCategoryId || slot.categoryId) {
    occupiedSlots.push(
      createTravelSlot(
        newTravelStart,
        newTravelEnd,
        prevLoc,
        nextLoc,
        "preliminary",
        uuidv4(),
        {
          categoryId: slot.categoryId,
          isStrictCategory: slot.isStrictCategory,
        },
      ),
    );
    const newLastEnd = new Date(newTravelStart.getTime() - bufferMs);
    if (newLastEnd.getTime() > lastAvail.start.getTime()) {
      result[result.length - 1] = {
        ...lastAvail,
        end: newLastEnd,
        durationMinutes: Math.floor(
          (newLastEnd.getTime() - lastAvail.start.getTime()) / 60000,
        ),
      };
    } else {
      result.pop();
    }
    return true;
  }

  return false;
}
