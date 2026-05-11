import type { CategoryConstraint } from "@/types/categoryTypes";
import { AvailableSlot } from "../../models/TimeSlot";
import { hhmmToMinutes } from "../../utils/dateTimeService";
import { expandSlotForDay } from "./expandSlotForDay";

type BoundaryPeriod = {
  categoryId: string;
  locationId: string | null;
  isStrict: boolean;
};

type CategoryBoundary = {
  boundaryMs: number;
  leaving: BoundaryPeriod | null; // category period ending here
  entering: BoundaryPeriod | null; // category period starting here
};

// Compute all category boundaries within [rangeStartMs, rangeEndMs] by iterating
// day-by-day and checking each constraint's time slots against that day.
function getAllBoundaries(
  constraints: CategoryConstraint[],
  rangeStartMs: number,
  rangeEndMs: number,
): CategoryBoundary[] {
  const enteringAt = new Map<number, BoundaryPeriod>();
  const leavingAt = new Map<number, BoundaryPeriod>();

  const day = new Date(rangeStartMs);
  day.setHours(0, 0, 0, 0);

  while (day.getTime() < rangeEndMs) {
    for (const constraint of constraints) {
      const bp: BoundaryPeriod = {
        categoryId: constraint.id,
        locationId: constraint.locationId ?? null,
        isStrict: constraint.isStrict,
      };

      for (const catSlot of constraint.timeSlots) {
        const period = expandSlotForDay(catSlot, day);
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

  const before: AvailableSlot | null =
    beforeDuration > 0
      ? {
          start: slot.start,
          end: new Date(boundaryMs),
          durationMinutes: beforeDuration,
          isAvailable: true,
          prevLocationId: slot.prevLocationId,
          nextLocationId: entering?.locationId ?? slot.nextLocationId,
          categoryId: leaving?.categoryId ?? null,
          isStrictCategory: leaving?.isStrict ?? false,
        }
      : null;

  const after: AvailableSlot | null =
    afterDuration > 0
      ? {
          start: new Date(boundaryMs),
          end: slot.end,
          durationMinutes: afterDuration,
          isAvailable: true,
          prevLocationId: leaving?.locationId ?? slot.prevLocationId,
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
  constraints: CategoryConstraint[],
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

  for (const constraint of constraints) {
    for (const catSlot of constraint.timeSlots) {
      const csStart = hhmmToMinutes(catSlot.startTime);
      let csEnd = hhmmToMinutes(catSlot.endTime);
      if (csEnd <= csStart) csEnd += 24 * 60;

      if (constraint.locationId) {
        // A period ending exactly at slot start → this is the slot's prevLocation
        if (catSlot.days.some((d) => d === startDow) && csEnd === startMin)
          prevLocationId = constraint.locationId;

        // A period starting exactly at slot end → this is the slot's nextLocation
        if (catSlot.days.some((d) => d === endDow) && csStart === endMin)
          nextLocationId = constraint.locationId;
      }

      // Midpoint falls inside this period → assign category membership
      if (categoryId === undefined && catSlot.days.some((d) => d === midDow)) {
        if (midMin > csStart && midMin < csEnd) {
          categoryId = constraint.id;
          isStrictCategory = constraint.isStrict;
        }
      }
    }
  }

  return {
    ...slot,
    prevLocationId,
    nextLocationId,
    categoryId: categoryId ?? null,
    isStrictCategory: isStrictCategory ?? false,
  };
}

export function splitSlotsAtCategoryBoundaries(
  constraints: CategoryConstraint[],
  slots: AvailableSlot[],
): AvailableSlot[] {
  if (!constraints.length || !slots.length) return slots;

  const rangeStartMs = Math.min(...slots.map((s) => s.start.getTime()));
  const rangeEndMs = Math.max(...slots.map((s) => s.end.getTime()));

  const boundaries = getAllBoundaries(constraints, rangeStartMs, rangeEndMs);
  if (!boundaries.length) return slots;

  let result = slots;
  for (const boundary of boundaries) {
    result = applySplitsForBoundary(result, boundary);
  }

  return result.map((slot) =>
    slot.isAvailable ? assignMembership(slot, constraints) : slot,
  );
}
