import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlot } from "../../models/TimeSlot";
import { Interval, mergeIntervals } from "../../utils/intervalUtils";

export function fixPostCategoryPrevLoc(
  categoryPeriods: CategoryPeriod[],
  slots: TimeSlot[],
  occupiedIntervals: Interval[],
  dayStart: Date,
  dayEnd: Date,
): TimeSlot[] {
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();
  const dayPeriods = categoryPeriods.filter(
    (p) =>
      p.locationId !== null &&
      p.start.getTime() < dayEndMs &&
      p.end.getTime() > dayStartMs,
  );
  if (dayPeriods.length === 0) return slots;

  const merged = mergeIntervals([...occupiedIntervals]);

  return slots.map((slot) => {
    if (!slot.isAvailable) return slot;

    const slotStartMs = slot.start.getTime();

    const relevantPeriods = dayPeriods
      .filter((p) => slotStartMs >= p.end.getTime())
      .sort((a, b) => b.end.getTime() - a.end.getTime());

    for (const period of relevantPeriods) {
      const periodEndMs = period.end.getTime();
      const hasInterveningLocation = merged.some(
        (interval) =>
          interval.locationId !== null &&
          interval.start.getTime() < slotStartMs &&
          interval.end.getTime() > periodEndMs,
      );
      if (hasInterveningLocation) break;

      return { ...slot, prevLocationId: period.locationId };
    }

    return slot;
  });
}
