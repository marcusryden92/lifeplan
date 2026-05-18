import type { Category } from "@/types/prisma";
import { AvailableSlot, CategorySlot, Slot } from "../../models/TimeSlot";
import { expandSlotForDay } from "./expandSlotForDay";

type Period = {
  start: Date;
  end: Date;
  locationId: string | null;
  categoryId: string;
  isStrict: boolean;
};

// Resolve all category periods that overlap a single available slot, clipped
// to the slot's extent. Iterates day-by-day across the slot to evaluate each
// recurring constraint rule.
function findPeriodsForSlot(
  slot: AvailableSlot,
  constraints: Category[],
): Period[] {
  const slotStartMs = slot.start.getTime();
  const slotEndMs = slot.end.getTime();

  const day = new Date(slotStartMs);
  day.setHours(0, 0, 0, 0);

  const periods: Period[] = [];

  while (day.getTime() < slotEndMs) {
    for (const constraint of constraints) {
      for (const timeSlot of constraint.timeSlots) {
        const period = expandSlotForDay(timeSlot, day);
        if (!period) continue;
        const startMs = Math.max(period.start.getTime(), slotStartMs);
        const endMs = Math.min(period.end.getTime(), slotEndMs);
        if (startMs < endMs) {
          periods.push({
            start: new Date(startMs),
            end: new Date(endMs),
            locationId: constraint.locationId ?? null,
            categoryId: constraint.id,
            isStrict: constraint.isStrict,
          });
        }
      }
    }
    day.setDate(day.getDate() + 1);
  }

  periods.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Overlapping category periods are not modelled. Drop later ones that start
  // before an earlier one ends — keep the earliest. Revisit if seeds start
  // emitting overlapping categories.
  const result: Period[] = [];
  for (const p of periods) {
    const last = result[result.length - 1];
    if (!last || p.start.getTime() >= last.end.getTime()) result.push(p);
  }
  return result;
}

// Carve a single available slot into a sequence of (Available | Category)
// fragments using the supplied category periods.
//
// Location-field convention for the new slot model:
//   - CategorySlot owns its entry/exit transitions at the slot edges.
//       prev = location of the user just before the category starts
//              (= previous category's location, or slot.prev if no prior category)
//       current = the category's location
//       next = location the user heads to after the category
//              (= next category's location, or slot.next if no later category)
//     The dispatcher reads prev != current as "entry travel needed" and
//     current != next as "exit travel needed".
//   - Available fragments adjacent to a category are TRANSPARENT (prev == next)
//     so the dispatcher does not double-place a transition that the category
//     already owns. The transparent location is picked so the surrounding
//     transitions land on the right side of the boundary:
//       leading available  -> transparent at slot.prev
//       between-categories -> transparent at the NEXT category's location
//                             (so the preceding category sees an exit transition)
//       trailing available -> transparent at slot.next
function splitOneSlot(slot: AvailableSlot, periods: Period[]): Slot[] {
  if (periods.length === 0) return [slot];

  const fragments: Slot[] = [];
  const slotEndMs = slot.end.getTime();
  const slotPrev = slot.prevLocationId ?? null;
  const slotNext = slot.nextLocationId ?? null;

  let cursorMs = slot.start.getTime();

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const pStartMs = p.start.getTime();
    const pEndMs = p.end.getTime();
    const isFirst = i === 0;
    const isLast = i === periods.length - 1;

    if (cursorMs < pStartMs) {
      const availLoc = isFirst ? slotPrev : p.locationId;
      fragments.push({
        start: new Date(cursorMs),
        end: p.start,
        durationMinutes: Math.floor((pStartMs - cursorMs) / 60000),
        type: "available",
        prevLocationId: availLoc,
        nextLocationId: availLoc,
      });
    }

    const catPrev = isFirst ? slotPrev : periods[i - 1].locationId;
    const catNext = isLast ? slotNext : periods[i + 1].locationId;

    const catSlot: CategorySlot = {
      start: p.start,
      end: p.end,
      durationMinutes: Math.floor((pEndMs - pStartMs) / 60000),
      type: "category",
      currentLocationId: p.locationId,
      prevLocationId: catPrev,
      nextLocationId: catNext,
      categoryId: p.categoryId,
      isStrictCategory: p.isStrict,
    };
    fragments.push(catSlot);

    cursorMs = pEndMs;
  }

  if (cursorMs < slotEndMs) {
    fragments.push({
      start: new Date(cursorMs),
      end: slot.end,
      durationMinutes: Math.floor((slotEndMs - cursorMs) / 60000),
      type: "available",
      prevLocationId: slotNext,
      nextLocationId: slotNext,
    });
  }

  return fragments;
}

export function splitSlotsAtCategoryBoundaries(
  constraints: Category[],
  slots: AvailableSlot[],
): Slot[] {
  if (!constraints.length || !slots.length) return slots;
  return slots.flatMap((slot) =>
    splitOneSlot(slot, findPeriodsForSlot(slot, constraints)),
  );
}
