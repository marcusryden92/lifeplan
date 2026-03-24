import { CategoryPeriod } from "@/types/categoryTypes";
import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { TravelManager } from "../../core/TravelManager";
import { v4 as uuidv4 } from "uuid";

export function tryDoubleTransition(
  categoryPeriods: CategoryPeriod[],
  travelManager: TravelManager,
  slot: AvailableSlot,
  prevLocation: string,
  nextLocation: string,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): { handled: boolean; categoryLocation?: string } {
  const categoryPeriod = categoryPeriods.find(
    (p) => p.categoryId === slot.categoryId,
  );
  const categoryLocation = categoryPeriod?.locationId ?? null;
  if (
    !categoryLocation ||
    prevLocation === categoryLocation ||
    nextLocation === categoryLocation
  )
    return { handled: false };

  const travelBeforeMinutes = travelManager.getTravelTime(
    prevLocation,
    categoryLocation,
    slot.start,
  );
  const travelAfterMinutes = travelManager.getTravelTime(
    categoryLocation,
    nextLocation,
    slot.end,
  );
  const travelBeforeMs = travelBeforeMinutes * 60000;
  const travelAfterMs = travelAfterMinutes * 60000;
  const slotMs = slot.end.getTime() - slot.start.getTime();

  if (travelBeforeMs + travelAfterMs > slotMs) return { handled: false };

  const travelBeforeEnd = new Date(slot.start.getTime() + travelBeforeMs);
  occupiedSlots.push(
    createTravelSlot(
      slot.start,
      travelBeforeEnd,
      prevLocation,
      categoryLocation,
      "preliminary",
      uuidv4(),
      { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
    ),
  );

  const travelAfterStart = new Date(slot.end.getTime() - travelAfterMs);
  occupiedSlots.push(
    createTravelSlot(
      travelAfterStart,
      slot.end,
      categoryLocation,
      nextLocation,
      "preliminary",
      uuidv4(),
      { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
    ),
  );

  const availStart = new Date(travelBeforeEnd.getTime());
  const availEnd = new Date(travelAfterStart.getTime());
  if (availEnd.getTime() > availStart.getTime()) {
    result.push({
      start: availStart,
      end: availEnd,
      durationMinutes: Math.floor(
        (availEnd.getTime() - availStart.getTime()) / 60000,
      ),
      isAvailable: true,
      prevLocationId: categoryLocation,
      nextLocationId: categoryLocation,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    });
  }
  return { handled: true, categoryLocation };
}
