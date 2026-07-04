import { SimpleEvent, EventType, PlannerType } from "@/types/prisma";

// Plans are excluded from memoization: a plan is deterministic from its own
// planner row (starts + duration), so pinning the old emit here would make
// the engine ignore a starts change on any plan whose block already ended —
// the user drags it, planner.starts updates, and the calendar keeps rendering
// the stale copy. Memoization exists to freeze the engine's own past
// placements, not user-anchored rows.
export function buildMemoizedEvents(
  previousCalendar: SimpleEvent[],
  currentDate: Date,
): { events: SimpleEvent[]; eventIds: Set<string> } {
  const memoizedEventIds = new Set<string>();
  const events: SimpleEvent[] = [];

  if (previousCalendar.length > 0) {
    const pastEvents = previousCalendar.filter(
      (e) =>
        currentDate > new Date(e.end) &&
        e.extendedProps?.eventType !== EventType.template &&
        e.extendedProps?.eventType !== EventType.travel &&
        e.extendedProps?.eventType !== EventType.category &&
        e.extendedProps?.plannerType !== PlannerType.plan,
    );
    pastEvents.forEach((e) => memoizedEventIds.add(e.id));
    events.push(...pastEvents);
  }

  return { events, eventIds: memoizedEventIds };
}
