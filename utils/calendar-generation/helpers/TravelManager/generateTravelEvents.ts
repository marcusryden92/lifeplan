import { SimpleEvent } from "@/types/prisma";
import { TimeSlot } from "../../models/TimeSlot";
import { getAllTravelSlots } from "./getAllTravelSlots";

export function generateTravelEvents(
  occupiedSlots: TimeSlot[],
  userId: string
): SimpleEvent[] {
  const travelSlots = getAllTravelSlots(occupiedSlots);
  const now = new Date();

  return travelSlots.map((slot: TimeSlot) => {
    const eventId: string = slot.eventId ?? `travel-${slot.start.getTime()}`;
    const isInsufficient: boolean = slot.insufficientTravel === true;
    const requiredMinutes: number | null =
      typeof slot.requiredTravelMinutes === "number"
        ? slot.requiredTravelMinutes
        : null;
    const fromLocation: string | null =
      typeof slot.travelFromLocationId === "string"
        ? slot.travelFromLocationId
        : null;
    const toLocation: string | null =
      typeof slot.travelToLocationId === "string"
        ? slot.travelToLocationId
        : null;

    return {
      userId,
      id: eventId,
      title: `Travel_${fromLocation ?? "unknown"}_${toLocation ?? "unknown"}`,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      backgroundColor: isInsufficient ? "#F87171" : "#9CA3AF",
      borderColor: isInsufficient ? "#DC2626" : "#6B7280",
      duration: null,
      rrule: null,
      extendedProps: {
        id: eventId,
        eventId: eventId,
        itemType: "travel" as const,
        parentId: null,
        completedEndTime: null,
        completedStartTime: null,
        fromLocationId: fromLocation,
        toLocationId: toLocation,
        travelMinutes: slot.durationMinutes,
        insufficientTravel: isInsufficient,
        requiredTravelMinutes: requiredMinutes,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    } as unknown as SimpleEvent;
  });
}
