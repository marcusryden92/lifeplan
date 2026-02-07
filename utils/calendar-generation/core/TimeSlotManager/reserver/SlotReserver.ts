import { TimeSlot, TimeSlotUtils } from "../../../models/TimeSlot";
import { TravelManager } from "../travel/TravelManager";
import { SCHEDULING_CONFIG } from "../../../constants";

/**
 * SlotReserver
 * Handles reservation of time slots and manages travel time before/after events
 */
export class SlotReserver {
  constructor(
    private availableSlots: Map<string, TimeSlot[]>,
    private occupiedSlots: Map<string, TimeSlot[]>,
    private travelManager: TravelManager,
    private getDayKeyFn: (date: Date) => string,
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
    const dayKey = this.getDayKeyFn(start);
    const slots = this.availableSlots.get(dayKey);

    if (!slots) return false;

    // Convert dates to timestamps for reliable comparison
    const startTime = start.getTime();
    const endTime = end.getTime();

    // Find the slot that can contain this time range
    const slotIndex = slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.start.getTime() <= startTime &&
        slot.end.getTime() >= endTime,
    );

    if (slotIndex === -1) return false;

    const slot = slots[slotIndex];

    // Split the slot and mark the middle part as occupied
    // Pass locationId to update adjacent slot locations
    const newSlots = TimeSlotUtils.occupySlot(
      slot,
      start,
      end,
      eventId,
      eventType,
      locationId,
    );

    // Replace the old slot with the new slots (keeping only available ones)
    const availableNewSlots = newSlots.filter((s) => s.isAvailable);
    slots.splice(slotIndex, 1, ...availableNewSlots);

    // Track occupied slot
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
    occupiedSlots.push(...newSlots.filter((s) => !s.isAvailable));
    this.occupiedSlots.set(dayKey, occupiedSlots);

