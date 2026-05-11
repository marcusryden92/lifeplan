import type { CategoryConstraint, CategoryTimeSlot } from "@/types/categoryTypes";
import { Interval } from "../../utils/intervalUtils";
import { hhmmToMinutes } from "../../utils/dateTimeService";

// Returns whether an interval is fully contained within a category time slot
// on the given day of week (dow = 0–6).
function intervalIsInsideSlot(
  catSlot: CategoryTimeSlot,
  dow: number,
  intervalStartMs: number,
  intervalEndMs: number,
  intervalDayStart: Date,
): boolean {
  if (!catSlot.days.some((d) => d === dow)) return false;

  const startMin = hhmmToMinutes(catSlot.startTime);
  let endMin = hhmmToMinutes(catSlot.endTime);
  if (endMin <= startMin) endMin += 24 * 60;

  const periodStart = new Date(intervalDayStart);
  periodStart.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
  const periodEnd = new Date(periodStart.getTime() + (endMin - startMin) * 60000);

  return (
    intervalStartMs >= periodStart.getTime() &&
    intervalEndMs <= periodEnd.getTime()
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

    // Determine which day the interval falls on
    const intervalDayStart = new Date(interval.start);
    intervalDayStart.setHours(0, 0, 0, 0);
    const dow = intervalDayStart.getDay();

    for (const constraint of locationConstraints) {
      for (const catSlot of constraint.timeSlots) {
        if (
          intervalIsInsideSlot(
            catSlot,
            dow,
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
