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
    return {
      userId,
      id: slot.eventId,
      title: `Travel_${slot.travelFromLocationId ?? "unknown"}_${slot.travelToLocationId ?? "unknown"}`,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      backgroundColor: slot.insufficientTravel ? "#F87171" : "#9CA3AF",
      borderColor: slot.insufficientTravel ? "#DC2626" : "#6B7280",
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
        requiredTravelMinutes:
          slot.requiredTravelMinutes > 0 ? slot.requiredTravelMinutes : null,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    } as unknown as SimpleEvent;
  });
}
