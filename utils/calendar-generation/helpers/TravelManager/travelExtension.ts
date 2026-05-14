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
 * `allowAcrossUnrelatedSlots` distinguishes two use sites:
 *  - "Travel exactly fills slot" optimization (true): caller wants to shift
 *    to gain a buffer on both sides of the travel. Shifting into a category
 *    is allowed — we borrow a small slice of category time for buffer
 *    compliance.
 *  - "Travel exceeds slot" last resort (false): refuses to shift into a
 *    category (would consume too much category time to fit oversized
 *    travel), and refuses when both this slot and the previous slot are
 *    non-category (avoids stretching travel across unrelated regions).
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

  // Last-resort path: don't consume previous category time. Exact-fit path
  // is allowed to shift into a category for buffer compliance.
  if (!allowAcrossUnrelatedSlots && previousSlot.categoryId) return false;

  const newTravelEnd = new Date(slot.end.getTime() - bufferMilliseconds);
  const newTravelStart = new Date(
    newTravelEnd.getTime() - travelMinutes * 60000,
  );

  const adjacent =
    previousSlot.end.getTime() + bufferMilliseconds >= slot.start.getTime();
  const hasRoom = newTravelStart.getTime() >= previousSlot.start.getTime();
  if (!adjacent || !hasRoom) return false;

  // Last-resort path also refuses when both sides are non-category — avoids
  // stretching travel across unrelated regions when no category binds them.
  const bothNonCategory = !slot.categoryId && !previousSlot.categoryId;
  if (bothNonCategory && !allowAcrossUnrelatedSlots) return false;

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
