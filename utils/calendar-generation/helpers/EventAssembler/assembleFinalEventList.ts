import { SimpleEvent } from "@/types/prisma";

export function assembleFinalEventList(
  scheduledEvents: SimpleEvent[],
  travelEvents: SimpleEvent[],
  categoryWrapperEvents: SimpleEvent[]
): SimpleEvent[] {
  const scheduledNonTemplateEvents = scheduledEvents.filter(
    (e) => e.extendedProps?.itemType !== "template"
  );

  const templateEventsForUI = scheduledEvents.filter(
    (e) => e.extendedProps?.itemType === "template"
  );

  return [
    ...scheduledNonTemplateEvents,
    ...templateEventsForUI,
    ...travelEvents,
    ...categoryWrapperEvents,
  ];
}
