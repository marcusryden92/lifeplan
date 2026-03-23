import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlot } from "../../models/TimeSlot";

export function splitSlotsAtCategoryBoundaries(
  categoryPeriods: CategoryPeriod[],
  slots: TimeSlot[],
  dayStart: Date,
  dayEnd: Date,
): TimeSlot[] {
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  const dayPeriods = categoryPeriods.filter(
    (p) => p.start.getTime() < dayEndMs && p.end.getTime() > dayStartMs,
  );

  if (dayPeriods.length === 0) return slots;

  let result = slots;

  for (const period of dayPeriods) {
    const catLoc = period.locationId;
    const boundaries: Array<{ time: Date; entering: boolean }> = [];

    if (
      period.start.getTime() > dayStartMs &&
      period.start.getTime() < dayEndMs
    ) {
      boundaries.push({ time: period.start, entering: true });
    }
    if (
      period.end.getTime() > dayStartMs &&
      period.end.getTime() < dayEndMs
    ) {
      boundaries.push({ time: period.end, entering: false });
    }

    for (const { time: boundary, entering } of boundaries) {
      const boundaryMs = boundary.getTime();
      const newResult: TimeSlot[] = [];

      const adjacentCatLoc = !entering
        ? (dayPeriods.find(
            (p) =>
              p.categoryId !== period.categoryId &&
              p.locationId !== null &&
              p.start.getTime() === boundaryMs,
          )?.locationId ?? null)
        : null;

      for (const slot of result) {
        if (!slot.isAvailable) {
          newResult.push(slot);
          continue;
        }

        const slotStartMs = slot.start.getTime();
        const slotEndMs = slot.end.getTime();

        if (boundaryMs >= slotStartMs && boundaryMs < slotEndMs) {
          const beforeDuration = Math.floor(
            (boundaryMs - slotStartMs) / 60000,
          );
          const afterDuration = Math.floor((slotEndMs - boundaryMs) / 60000);

          if (beforeDuration > 0) {
            const isInside = !entering;
            const beforeNextLoc =
              adjacentCatLoc ??
              (catLoc !== null ? catLoc : slot.nextLocationId);
            newResult.push({
              start: slot.start,
              end: new Date(boundaryMs),
              durationMinutes: beforeDuration,
              isAvailable: true,
              prevLocationId: slot.prevLocationId,
              nextLocationId: beforeNextLoc,
              categoryId: isInside ? period.categoryId : null,
              isStrictCategory: isInside ? period.isStrict : false,
            });
          }

          if (afterDuration > 0) {
            const isInside = entering;
            newResult.push({
              start: new Date(boundaryMs),
              end: slot.end,
              durationMinutes: afterDuration,
              isAvailable: true,
              prevLocationId: catLoc !== null ? catLoc : slot.prevLocationId,
              nextLocationId: slot.nextLocationId,
              categoryId: isInside ? period.categoryId : null,
              isStrictCategory: isInside ? period.isStrict : false,
            });
          }
        } else {
          newResult.push(slot);
        }
      }

      result = newResult;
    }
  }

  result = result.map((slot) => {
    if (!slot.isAvailable || slot.categoryId !== undefined) return slot;

    const slotMidMs = (slot.start.getTime() + slot.end.getTime()) / 2;
    for (const period of dayPeriods) {
      if (
        slotMidMs >= period.start.getTime() &&
        slotMidMs < period.end.getTime()
      ) {
        return {
          ...slot,
          categoryId: period.categoryId,
          isStrictCategory: period.isStrict,
        };
      }
    }

    return { ...slot, categoryId: null, isStrictCategory: false };
  });

  return result;
}
