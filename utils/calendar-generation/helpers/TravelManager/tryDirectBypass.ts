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
  prevLocation: string,
  nextLocation: string,
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

  const bLocation = nextSlot.nextLocationId;
  const travelCatToB = travelManager.getTravelTime(
    nextLocation,
    bLocation,
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
      prevLocation,
      bLocation,
      spanEnd,
    );
    const travelStart = new Date(spanEnd.getTime() - directMinutes * 60000);
    if (travelStart.getTime() >= slot.start.getTime()) {
      occupiedSlots.push(
        createTravelSlot(
          travelStart,
          spanEnd,
          prevLocation,
          bLocation,
          "preliminary",
          uuidv4(),
          {
            categoryId: slot.categoryId,
            isStrictCategory: slot.isStrictCategory,
          },
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
          nextLocationId: bLocation,
          categoryId: slot.categoryId,
          isStrictCategory: slot.isStrictCategory,
        });
      }
    } else {
      occupiedSlots.push(
        createTravelSlot(
          slot.start,
          spanEnd,
          prevLocation,
          bLocation,
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
  } else {
    const directMinutes = travelManager.getTravelTime(
      prevLocation,
      bLocation,
      slot.start,
    );
    const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);
    if (travelEnd.getTime() <= spanEnd.getTime()) {
      occupiedSlots.push(
        createTravelSlot(
          slot.start,
          travelEnd,
          prevLocation,
          bLocation,
          "preliminary",
          uuidv4(),
          {
            categoryId: slot.categoryId,
            isStrictCategory: slot.isStrictCategory,
          },
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
          prevLocationId: bLocation,
        };
        return { handled: true, skipNext: false };
      }
    } else {
      occupiedSlots.push(
        createTravelSlot(
          slot.start,
          spanEnd,
          prevLocation,
          bLocation,
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
}
