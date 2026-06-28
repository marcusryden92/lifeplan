import { SimpleEvent, EventType } from "@/types/prisma";

// Final SimpleEvent[] returned by the engine. Templates and category wrappers
// are deliberately excluded: templates are rendered at runtime from the
// EventTemplate config (RRule unfolds them), and category occurrences are
// produced as their own CategoryEvent[] alongside this output. Only plans,
// scheduled tasks (incl. completed), and travel events ride in this array.
export function assembleFinalEventList(
  scheduledEvents: SimpleEvent[],
  travelEvents: SimpleEvent[],
): SimpleEvent[] {
  const scheduledNonTemplateEvents = scheduledEvents.filter(
    (e) => e.extendedProps?.eventType !== EventType.template,
  );

  return [...scheduledNonTemplateEvents, ...travelEvents];
}
