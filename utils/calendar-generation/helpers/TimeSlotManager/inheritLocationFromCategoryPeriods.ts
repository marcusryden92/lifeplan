import type { CategoryConstraint, CategoryTimeSlot } from "@/types/categoryTypes";
import { Interval } from "../../utils/intervalUtils";
import { expandSlotForDay } from "./expandSlotForDay";

function intervalIsInsideSlot(
  catSlot: CategoryTimeSlot,
  intervalStartMs: number,
  intervalEndMs: number,
  intervalDayStart: Date,
): boolean {
  const period = expandSlotForDay(catSlot, intervalDayStart);
  if (!period) return false;

  return (
    intervalStartMs >= period.start.getTime() &&
    intervalEndMs <= period.end.getTime()
  );
}

export function inheritLocationFromCategoryPeriods(
  constraints: CategoryConstraint[],
  intervals: Interval[],
): Interval[] {
  const locationConstraints = constraints.filter((c) => c.locationId != null);
  if (locationConstraints.length === 0) return intervals;

  return intervals.map((interval) => {
    if (interval.startLocationId != null || interval.endLocationId != null)
      return interval;

    const intervalStartMs = interval.start.getTime();
    const intervalEndMs = interval.end.getTime();

    const intervalDayStart = new Date(interval.start);
    intervalDayStart.setHours(0, 0, 0, 0);

    for (const constraint of locationConstraints) {
      for (const catSlot of constraint.timeSlots) {
        if (
          intervalIsInsideSlot(
            catSlot,
            intervalStartMs,
            intervalEndMs,
            intervalDayStart,
          )
        ) {
          return {
            ...interval,
            startLocationId: constraint.locationId!,
            endLocationId: constraint.locationId!,
          };
        }
      }
    }

    return interval;
  });
}
