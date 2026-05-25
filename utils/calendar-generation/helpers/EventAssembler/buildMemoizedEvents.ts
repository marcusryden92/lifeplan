import { SimpleEvent, EventType } from "@/types/prisma";

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
        e.extendedProps?.eventType !== EventType.category,
    );
    pastEvents.forEach((e) => memoizedEventIds.add(e.id));
    events.push(...pastEvents);
  }

  return { events, eventIds: memoizedEventIds };
}
