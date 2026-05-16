import type { Category } from "@/types/prisma";
import { AvailableSlot } from "../../models/TimeSlot";
import { hhmmToMinutes } from "../../utils/dateTimeService";
import { expandSlotForDay } from "./expandSlotForDay";

type ConstraintInfo = {
  categoryId: string;
  locationId: string | null;
  isStrict: boolean;
};

type CategoryBoundary = {
  boundaryMs: number;
  leaving: ConstraintInfo | null; // category period ending here
  entering: ConstraintInfo | null; // category period starting here
};

// Compute all category boundaries within [rangeStartMs, rangeEndMs] by iterating
// day-by-day and checking each constraint's time slots against that day.
function getAllBoundaries(
  constraints: Category[],
  rangeStartMs: number,
  rangeEndMs: number,
): CategoryBoundary[] {
  const enteringAt = new Map<number, ConstraintInfo>();
  const leavingAt = new Map<number, ConstraintInfo>();

  const day = new Date(rangeStartMs);
  day.setHours(0, 0, 0, 0);

  while (day.getTime() < rangeEndMs) {
    for (const constraint of constraints) {
      const bp: ConstraintInfo = {
        categoryId: constraint.id,
        locationId: constraint.locationId ?? null,
        isStrict: constraint.isStrict,
      };

      for (const timeSlot of constraint.timeSlots) {
        const period = expandSlotForDay(timeSlot, day);
        if (!period) continue;

        const startMs = period.start.getTime();
        const endMs = period.end.getTime();

        if (startMs > rangeStartMs && startMs < rangeEndMs)
          enteringAt.set(startMs, bp);

        if (endMs > rangeStartMs && endMs < rangeEndMs)
          leavingAt.set(endMs, bp);
      }
    }

    day.setDate(day.getDate() + 1);
  }

  const allMs = new Set([...enteringAt.keys(), ...leavingAt.keys()]);

  return Array.from(allMs)
    .sort((a, b) => a - b)
    .map((ms) => ({
      boundaryMs: ms,
      entering: enteringAt.get(ms) ?? null,
      leaving: leavingAt.get(ms) ?? null,
    }));
}

function splitSlot(
  slot: AvailableSlot,
  boundary: CategoryBoundary,
): [AvailableSlot | null, AvailableSlot | null] {
  const { boundaryMs, leaving, entering } = boundary;
  const beforeDuration = Math.floor(
    (boundaryMs - slot.start.getTime()) / 60000,
  );
  const afterDuration = Math.floor((slot.end.getTime() - boundaryMs) / 60000);

  // Before-fragment's nextLocationId — mirror of the after-fragment rule:
  //   - If a category is entering at the boundary, the next thing is that
  //     category, so we're heading to entering's location.
  //   - Else if a category is leaving, the before-fragment is INSIDE it and
  //     ends at the leaving boundary — we're still at the leaving category's
  //     location when the slot ends, so next = leaving.locationId. This stops
  //     a category slot from "leaking" a transition into itself when it ends
  //     into a non-category gap.
  //   - Else inherit from the original slot.
  const before: AvailableSlot | null =
    beforeDuration > 0
      ? {
          start: slot.start,
          end: new Date(boundaryMs),
          durationMinutes: beforeDuration,
          isAvailable: true,
          prevLocationId: slot.prevLocationId,
          nextLocationId:
            entering?.locationId ?? leaving?.locationId ?? slot.nextLocationId,
          categoryId: leaving?.categoryId ?? null,
          isStrictCategory: leaving?.isStrict ?? false,
        }
      : null;

  // After-fragment's prevLocationId:
  //   - If a category is entering at the boundary, the after-fragment is
  //     INSIDE it, so the starting location is the entering category's loc.
  //   - Else if a category is leaving, we just exited it, so the starting
  //     location is the leaving category's loc.
  //   - Else inherit from the original slot.
  // Order matters: entering wins because it represents where we are AT the
  // start of the after-fragment, not where we WERE just before.
  const after: AvailableSlot | null =
    afterDuration > 0
      ? {
          start: new Date(boundaryMs),
          end: slot.end,
          durationMinutes: afterDuration,
          isAvailable: true,
          prevLocationId:
            entering?.locationId ?? leaving?.locationId ?? slot.prevLocationId,
          nextLocationId: slot.nextLocationId,
          categoryId: entering?.categoryId ?? null,
          isStrictCategory: entering?.isStrict ?? false,
        }
      : null;

  return [before, after];
}

