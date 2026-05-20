import { SimpleEvent, EventType } from "@/types/prisma";
import { Slot, TravelSlot } from "../../models/TimeSlot";
import { getAllTravelSlots } from "./getAllTravelSlots";

export function generateTravelEvents(
  slots: Slot[],
  userId: string,
): SimpleEvent[] {
  const travelSlots = getAllTravelSlots(slots);
  const now = new Date();

  return travelSlots.map((slot: TravelSlot) => {
    // Color priority: insufficient (red) outranks overconstrained (yellow);
    // a travel that's both gets the red treatment since the harder failure
    // wins. Default grey for clean placements.
    let backgroundColor = "#9CA3AF";
    let borderColor = "#6B7280";
    if (slot.insufficientTravel) {
      backgroundColor = "#F87171";
      borderColor = "#DC2626";
    } else if (slot.overconstrained) {
      backgroundColor = "#FDE68A";
      borderColor = "#D97706";
    }

    return {
      userId,
      id: slot.eventId,
      title: `Travel_${slot.travelFromLocationId ?? "unknown"}_${slot.travelToLocationId ?? "unknown"}`,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      backgroundColor,
      borderColor,
      duration: null,
      rrule: null,
      extendedProps: {
        id: slot.eventId,
        eventId: slot.eventId,
        PlannerType: null,
        eventType: EventType.travel,
        parentId: null,
        completedEndTime: null,
        completedStartTime: null,
        fromLocationId: slot.travelFromLocationId,
        toLocationId: slot.travelToLocationId,
        travelMinutes: slot.durationMinutes,
        insufficientTravel: slot.insufficientTravel,
        overconstrained: slot.overconstrained ?? false,
        requiredTravelMinutes:
          slot.requiredTravelMinutes > 0 ? slot.requiredTravelMinutes : null,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    } as unknown as SimpleEvent;
  });
}
