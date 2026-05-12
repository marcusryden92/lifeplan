import { AvailableSlot, OccupiedSlot, TravelSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";

/**
 * Extension strategies — fallback options when travel doesn't fit cleanly in
 * its own slot. Each one modifies already-emitted state (the result array or
 * the slots array) to make room.
 */

/**
 * Shifts a travel block backward into the previous available slot in
 * `result`. The previous slot is shrunk (or removed) to make room and buffer.
 * Used by:
 *  - "Travel exactly fills slot" optimization (free try to preserve leftover)
 *  - "Travel exceeds slot" last resort
 *
 * `allowAcrossUnrelatedSlots` is the only parameter that distinguishes the
 * two use sites: the optimization may extend freely; the last resort refuses
 * when neither slot is part of a category, to avoid stretching travel across
 * unrelated regions.
 *
 * Returns true if the travel was shifted, false otherwise.
 */
export function tryShiftTravelBackward(
  slot: AvailableSlot,
  previousLocation: string,
  nextLocation: string,
  travelMinutes: number,
  bufferMilliseconds: number,
  allowAcrossUnrelatedSlots: boolean,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  result: AvailableSlot[],
): boolean {
  const previousSlot = result[result.length - 1] ?? null;
  if (!previousSlot?.isAvailable) return false;

  const newTravelEnd = new Date(slot.end.getTime() - bufferMilliseconds);
  const newTravelStart = new Date(
    newTravelEnd.getTime() - travelMinutes * 60000,
  );

  const adjacent =
    previousSlot.end.getTime() + bufferMilliseconds >= slot.start.getTime();
  const hasRoom = newTravelStart.getTime() >= previousSlot.start.getTime();
  if (!adjacent || !hasRoom) return false;

  const inheritsPreviousCategory = !slot.categoryId && !!previousSlot.categoryId;
  const bothNonCategory = !slot.categoryId && !previousSlot.categoryId;
  if (bothNonCategory && !allowAcrossUnrelatedSlots) return false;

  const travelContext = inheritsPreviousCategory
    ? {
        categoryId: previousSlot.categoryId,
        isStrictCategory: previousSlot.isStrictCategory,
      }
    : { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory };

  occupiedSlots.push(
    createTravelSlot(
      newTravelStart,
      newTravelEnd,
      previousLocation,
      nextLocation,
      "preliminary",
      uuidv4(),
      travelContext,
    ),
  );

  const shrunkPreviousEnd = new Date(
    newTravelStart.getTime() - bufferMilliseconds,
  );
  if (shrunkPreviousEnd.getTime() > previousSlot.start.getTime()) {
    result[result.length - 1] = {
      ...previousSlot,
      end: shrunkPreviousEnd,
      durationMinutes: Math.floor(
        (shrunkPreviousEnd.getTime() - previousSlot.start.getTime()) / 60000,
      ),
    };
  } else {
    result.pop();
  }
  return true;
}

/**
 * Extends travel forward into the next slot when it's an adjacent category
 * slot. The travel starts at the current slot's start, runs past its end,
 * and trims the next category slot's start. Used as a last resort when
 * travel exceeds the current slot's duration.
 *
 * Returns true if the travel was extended, false if the next slot isn't an
 * eligible category slot.
 */
export function tryExtendForwardIntoCategory(
  slot: AvailableSlot,
  slots: AvailableSlot[],
  slotIndex: number,
  previousLocation: string,
  nextLocation: string,
  travelMinutes: number,
  bufferMilliseconds: number,
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
): boolean {
  const nextSlot = slots[slotIndex + 1] ?? null;
  const eligible =
    !slot.categoryId &&
    nextSlot?.isAvailable &&
    !!nextSlot.categoryId &&
    nextSlot.start.getTime() === slot.end.getTime();
  if (!eligible || !nextSlot) return false;

  const travelEnd = new Date(slot.start.getTime() + travelMinutes * 60000);
  occupiedSlots.push(
    createTravelSlot(
      slot.start,
      travelEnd,
      previousLocation,
      nextLocation,
      "preliminary",
      uuidv4(),
    ),
  );

  const trimmedCategoryStart = new Date(
    travelEnd.getTime() + bufferMilliseconds,
  );
  if (trimmedCategoryStart.getTime() < nextSlot.end.getTime()) {
    slots[slotIndex + 1] = {
      ...nextSlot,
      start: trimmedCategoryStart,
      durationMinutes: Math.floor(
        (nextSlot.end.getTime() - trimmedCategoryStart.getTime()) / 60000,
      ),
      prevLocationId: nextLocation,
    };
  }
  return true;
}
