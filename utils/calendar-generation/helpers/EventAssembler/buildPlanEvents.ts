import { Planner, SimpleEvent, PlannerType, EventType } from "@/types/prisma";
import { v4 as uuidv4 } from "uuid";

export function buildPlanEvents(
  userId: string,
  planners: Planner[],
  memoizedEventIds: Set<string>,
): SimpleEvent[] {
  const planItems = planners.filter(
    (task) =>
      task.plannerType === PlannerType.plan && !memoizedEventIds.has(task.id),
  );

  const now = new Date();
  const events: SimpleEvent[] = [];

  for (const plan of planItems) {
    if (plan.starts && plan.duration) {
      const end = new Date(
        new Date(plan.starts).getTime() + plan.duration * 60000,
      );

      const planColor = plan.color ?? "black";
      events.push({
        userId,
        title: plan.title,
        id: plan.id,
        start: plan.starts,
        end: end.toISOString(),
        extendedProps: {
          id: uuidv4(),
          eventId: plan.id,
          plannerType: PlannerType.plan,
          eventType: EventType.planner,
          parentId: null,
          completedEndTime: null,
          completedStartTime: null,
        },
        backgroundColor: planColor,
        borderColor: planColor,
        duration: null,
        rrule: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }
  }

  return events;
}
