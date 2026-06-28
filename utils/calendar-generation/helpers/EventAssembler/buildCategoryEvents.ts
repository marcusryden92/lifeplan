import { Category, CategoryEvent } from "@/types/prisma";
import { expandSlotForDay } from "../TimeSlotManager/expandSlotForDay";
import { TIME_CONSTANTS } from "../../constants";

type CategoryPeriod = {
  start: Date;
  end: Date;
  categoryId: string;
  categoryTimeWindowId: string;
};

function expandPeriods(
  constraints: Category[],
  startDate: Date,
  endDate: Date,
): CategoryPeriod[] {
  const periods: CategoryPeriod[] = [];
  const { MS_PER_WEEK } = TIME_CONSTANTS;

  for (const constraint of constraints) {
    for (const slot of constraint.timeSlots) {
      const searchBase = new Date(startDate);
      searchBase.setHours(0, 0, 0, 0);
      const daysUntil = (slot.day - searchBase.getDay() + 7) % 7;
      searchBase.setDate(searchBase.getDate() + daysUntil);

      while (searchBase <= endDate) {
        const period = expandSlotForDay(slot, searchBase);
        if (period && period.end > startDate && period.start < endDate) {
          periods.push({
            start: period.start,
            end: period.end,
            categoryId: constraint.id,
            categoryTimeWindowId: slot.id,
          });
        }

        searchBase.setTime(searchBase.getTime() + MS_PER_WEEK);
      }
    }
  }

  return periods.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// Materializes one CategoryEvent row per weekly occurrence of every active
// time window. IDs are deterministic (`${categoryTimeWindowId}-${startISO}`)
// so a regen produces the same id for the same occurrence — sync becomes
// idempotent and trespass info travels with the row across reloads.
export function buildCategoryEvents(
  userId: string,
  constraints: Category[],
  startDate: Date,
  endDate: Date,
): CategoryEvent[] {
  const periods = expandPeriods(constraints, startDate, endDate);
  const now = new Date().toISOString();

  return periods.map((period) => {
    const startISO = period.start.toISOString();
    return {
      id: `${period.categoryTimeWindowId}-${startISO}`,
      start: startISO,
      end: period.end.toISOString(),
      trespassingStart: false,
      trespassingEnd: false,
      categoryTimeWindowId: period.categoryTimeWindowId,
      categoryId: period.categoryId,
      userId,
      createdAt: now,
      updatedAt: now,
    };
  });
}
