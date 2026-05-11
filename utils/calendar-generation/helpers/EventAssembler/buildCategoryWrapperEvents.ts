import { SimpleEvent, EventType } from "@/types/prisma";
import type { CategoryConstraint } from "@/types/categoryTypes";
import { RuntimeEventExtendedProps } from "@/types/ui";
import { expandSlotForDay } from "../TimeSlotManager/expandSlotForDay";
import { TIME_CONSTANTS } from "../../constants";
import { v4 as uuidv4 } from "uuid";

type CategoryPeriod = {
  start: Date;
  end: Date;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null | undefined;
  isStrict: boolean;
};

function expandPeriods(
  constraints: CategoryConstraint[],
  startDate: Date,
  endDate: Date,
): CategoryPeriod[] {
  const periods: CategoryPeriod[] = [];
  const { MS_PER_WEEK } = TIME_CONSTANTS;

  for (const constraint of constraints) {
    for (const slot of constraint.timeSlots) {
      for (const dow of slot.days) {
        const searchBase = new Date(startDate);
        searchBase.setHours(0, 0, 0, 0);
        const daysUntil = (dow - searchBase.getDay() + 7) % 7;
        searchBase.setDate(searchBase.getDate() + daysUntil);

        while (searchBase <= endDate) {
          const period = expandSlotForDay(slot, searchBase);
          if (period && period.end > startDate && period.start < endDate) {
            periods.push({
              start: period.start,
              end: period.end,
              categoryId: constraint.id,
              categoryName: constraint.name,
              categoryColor: constraint.color,
              isStrict: constraint.isStrict,
            });
          }

          searchBase.setTime(searchBase.getTime() + MS_PER_WEEK);
        }
      }
    }
  }

  return periods.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function buildCategoryWrapperEvents(
  userId: string,
  constraints: CategoryConstraint[],
  startDate: Date,
  endDate: Date,
): SimpleEvent[] {
  const periods = expandPeriods(constraints, startDate, endDate);
  const events: SimpleEvent[] = [];

  for (const period of periods) {
    const startHours = String(period.start.getHours()).padStart(2, "0");
    const startMinutes = String(period.start.getMinutes()).padStart(2, "0");
    const endHours = String(period.end.getHours()).padStart(2, "0");
    const endMinutes = String(period.end.getMinutes()).padStart(2, "0");
    const startTimeStr = `${startHours}:${startMinutes}`;
    const endTimeStr = `${endHours}:${endMinutes}`;

    const wrapperId = `${period.categoryId}-${period.start.getDay()}-${startTimeStr}-${endTimeStr}`;

    const extendedProps: RuntimeEventExtendedProps = {
      id: uuidv4(),
      plannerType: null,
      eventType: EventType.category,
      eventId: "",
      parentId: null,
      completedStartTime: null,
      completedEndTime: null,
      categoryId: period.categoryId,
      isStrict: period.isStrict,
      wrapperId: wrapperId,
    };

    events.push({
      id: uuidv4(),
      title: `${period.categoryName} Time Slot`,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      duration: Math.floor(
        (period.end.getTime() - period.start.getTime()) / 60000,
      ),
      userId: userId,
      rrule: null,
      backgroundColor: period.categoryColor || "#3b82f6",
      borderColor: period.categoryColor || "#3b82f6",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      extendedProps: extendedProps,
    });
  }

  return events;
}
