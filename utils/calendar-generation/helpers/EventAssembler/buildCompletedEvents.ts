import { Planner, SimpleEvent } from "@/types/prisma";
import { v4 as uuidv4 } from "uuid";
import { taskIsCompleted } from "../../../taskHelpers";
import { EventType } from "@/generated/client";
import { calendarColors } from "@/data/calendarColors";

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
        // Planner.color is nullable but the SimpleEvent column is NOT NULL —
        // an uncolored completed item must fall back like buildTaskEvent does,
        // or the sync's bulk UPDATE hits a 23502 on the write.
        backgroundColor: item.color || calendarColors[0],
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
