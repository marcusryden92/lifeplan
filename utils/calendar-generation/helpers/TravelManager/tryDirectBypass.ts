import { CategoryPeriod } from "@/types/categoryTypes";
import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { TravelManager } from "../../core/TravelManager";
import { v4 as uuidv4 } from "uuid";

export function tryDirectBypass(
  categoryPeriods: CategoryPeriod[],
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  slot: AvailableSlot,
  nextSlot: AvailableSlot | null,
  slots: AvailableSlot[],
  slotIndex: number,
  prevLoc: string,
  nextLoc: string,
  travelMinutes: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): { handled: boolean; skipNext?: boolean } {
  const catPeriodEnd = nextSlot?.categoryId
    ? categoryPeriods.find(
        (p) =>
          p.categoryId === nextSlot.categoryId &&
          p.start.getTime() <= nextSlot.start.getTime() &&
          p.end.getTime() >= nextSlot.end.getTime(),
      )?.end
    : undefined;
  const nextLocIsInsideCatB =
    catPeriodEnd !== undefined &&
    nextSlot!.end.getTime() < catPeriodEnd.getTime();

  if (
    !nextLocIsInsideCatB ||
    !nextSlot?.categoryId ||
    nextSlot.start.getTime() !== slot.end.getTime() ||
    !nextSlot.nextLocationId ||
    nextSlot.nextLocationId === nextLoc
  ) {
    return { handled: false };
  }

  const bLoc = nextSlot.nextLocationId;
  const travelCatToB = travelManager.getTravelTime(
    nextLoc,
    bLoc,
    nextSlot.end,
  );
  if (travelCatToB <= 0) return { handled: false };

  const catSlotTooSmall = travelCatToB > nextSlot.durationMinutes;
  const availableMinutes = slot.durationMinutes + nextSlot.durationMinutes;
  const combinedTooSmall =
    travelMinutes + bufferTimeMinutes + travelCatToB > availableMinutes;

  if (!catSlotTooSmall && !combinedTooSmall) return { handled: false };

  const spanEnd = nextSlot.end;

  if (catSlotTooSmall) {
    const directMinutes = travelManager.getTravelTime(
      prevLoc,
      bLoc,
      spanEnd,
    );
    const travelStart = new Date(spanEnd.getTime() - directMinutes * 60000);
    if (travelStart.getTime() >= slot.start.getTime()) {
      occupiedSlots.push(
        createTravelSlot(
          travelStart,
          spanEnd,
          prevLoc,
          bLoc,
          "preliminary",
          uuidv4(),
          { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
        ),
      );
      const availEnd = new Date(travelStart.getTime());
      if (availEnd.getTime() > slot.start.getTime()) {
        result.push({
          start: slot.start,
          end: availEnd,
          durationMinutes: Math.floor(
            (availEnd.getTime() - slot.start.getTime()) / 60000,
          ),
          isAvailable: true,
          prevLocationId: slot.prevLocationId,
          nextLocationId: bLoc,
          categoryId: slot.categoryId,
          isStrictCategory: slot.isStrictCategory,
        });
      }
    } else {
      occupiedSlots.push(
        createTravelSlot(
          slot.start,
          spanEnd,
          prevLoc,
          bLoc,
          "preliminary",
          uuidv4(),
          { insufficientTravel: true, requiredTravelMinutes: directMinutes, categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
        ),
      );
    }
    return { handled: true, skipNext: true };
  } else {
    const directMinutes = travelManager.getTravelTime(
      prevLoc,
      bLoc,
      slot.start,
    );
    const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);
    if (travelEnd.getTime() <= spanEnd.getTime()) {
      occupiedSlots.push(
        createTravelSlot(
          slot.start,
          travelEnd,
          prevLoc,
          bLoc,
          "preliminary",
          uuidv4(),
          { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
        ),
      );
      const newCatStart = new Date(travelEnd.getTime());
      if (newCatStart.getTime() < spanEnd.getTime()) {
        slots[slotIndex + 1] = {
          ...nextSlot,
          start: newCatStart,
          durationMinutes: Math.floor(
            (spanEnd.getTime() - newCatStart.getTime()) / 60000,
          ),
          prevLocationId: bLoc,
        };
        return { handled: true, skipNext: false };
      }
    } else {
      occupiedSlots.push(
        createTravelSlot(
          slot.start,
          spanEnd,
          prevLoc,
          bLoc,
          "preliminary",
          uuidv4(),
          { insufficientTravel: true, requiredTravelMinutes: directMinutes, categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
        ),
      );
    }
    return { handled: true, skipNext: true };
  }
}
