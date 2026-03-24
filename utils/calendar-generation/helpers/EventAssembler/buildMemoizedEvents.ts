import { SimpleEvent, ItemType } from "@/types/prisma";

export function buildMemoizedEvents(
  previousCalendar: SimpleEvent[],
  currentDate: Date
): { events: SimpleEvent[]; eventIds: Set<string> } {
  const memoizedEventIds = new Set<string>();
  const events: SimpleEvent[] = [];

  if (previousCalendar.length > 0) {
    const pastEvents = previousCalendar.filter(
      (e) =>
        currentDate > new Date(e.end) &&
        e.extendedProps?.itemType !== ItemType.template &&
        e.extendedProps?.itemType !== ItemType.travel
    );
    pastEvents.forEach((e) => memoizedEventIds.add(e.id));
    events.push(...pastEvents);
  }

  return { events, eventIds: memoizedEventIds };
}
