/**
 * TravelConverter
 *
 * Converts travel slots to SimpleEvent format for calendar display.
 */

import { SimpleEvent } from "@/types/prisma";
import { TimeSlot, TimeSlotUtils } from "../../../models/TimeSlot";

export class TravelConverter {
  /**
   * Get all travel slots from occupied slots map
   */
  static getAllTravelSlots(occupiedSlots: Map<string, TimeSlot[]>): TimeSlot[] {
    const travelSlots: TimeSlot[] = [];
    for (const slots of occupiedSlots.values()) {
      for (const slot of slots) {
        if (TimeSlotUtils.isTravelSlot(slot)) {
          travelSlots.push(slot);
        }
      }
    }
    return travelSlots;
  }

  /**
   * Convert all travel slots to SimpleEvents
   * Called at the end of scheduling to generate final travel events
   */
  static generateTravelEvents(
    occupiedSlots: Map<string, TimeSlot[]>,
    userId: string
  ): SimpleEvent[] {
    const travelSlots = this.getAllTravelSlots(occupiedSlots);
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

      // Travel events have extra props not in the base Prisma schema
      // These are used for display purposes only, not persisted
      // Cast to SimpleEvent since travel-specific fields are runtime-only
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
}
