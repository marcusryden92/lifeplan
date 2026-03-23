import { CategoryPeriod } from "@/types/categoryTypes";
import { Interval } from "../../utils/intervalUtils";

export function applyCategoriesToNullIntervals(
  categoryPeriods: CategoryPeriod[],
  intervals: Interval[],
  dayStart: Date,
  dayEnd: Date,
): Interval[] {
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();
  const dayPeriods = categoryPeriods.filter(
    (p) =>
      p.locationId !== null &&
      p.start.getTime() < dayEndMs &&
      p.end.getTime() > dayStartMs,
  );
  if (dayPeriods.length === 0) return intervals;

  return intervals.map((interval) => {
    if (interval.locationId !== null) return interval;
    for (const period of dayPeriods) {
      if (
        interval.start.getTime() >= period.start.getTime() &&
        interval.end.getTime() <= period.end.getTime()
      ) {
        return { ...interval, locationId: period.locationId };
      }
    }
    return interval;
  });
}
