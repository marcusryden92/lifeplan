import { SimpleEvent, EventType } from "@/types/prisma";

// Final SimpleEvent[] returned by the engine. Templates, category wrappers,
// and travel events are deliberately excluded: templates are rendered at
// runtime from the EventTemplate config (RRule unfolds them); category
// occurrences live in their own CategoryEvent[] alongside this output; travel
// events live in their own TravelEvent[]. Only plans + scheduled tasks
// (including completed) ride in this array.
export function assembleFinalEventList(
  scheduledEvents: SimpleEvent[],
): SimpleEvent[] {
  return scheduledEvents.filter(
    (e) => e.extendedProps?.eventType !== EventType.template,
  );
}
