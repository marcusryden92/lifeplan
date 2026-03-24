import { SimpleEvent, EventType } from "@/types/prisma";
import { RuntimeEventExtendedProps } from "@/types/ui";
import { v4 as uuidv4 } from "uuid";
import { CategoryPeriod } from "../../models/SchedulingModels";

export function buildCategoryWrapperEvents(
  userId: string,
  categoryPeriods: CategoryPeriod[],
): SimpleEvent[] {
  const events: SimpleEvent[] = [];

  for (const period of categoryPeriods) {
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
