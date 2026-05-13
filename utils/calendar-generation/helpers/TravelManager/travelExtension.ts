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
 *
 * Refuses to shift into a category slot — category time is preserved; the
 * trespass branch in the dispatcher handles "no room" for category cases.
 *
 * `allowAcrossUnrelatedSlots` distinguishes two use sites:
 *  - "Travel exactly fills slot" optimization: extends freely (true)
 *  - "Travel exceeds slot" last resort: refuses if THIS slot is also
 *     non-category (false) — avoids stretching travel across unrelated
 *     regions when neither side is in a category.
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
  if (previousSlot.categoryId) return false;

  const newTravelEnd = new Date(slot.end.getTime() - bufferMilliseconds);
  const newTravelStart = new Date(
    newTravelEnd.getTime() - travelMinutes * 60000,
  );

  const adjacent =
    previousSlot.end.getTime() + bufferMilliseconds >= slot.start.getTime();
  const hasRoom = newTravelStart.getTime() >= previousSlot.start.getTime();
  if (!adjacent || !hasRoom) return false;

  // previousSlot has no categoryId (guarded above). Refuse when THIS slot is
  // also non-category and the caller didn't explicitly allow it, to avoid
  // stretching travel across unrelated regions.
  if (!slot.categoryId && !allowAcrossUnrelatedSlots) return false;

  occupiedSlots.push(
    createTravelSlot(
      newTravelStart,
      newTravelEnd,
      previousLocation,
      nextLocation,
      "preliminary",
      uuidv4(),
      { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
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
