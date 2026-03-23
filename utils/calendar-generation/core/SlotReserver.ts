import { TimeSlot } from "../models/TimeSlot";
import { TravelManager } from "./TravelManager";
import { reserveSlot, reserveSlotWithTravel } from "./SlotReserver/index";

/**
 * SlotReserver
 * Handles reservation of time slots and manages travel time before/after events
 */
export class SlotReserver {
  constructor(
    private availableSlots: Map<string, TimeSlot[]>,
    private occupiedSlots: Map<string, TimeSlot[]>,
    private travelManager: TravelManager,
    private bufferTimeMinutes: number,
  ) {}

  /**
   * Reserve a time slot (mark as occupied)
   * The caller is responsible for offsetting the start time by buffer.
   * This method simply marks [start, end] as occupied.
   * @param locationId - Location ID of the event being placed (for updating adjacent slot locations)
   */
  reserveSlot(
    start: Date,
    end: Date,
    eventId: string,
    eventType: "task" | "goal" | "plan" | "template" | "travel",
    locationId?: string | null,
  ): boolean {
    return reserveSlot(
      this.availableSlots,
      this.occupiedSlots,
      start,
      end,
      eventId,
      eventType,
      locationId,
    );
  }

  /**
   * Reserve a time slot for an event with travel time handling.
   * Travel is stored as occupied slots (not SimpleEvents) that can be reclaimed
   * by same-location tasks inserted later.
   *
   * @param start - Task start time (after buffer, after travel-before)
   * @param end - Task end time
   * @param eventId - ID of the event being placed
   * @param eventType - Type of the event
   * @param taskLocationId - Location of the task being placed (null = "everywhere")
   * @param travelBefore - Minutes of travel needed before task (pre-calculated by caller)
   * @param travelAfter - Minutes of travel needed after task (pre-calculated by caller), 0 if reusing existing
   * @param prevLocationId - Location of the event before this slot
   * @param nextLocationId - Location of the event after this slot
   * @param reusableTravelStart - If reusing existing travel, the start time of that travel (for free slot end calculation)
   * @param absorbPrevTravelAfter - If true, the previous task was at the same location and its travel-after should be removed
   */
  reserveSlotWithTravel(
    start: Date,
    end: Date,
    eventId: string,
    eventType: "task" | "goal" | "plan" | "template",
    taskLocationId: string | null,
    travelBefore: number,
    travelAfter: number,
    prevLocationId: string | null,
    nextLocationId: string | null,
    reusableTravelStart?: Date | null,
    absorbPrevTravelAfter?: boolean,
    reclaimPrecedingGapTravel?: TimeSlot | null,
  ): { success: boolean } {
    return reserveSlotWithTravel(
      this.availableSlots,
      this.occupiedSlots,
      this.travelManager,
      this.bufferTimeMinutes,
      start,
      end,
      eventId,
      eventType,
      taskLocationId,
      travelBefore,
      travelAfter,
      prevLocationId,
      nextLocationId,
      reusableTravelStart,
      absorbPrevTravelAfter,
      reclaimPrecedingGapTravel,
    );
  }
}
