import { TimeSlot, TimeSlotUtils } from "../../models/TimeSlot";
import { v4 as uuidv4 } from "uuid";

export function tryBleedBackward(
  slot: TimeSlot,
  prevLoc: string,
  nextLoc: string,
  travelMinutes: number,
  bufferMs: number,
  requireSlotCategoryId: boolean,
  occupiedSlots: TimeSlot[],
  result: TimeSlot[],
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

  if (!slot.categoryId && lastResult?.categoryId) {
    occupiedSlots.push(
      TimeSlotUtils.createTravelSlot(
        newTravelStart,
        newTravelEnd,
        prevLoc,
        nextLoc,
        "preliminary",
        uuidv4(),
      ),
    );
    const newCatEnd = new Date(newTravelStart.getTime() - bufferMs);
    if (newCatEnd.getTime() > lastResult.start.getTime()) {
      result[result.length - 1] = {
        ...lastResult,
        end: newCatEnd,
        durationMinutes: Math.floor(
          (newCatEnd.getTime() - lastResult.start.getTime()) / 60000,
        ),
      };
    } else {
      result.pop();
    }
    return true;
  }

  if (!requireSlotCategoryId || slot.categoryId) {
    occupiedSlots.push(
      TimeSlotUtils.createTravelSlot(
        newTravelStart,
        newTravelEnd,
        prevLoc,
        nextLoc,
        "preliminary",
        uuidv4(),
      ),
    );
    const newLastEnd = new Date(newTravelStart.getTime() - bufferMs);
    if (newLastEnd.getTime() > lastResult!.start.getTime()) {
      result[result.length - 1] = {
        ...lastResult!,
        end: newLastEnd,
        durationMinutes: Math.floor(
          (newLastEnd.getTime() - lastResult!.start.getTime()) / 60000,
        ),
      };
    } else {
      result.pop();
    }
    return true;
  }

  return false;
}
