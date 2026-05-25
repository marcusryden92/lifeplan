import { Planner, SimpleEvent } from "@/types/prisma";
import { v4 as uuidv4 } from "uuid";
import { taskIsCompleted } from "../../../taskHelpers";
import { EventType } from "@/prisma/generated/client";

export function buildCompletedEvents(
  userId: string,
  planners: Planner[],
  memoizedEventIds: Set<string>,
): SimpleEvent[] {
  const completedItems = planners.filter(
    (task) => taskIsCompleted(task) && !memoizedEventIds.has(task.id),
  );

  const now = new Date();
  const events: SimpleEvent[] = [];

  for (const item of completedItems) {
    if (item.completedStartTime && item.completedEndTime) {
      events.push({
        userId,
        title: item.title,
        id: item.id,
        start: item.completedStartTime,
        end: item.completedEndTime,
        backgroundColor: item.color as string,
        borderColor: "",
        duration: null,
        rrule: null,
        extendedProps: {
          id: uuidv4(),
          eventId: item.id,
          plannerType: item.plannerType,
          eventType: EventType.planner,
          completedStartTime: item.completedStartTime,
          completedEndTime: item.completedEndTime,
          parentId: item.parentId ?? null,
        },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }
  }

  return events;
}
