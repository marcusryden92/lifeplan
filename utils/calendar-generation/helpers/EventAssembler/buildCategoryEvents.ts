import { Category, CategoryEvent } from "@/types/prisma";
import { expandSlotForDay } from "../TimeSlotManager/expandSlotForDay";
import { dateTimeService } from "../../utils/dateTimeService";

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

        // setDate stays wall-clock aligned across DST; a fixed UTC stride
        // (getTime + MS_PER_WEEK) drifts the local day-of-week by an hour
        // either side of a DST boundary and can skip the target day-of-week
        // entirely on the fall-back side.
        searchBase.setDate(searchBase.getDate() + 7);
      }
    }
  }

  return periods.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// Id pairs windowId with the LOCAL calendar date of the occurrence. Local
// keying tracks user intent — a "Monday 8 AM work" window stays at 8 AM
// through DST and keeps the same id week-to-week. A user who changes
// machine timezone WILL get fresh ids on their next regen, since the
// window's wall-clock identity moves with them.
// createdAt/updatedAt are empty: DB owns those fields, diff strips them.
export function buildCategoryEvents(
  userId: string,
  constraints: Category[],
  startDate: Date,
  endDate: Date,
): CategoryEvent[] {
  const periods = expandPeriods(constraints, startDate, endDate);

  return periods.map((period) => {
    const dayKey = dateTimeService.getDayKey(period.start);
    return {
      id: `${period.categoryTimeWindowId}|${dayKey}`,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      trespassingStart: false,
      trespassingEnd: false,
      categoryTimeWindowId: period.categoryTimeWindowId,
      categoryId: period.categoryId,
      userId,
      createdAt: "",
      updatedAt: "",
    };
  });
}
