import { SimpleEvent, EventType } from "@/types/prisma";
import { RuntimeEventExtendedProps } from "@/types/ui";
import {
  detectTrespassingEvents,
  IntervalWithId,
} from "../../utils/intervalUtils";

export function markTrespassingEvents(
  events: SimpleEvent[],
  plannerLocationMap: Map<string, string | null>,
): void {
  const intervals: IntervalWithId[] = events
    .filter(
      (e) =>
        e.extendedProps?.eventType !== EventType.travel &&
        e.extendedProps?.eventType !== EventType.category,
    )
    .map((e) => {
      const plannerId =
        (e.extendedProps as { eventId?: string })?.eventId || e.id;
      const locationId = plannerLocationMap.get(plannerId) ?? null;

      return {
        start: new Date(e.start),
        end: new Date(e.end),
        startLocationId: locationId,
        endLocationId: locationId,
        eventId: e.id,
      };
    });

  const trespassingMap = detectTrespassingEvents(intervals);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const info = trespassingMap.get(event.id);

    if (info && event.extendedProps) {
      const updatedProps: RuntimeEventExtendedProps = {
        ...(event.extendedProps || {}),
        trespassingStart: info.trespassingStart,
        trespassingEnd: info.trespassingEnd,
      };

      events[i] = {
        ...event,
        extendedProps: updatedProps,
      };
    }
  }
}
