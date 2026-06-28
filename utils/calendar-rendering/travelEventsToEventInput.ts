import type { EventInput } from "@fullcalendar/core/index.js";
import { TravelEvent, EventType } from "@/types/prisma";

// Converts persisted TravelEvent rows into FullCalendar EventInput. Colors
// derive from the engine's placement decisions: insufficient (red) outranks
// overconstrained (yellow); clean placements get the default grey.
export function travelEventsToEventInput(
  travelEvents: TravelEvent[],
): EventInput[] {
  return travelEvents.map((event) => {
    let backgroundColor = "#9CA3AF";
    let borderColor = "#6B7280";
    if (event.insufficientTravel) {
      backgroundColor = "#F87171";
      borderColor = "#DC2626";
    } else if (event.overconstrained) {
      backgroundColor = "#FDE68A";
      borderColor = "#D97706";
    }

    return {
      id: event.id,
      title: `Travel_${event.fromLocationId ?? "unknown"}_${event.toLocationId ?? "unknown"}`,
      start: event.start,
      end: event.end,
      backgroundColor,
      borderColor,
      editable: false,
      extendedProps: {
        eventType: EventType.travel,
        eventId: event.id,
        plannerType: null,
        completedStartTime: null,
        completedEndTime: null,
        parentId: null,
        fromLocationId: event.fromLocationId,
        toLocationId: event.toLocationId,
        travelMinutes: event.travelMinutes,
        insufficientTravel: event.insufficientTravel,
        overconstrained: event.overconstrained,
        requiredTravelMinutes: event.requiredTravelMinutes,
      },
    } satisfies EventInput;
  });
}
