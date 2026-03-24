import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlot } from "../../models/TimeSlot";

type CategoryBoundary = {
  boundaryMs: number;
  leaving: CategoryPeriod | null; // category ending at this time
  entering: CategoryPeriod | null; // category starting at this time
};

// Collect all unique category boundaries within the range, merging coincident start/end
function getAllBoundaries(
  activePeriods: CategoryPeriod[],
  rangeStartMs: number,
  rangeEndMs: number,
): CategoryBoundary[] {
  const boundaryMap = new Map<number, CategoryBoundary>();

  const getOrCreate = (ms: number): CategoryBoundary => {
    if (!boundaryMap.has(ms))
      boundaryMap.set(ms, { boundaryMs: ms, leaving: null, entering: null });
    return boundaryMap.get(ms)!;
  };

  for (const period of activePeriods) {
    const startMs = period.start.getTime();
    const endMs = period.end.getTime();
    if (startMs > rangeStartMs && startMs < rangeEndMs)
      getOrCreate(startMs).entering = period;
    if (endMs > rangeStartMs && endMs < rangeEndMs)
      getOrCreate(endMs).leaving = period;
  }

  return Array.from(boundaryMap.values()).sort(
    (a, b) => a.boundaryMs - b.boundaryMs,
  );
}

function splitSlot(
  slot: TimeSlot,
  boundary: CategoryBoundary,
): [TimeSlot | null, TimeSlot | null] {
  const { boundaryMs, leaving, entering } = boundary;
  const beforeDuration = Math.floor(
    (boundaryMs - slot.start.getTime()) / 60000,
  );
  const afterDuration = Math.floor((slot.end.getTime() - boundaryMs) / 60000);

  const before: TimeSlot | null =
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

  const after: TimeSlot | null =
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
  slots: TimeSlot[],
  boundary: CategoryBoundary,
): TimeSlot[] {
  return slots.flatMap((slot) => {
    if (
      !slot.isAvailable ||
      boundary.boundaryMs <= slot.start.getTime() ||
      boundary.boundaryMs >= slot.end.getTime()
    )
      return [slot];
    const [before, after] = splitSlot(slot, boundary);
    return [before, after].filter(Boolean) as TimeSlot[];
  });
}

// Assign category membership and fix boundary locations for slots abutting periods
function assignMembership(
  slot: TimeSlot,
  activePeriods: CategoryPeriod[],
): TimeSlot {
  const slotStartMs = slot.start.getTime();
  const slotEndMs = slot.end.getTime();
  const slotMidMs = (slotStartMs + slotEndMs) / 2;

  let { prevLocationId, nextLocationId, categoryId, isStrictCategory } = slot;

  for (const period of activePeriods) {
    const periodStartMs = period.start.getTime();
    const periodEndMs = period.end.getTime();

    if (period.locationId) {
      if (periodEndMs === slotStartMs) prevLocationId = period.locationId;
      if (periodStartMs === slotEndMs) nextLocationId = period.locationId;
    }

    if (
      categoryId === undefined &&
      slotMidMs >= periodStartMs &&
      slotMidMs < periodEndMs
    ) {
      categoryId = period.categoryId;
      isStrictCategory = period.isStrict;
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
  categoryPeriods: CategoryPeriod[],
  slots: TimeSlot[],
  rangeStart: Date,
  rangeEnd: Date,
): TimeSlot[] {
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();

  const activePeriods = categoryPeriods.filter(
    (p) => p.start.getTime() < rangeEndMs && p.end.getTime() > rangeStartMs,
  );

  if (!activePeriods.length) return slots;

  const boundaries = getAllBoundaries(activePeriods, rangeStartMs, rangeEndMs);

  let result = slots;

  for (const boundary of boundaries) {
    result = applySplitsForBoundary(result, boundary);
  }

  return result.map((slot) =>
    slot.isAvailable ? assignMembership(slot, activePeriods) : slot,
  );
}
