import type { EventInput } from "@fullcalendar/core/index.js";
import { TravelEvent, EventType } from "@/types/prisma";
import type { SerializedLocation } from "@/redux/slices/schedulingSettingsSlice";

// Locations joined at render time so renaming one takes effect without
// touching every materialized travel row.
export function travelEventsToEventInput(
  travelEvents: TravelEvent[],
  locations: SerializedLocation[] = [],
): EventInput[] {
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const nameFor = (id: string | null): string => {
    if (!id) return "Anywhere";
    return locationById.get(id)?.name ?? "Unknown";
  };

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

    const fromName = nameFor(event.fromLocationId);
    const toName = nameFor(event.toLocationId);

    return {
      id: event.id,
      title: `${fromName} → ${toName}`,
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
        fromLocationName: fromName,
        toLocationName: toName,
        travelMinutes: event.travelMinutes,
        insufficientTravel: event.insufficientTravel,
        overconstrained: event.overconstrained,
        requiredTravelMinutes: event.requiredTravelMinutes,
      },
    } satisfies EventInput;
  });
}
