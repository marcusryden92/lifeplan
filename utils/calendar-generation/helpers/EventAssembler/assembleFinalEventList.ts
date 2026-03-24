import { SimpleEvent, ItemType } from "@/types/prisma";

export function assembleFinalEventList(
  scheduledEvents: SimpleEvent[],
  travelEvents: SimpleEvent[],
  categoryWrapperEvents: SimpleEvent[]
): SimpleEvent[] {
  const scheduledNonTemplateEvents = scheduledEvents.filter(
    (e) => e.extendedProps?.itemType !== ItemType.template
  );

  const templateEventsForUI = scheduledEvents.filter(
    (e) => e.extendedProps?.itemType === ItemType.template
  );

  return [
    ...scheduledNonTemplateEvents,
    ...templateEventsForUI,
    ...travelEvents,
    ...categoryWrapperEvents,
  ];
}
