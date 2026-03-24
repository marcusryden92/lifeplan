import { SimpleEvent, EventType } from "@/types/prisma";

export function assembleFinalEventList(
  scheduledEvents: SimpleEvent[],
  travelEvents: SimpleEvent[],
  categoryWrapperEvents: SimpleEvent[],
): SimpleEvent[] {
  const scheduledNonTemplateEvents = scheduledEvents.filter(
    (e) => e.extendedProps?.eventType !== EventType.template,
  );

  const templateEventsForUI = scheduledEvents.filter(
    (e) => e.extendedProps?.eventType === EventType.template,
  );

  return [
    ...scheduledNonTemplateEvents,
    ...templateEventsForUI,
    ...travelEvents,
    ...categoryWrapperEvents,
  ];
}