function applySplitsForBoundary(
  slots: AvailableSlot[],
  boundary: CategoryBoundary,
): AvailableSlot[] {
  return slots.flatMap((slot) => {
    if (
      boundary.boundaryMs <= slot.start.getTime() ||
      boundary.boundaryMs >= slot.end.getTime()
    )
      return [slot];
    const [before, after] = splitSlot(slot, boundary);
    return [before, after].filter(Boolean) as AvailableSlot[];
  });
}

// Assign category membership and fix boundary locations for slots abutting periods.
// Uses day-of-week + time-in-minutes comparison against constraints instead of
// pre-expanded absolute period timestamps.
function assignMembership(
  slot: AvailableSlot,
  constraints: Category[],
): AvailableSlot {
  const slotStartMs = slot.start.getTime();
  const slotEndMs = slot.end.getTime();
  const slotMidMs = (slotStartMs + slotEndMs) / 2;

  let { prevLocationId, nextLocationId, categoryId, isStrictCategory } = slot;

  const midDate = new Date(slotMidMs);
  const midDow = midDate.getDay();
  const midMin = midDate.getHours() * 60 + midDate.getMinutes();

  const startDate = new Date(slotStartMs);
  const startDow = startDate.getDay();
  const startMin = startDate.getHours() * 60 + startDate.getMinutes();

  const endDate = new Date(slotEndMs);
  const endDow = endDate.getDay();
  const endMin = endDate.getHours() * 60 + endDate.getMinutes();

  // Collect candidate locations for the boundary overrides, then apply with
  // priority below (entering wins over leaving — same rule as splitSlot).
  let enteringAtStartLoc: string | undefined;
  let leavingAtStartLoc: string | undefined;
  let enteringAtEndLoc: string | undefined;
  let leavingAtEndLoc: string | undefined;

  for (const constraint of constraints) {
    for (const timeSlot of constraint.timeSlots) {
      const csStart = hhmmToMinutes(timeSlot.startTime);
      let csEnd = hhmmToMinutes(timeSlot.endTime);
      if (csEnd <= csStart) csEnd += 24 * 60;

      if (constraint.locationId) {
        if (timeSlot.days.some((d) => d === startDow)) {
          // Period STARTS at slot start → slot is inside it, we just arrived.
          if (csStart === startMin) enteringAtStartLoc = constraint.locationId;
          // Period ENDS at slot start → we just left it.
          if (csEnd === startMin) leavingAtStartLoc = constraint.locationId;
        }
        if (timeSlot.days.some((d) => d === endDow)) {
          // Period STARTS at slot end → next slot is inside it.
          if (csStart === endMin) enteringAtEndLoc = constraint.locationId;
          // Period ENDS at slot end → this slot is inside it; we're still at
          // the leaving category's loc when the slot ends.
          if (csEnd === endMin) leavingAtEndLoc = constraint.locationId;
        }
      }

      // Midpoint falls inside this period → assign category membership.
      if (categoryId === undefined && timeSlot.days.some((d) => d === midDow)) {
        if (midMin > csStart && midMin < csEnd) {
          categoryId = constraint.id;
          isStrictCategory = constraint.isStrict;
        }
      }
    }
  }

  prevLocationId = enteringAtStartLoc ?? leavingAtStartLoc ?? prevLocationId;
  nextLocationId = enteringAtEndLoc ?? leavingAtEndLoc ?? nextLocationId;

  return {
    ...slot,
    prevLocationId,
    nextLocationId,
    categoryId: categoryId ?? null,
    isStrictCategory: isStrictCategory ?? false,
  };
}

export function splitSlotsAtCategoryBoundaries(
  constraints: Category[],
  slots: AvailableSlot[],
): AvailableSlot[] {
  if (!constraints.length || !slots.length) return slots;

  const rangeStartMs = Math.min(...slots.map((s) => s.start.getTime()));
  const rangeEndMs = Math.max(...slots.map((s) => s.end.getTime()));

  const boundaries = getAllBoundaries(constraints, rangeStartMs, rangeEndMs);
  if (!boundaries.length) return slots;

  const splitSlots = boundaries.reduce(applySplitsForBoundary, slots);

  return splitSlots.map((slot) =>
    slot.isAvailable ? assignMembership(slot, constraints) : slot,
  );
}
