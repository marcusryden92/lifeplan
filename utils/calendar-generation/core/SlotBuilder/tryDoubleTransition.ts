import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlot, TimeSlotUtils } from "../../models/TimeSlot";
import { TravelManager } from "../TravelManager";
import { v4 as uuidv4 } from "uuid";

export function tryDoubleTransition(
  categoryPeriods: CategoryPeriod[],
  travelManager: TravelManager,
  slot: TimeSlot,
  prevLoc: string,
  nextLoc: string,
  occupiedSlots: TimeSlot[],
  result: TimeSlot[],
): { handled: boolean; catLoc?: string } {
  const categoryPeriod = categoryPeriods.find(
    (p) => p.categoryId === slot.categoryId,
  );
  const catLoc = categoryPeriod?.locationId ?? null;
  if (!catLoc || prevLoc === catLoc || nextLoc === catLoc)
    return { handled: false };

  const travelBeforeMinutes = travelManager.getTravelTime(
    prevLoc,
    catLoc,
    slot.start,
  );
  const travelAfterMinutes = travelManager.getTravelTime(
    catLoc,
    nextLoc,
    slot.end,
  );
  const travelBeforeMs = travelBeforeMinutes * 60000;
  const travelAfterMs = travelAfterMinutes * 60000;
  const slotMs = slot.end.getTime() - slot.start.getTime();

  if (travelBeforeMs + travelAfterMs > slotMs) return { handled: false };

  const travelBeforeEnd = new Date(slot.start.getTime() + travelBeforeMs);
  occupiedSlots.push(
    TimeSlotUtils.createTravelSlot(
      slot.start,
      travelBeforeEnd,
      prevLoc,
      catLoc,
      "preliminary",
      uuidv4(),
    ),
  );

  const travelAfterStart = new Date(slot.end.getTime() - travelAfterMs);
  occupiedSlots.push(
    TimeSlotUtils.createTravelSlot(
      travelAfterStart,
      slot.end,
      catLoc,
      nextLoc,
      "preliminary",
      uuidv4(),
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
      prevLocationId: catLoc,
      nextLocationId: catLoc,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    });
  }
  return { handled: true, catLoc };
}