    return true;
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
  ): { success: boolean } {
    const dayKey = this.getDayKeyFn(start);
    const slots = this.availableSlots.get(dayKey);

    if (!slots) {
      return { success: false };
    }

    const bufferMinutes = this.bufferTimeMinutes;

    // Layout with "travel at END of slot" model:
    // [travelBefore] [buffer] [task] [buffer] [FREE SPACE] [buffer] [travelAfter at slot.end]
    //
    // Travel-after is anchored to the END of the original slot (right before next template).
    // Free space between task and travel-after allows subsequent same-location tasks.
    // When next task is scheduled, travel-after shifts forward (is removed and re-added).

    // Travel before: ends at (start - buffer), starts at (start - buffer - travelBefore)
    const travelBeforeEnd =
      travelBefore > 0
        ? new Date(start.getTime() - bufferMinutes * 60000)
        : start;
    const travelBeforeStart =
      travelBefore > 0
        ? new Date(travelBeforeEnd.getTime() - travelBefore * 60000)
        : start;

    // Calculate fullStart for finding the slot:
    // - With travelBefore: starts at travelBeforeStart
    // - Without travelBefore: starts at task start
    const fullStart = travelBefore > 0 ? travelBeforeStart : start;

    // Task reservation end (task + trailing buffer)
    const taskReserveEnd = new Date(end.getTime() + bufferMinutes * 60000);

    // Find the slot that contains at minimum [fullStart, taskReserveEnd]
    // We'll place travel-after at the END of this slot (not right after task)
    const slotIndex = slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.start.getTime() <= fullStart.getTime() &&
        slot.end.getTime() >= taskReserveEnd.getTime(),
    );

    if (slotIndex === -1) {
      return { success: false };
    }

    const slot = slots[slotIndex];
    const newSlots: TimeSlot[] = [];
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];

    // Calculate travel-after position
    // If there's existing travel to the same destination NEAR the slot end, use its end position (travel shifts forward).
    // Otherwise, use slot.end (right before next template starts).
    let travelAfterEnd: Date | null = null;
    let travelAfterStart: Date | null = null;

    if (travelAfter > 0 && nextLocationId) {
      // Look for existing travel going to the same destination that's near our slot end
      // This ensures we don't pick up unrelated travel (like morning commute) when scheduling afternoon tasks
      const slotEndTime = slot.end.getTime();
      const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

      const existingTravel = occupiedSlots.find((occ) => {
        if (!TimeSlotUtils.isTravelSlot(occ)) return false;
        if (occ.travelToLocationId !== nextLocationId) return false;
        // Only match if the travel ends within the search window of our slot end
        const travelEndTime = occ.end.getTime();
        return Math.abs(travelEndTime - slotEndTime) < searchWindowMs;
      });

      if (existingTravel) {
        // Use existing travel's end position (it will be replaced)
        travelAfterEnd = new Date(existingTravel.end.getTime());
      } else {
        // No existing travel near slot end, use slot.end
        travelAfterEnd = new Date(slot.end.getTime());
      }
      travelAfterStart = new Date(
        travelAfterEnd.getTime() - travelAfter * 60000,
      );
    }

    // 1. Slot before everything (available) - from slot.start to fullStart
    // The slot BEFORE a task should have nextLocationId = taskLocationId (where we're going)
    if (fullStart.getTime() > slot.start.getTime()) {
      newSlots.push({
        start: slot.start,
        end: fullStart,
        durationMinutes: Math.floor(
          (fullStart.getTime() - slot.start.getTime()) / 60000,
        ),
        isAvailable: true,
        prevLocationId: slot.prevLocationId,
        nextLocationId: taskLocationId ?? slot.nextLocationId,
      });
    }

    // 2. Travel slot BEFORE the task (if needed)
    // Track if we removed a travelAfter that was placed by a previous task - we'll need to
    // extend the slot end to reclaim that space
    let removedTravelAfterEnd: Date | null = null;

    if (travelBefore > 0 && prevLocationId && taskLocationId) {
      // Remove any existing travel going TO the same destination (taskLocationId)
      // that is NEAR this task's start time. This handles the case where buildAvailableSlots
      // created travel for template-to-template but now a dynamic task is being placed
      // that needs its own travel-before.
      // IMPORTANT: Only remove travel near this task - don't remove unrelated travel
      // (e.g., morning commute shouldn't be removed when scheduling afternoon task)
      const taskStartTime = start.getTime();
      const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

      for (let i = occupiedSlots.length - 1; i >= 0; i--) {
        const occ = occupiedSlots[i];
        if (
          TimeSlotUtils.isTravelSlot(occ) &&
          occ.travelToLocationId === taskLocationId
        ) {
          // Only remove if travel ends near where this task starts
          const travelEndTime = occ.end.getTime();
          const isNearTaskStart =
            Math.abs(travelEndTime - taskStartTime) < searchWindowMs;

          if (isNearTaskStart) {
            // Track the removed travel's end time - this was a travelAfter from a previous task
            // that we're now replacing with our travelBefore. The slot should extend to this end time.
            removedTravelAfterEnd = new Date(occ.end.getTime());
            occupiedSlots.splice(i, 1);
          }
        }
      }

      const travelSlot = TimeSlotUtils.createTravelSlot(
        travelBeforeStart,
        travelBeforeEnd,
        prevLocationId,
        taskLocationId,
        `travel-to-${eventId}`,
      );
      newSlots.push(travelSlot);
    }

    // 3. The task itself (occupied) - NOT added to newSlots, just to occupiedSlots
    const taskSlot: TimeSlot = {
      start,
      end,
      durationMinutes: Math.floor((end.getTime() - start.getTime()) / 60000),
      isAvailable: false,
      eventId,
      eventType,
      prevLocationId: taskLocationId,
      nextLocationId: taskLocationId,
    };

    // 4. FREE slot BETWEEN task+buffer and travel-after (or slot.end if no travel)
    // When there's travel-after, the FREE slot ends at [buffer] before the travel.
    // This ensures no overlap between available slot and travel.
    const freeSlotStart = taskReserveEnd;
    // If travel-after exists, FREE slot ends at buffer before travel. Otherwise, extends to slot.end.
    // Note: travelAfterStart might be positioned at existing travel's end (shifted forward case)
    let freeSlotEnd: Date;

    // IMPORTANT: If task location matches nextLocationId, no travel is needed after this task.
    // But the slot may have been pre-shrunk by buildAvailableSlots which created travel.
    // We need to find and remove that pre-created travel and extend freeSlotEnd to the actual next event start.
    let reclaimedTravelEnd: Date | null = null;
    if (
      travelAfter === 0 &&
      taskLocationId &&
      nextLocationId &&
      taskLocationId === nextLocationId
    ) {
      // Task is at same location as next event - find and remove pre-created travel
      const slotEndTime = slot.end.getTime();
      const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

      for (let i = occupiedSlots.length - 1; i >= 0; i--) {
        const occ = occupiedSlots[i];
        if (
          TimeSlotUtils.isTravelSlot(occ) &&
          occ.travelToLocationId === nextLocationId
        ) {
          // Check if this travel ends near our slot end (i.e., it's the pre-created travel for this gap)
          const travelEndTime = occ.end.getTime();
          // The travel should end AFTER slot.end since slot was shrunk to make room for it
          const meetsCondition =
            travelEndTime > slotEndTime &&
            travelEndTime - slotEndTime < searchWindowMs;
          if (meetsCondition) {
            reclaimedTravelEnd = new Date(occ.end.getTime());
            occupiedSlots.splice(i, 1);
            break;
          }
        }
      }
    }

    if (travelAfterStart) {
      freeSlotEnd = new Date(
        travelAfterStart.getTime() - bufferMinutes * 60000,
      );
    } else if (reclaimedTravelEnd) {
      // Use the reclaimed travel's end time (actual next event start)
      freeSlotEnd = reclaimedTravelEnd;
    } else if (removedTravelAfterEnd) {
      // We removed a travelAfter from a previous task when creating our travelBefore
      // (because our travelBefore goes to the same destination). The slot should extend
      // to where that removed travel ended (the actual next event start).
      freeSlotEnd = removedTravelAfterEnd;
    } else if (reusableTravelStart) {
      // We're reusing existing travel (travelAfter=0), so the free slot ends where that travel starts (minus buffer)
      freeSlotEnd = new Date(
        reusableTravelStart.getTime() - bufferMinutes * 60000,
      );
    } else {
      freeSlotEnd = slot.end;
    }
    const freeSlotPrevLocation = taskLocationId ?? slot.prevLocationId;

    if (freeSlotEnd.getTime() > freeSlotStart.getTime()) {
      newSlots.push({
        start: freeSlotStart,
        end: freeSlotEnd,
        durationMinutes: Math.floor(
          (freeSlotEnd.getTime() - freeSlotStart.getTime()) / 60000,
        ),
        isAvailable: true,
        prevLocationId: freeSlotPrevLocation,
        nextLocationId: slot.nextLocationId, // Still points to next template
      });
    }

    // 5. Handle travel-after: remove existing travel going to same destination AND in the same slot region
    // We only remove travel that's being "shifted forward" by this task - not unrelated travel elsewhere
    if (travelAfter > 0 && nextLocationId && travelAfterStart) {
      // Remove existing travel slots going TO nextLocationId that are near the end of our slot
      // This handles the "travel shifts forward" case where buildAvailableSlots created travel
      // for template-to-template transitions, and now a dynamic task fills part of the gap
      const slotEndTime = slot.end.getTime();
      const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

      for (let i = occupiedSlots.length - 1; i >= 0; i--) {
        const occ = occupiedSlots[i];
        if (TimeSlotUtils.isTravelSlot(occ)) {
          // Only remove if:
          // 1. Goes to same destination
          // 2. Ends within the search window of our slot's end (i.e., it's the travel we're replacing)
          const travelEndTime = occ.end.getTime();
          const isNearSlotEnd =
            Math.abs(travelEndTime - slotEndTime) < searchWindowMs;

          if (occ.travelToLocationId === nextLocationId && isNearSlotEnd) {
            occupiedSlots.splice(i, 1);
          }
        }
      }
    }

    // Add new travel-after at the END of the slot
    if (
      travelAfter > 0 &&
      travelAfterStart &&
      travelAfterEnd &&
      taskLocationId &&
      nextLocationId
    ) {
      const travelSlot = TimeSlotUtils.createTravelSlot(
        travelAfterStart,
        travelAfterEnd,
        taskLocationId,
        nextLocationId,
        `travel-from-${eventId}`,
      );
      newSlots.push(travelSlot);
    }

    // Replace the old slot with new available slots only
    const availableNewSlots = newSlots.filter((s) => s.isAvailable);
    slots.splice(slotIndex, 1, ...availableNewSlots);

    // Track all occupied slots (task + travel)
    occupiedSlots.push(taskSlot);
    occupiedSlots.push(...newSlots.filter((s) => !s.isAvailable));
    this.occupiedSlots.set(dayKey, occupiedSlots);

    return { success: true };
  }
}
