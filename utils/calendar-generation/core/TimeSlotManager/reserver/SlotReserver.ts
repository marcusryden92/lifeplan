import { TimeSlot, TimeSlotUtils } from "../../../models/TimeSlot";
import { TravelManager } from "../travel/TravelManager";
import { SCHEDULING_CONFIG } from "../../../constants";
import { v4 as uuidv4 } from "uuid";

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
    const dayKey = this.getDayKeyFn(start);
    const slots = this.availableSlots.get(dayKey);

    if (!slots) {
      return { success: false };
    }

    const bufferMinutes = this.bufferTimeMinutes;
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];

    // Absorb previous task's travel-after if this task is at the same location.
    // Must happen before slot search since the task start is in the reclaimed space.
    if (absorbPrevTravelAfter && taskLocationId) {
      const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;
      for (let i = occupiedSlots.length - 1; i >= 0; i--) {
        const occ = occupiedSlots[i];
        if (
          TimeSlotUtils.isTravelSlot(occ) &&
          occ.travelFromLocationId === taskLocationId &&
          occ.travelType === "outbound"
        ) {
          // Find the available slot that starts near where this travel ends
          const travelEndTime = occ.end.getTime();
          for (const availSlot of slots) {
            if (!availSlot.isAvailable) continue;
            const timeDiff = Math.abs(availSlot.start.getTime() - travelEndTime);
            if (timeDiff <= searchWindowMs) {
              // Expand the available slot backward to include the reclaimed travel space
              availSlot.start = occ.start;
              availSlot.durationMinutes = Math.floor(
                (availSlot.end.getTime() - availSlot.start.getTime()) / 60000,
              );
              availSlot.prevLocationId = taskLocationId;
              occupiedSlots.splice(i, 1);
              break;
            }
          }
          break;
        }
      }
    }

    // Reclaim a preceding gap travel (e.g. Gamla Stan → Home) by removing it and expanding
    // the available slot backward. The caller has already set prevLocationId to the gap
    // travel's real fromLocationId and travelBefore to the direct route duration.
    // Must happen before the slot search so the expanded slot is visible.
    if (reclaimPrecedingGapTravel) {
      const gapTravel = reclaimPrecedingGapTravel;
      const gapIdx = occupiedSlots.findIndex((s) => s.eventId === gapTravel.eventId);
      if (gapIdx !== -1) {
        occupiedSlots.splice(gapIdx, 1);
        // Expand the available slot backward to cover the reclaimed gap travel window
        const expectedSlotStart = gapTravel.end.getTime() + bufferMinutes * 60000;
        const searchWindowMs = bufferMinutes * 60000 + 10 * 60 * 1000;
        for (const availSlot of slots) {
          if (!availSlot.isAvailable) continue;
          const diff = Math.abs(availSlot.start.getTime() - expectedSlotStart);
          if (diff <= searchWindowMs) {
            availSlot.start = gapTravel.start;
            availSlot.durationMinutes = Math.floor(
              (availSlot.end.getTime() - availSlot.start.getTime()) / 60000,
            );
            availSlot.prevLocationId =
              gapTravel.travelFromLocationId ?? availSlot.prevLocationId;
            break;
          }
        }
      }
    }

    // Layout: [travelBefore] [buffer] [task] [buffer] [travel-after] [buffer] [FREE SPACE]
    // Travel-after is placed right after the task so it appears between consecutive tasks.

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

    // Calculate travel-after position
    // Place travel right after the task + buffer, so the layout is:
    // [task] [buffer] [travel-after] [FREE]
    // This ensures travel appears between the task and subsequent tasks in the slot.
    let travelAfterEnd: Date | null = null;
    let travelAfterStart: Date | null = null;

    if (travelAfter > 0 && nextLocationId) {
      travelAfterStart = new Date(
        end.getTime() + bufferMinutes * 60000,
      );
      travelAfterEnd = new Date(
        travelAfterStart.getTime() + travelAfter * 60000,
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
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
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
        "inbound",
        uuidv4(),
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

    // 4. FREE slot AFTER task (and after travel-after if present)
    // Layout: [task] [buffer] [travel-after] [buffer] [FREE] ... [slot.end]
    // If no travel-after: [task] [buffer] [FREE] ... [slot.end]

    // Reclaim pre-carved category/gap travel if task is at the same location as the destination
    let reclaimedTravelEnd: Date | null = null;
    if (
      travelAfter === 0 &&
      taskLocationId &&
      nextLocationId &&
      taskLocationId === nextLocationId
    ) {
      const slotEndTime = slot.end.getTime();
      const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

      for (let i = occupiedSlots.length - 1; i >= 0; i--) {
        const occ = occupiedSlots[i];
        if (
          TimeSlotUtils.isTravelSlot(occ) &&
          occ.travelToLocationId === nextLocationId
        ) {
          // Only reclaim pre-carved category/gap travel, not dynamic task-to-task travel.
          const isPreCarved = occ.travelType === "preliminary";
          if (!isPreCarved) continue;

          const travelEndTime = occ.end.getTime();
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

    // Determine free slot start.
    // No extra buffer added here — buffers are injected at task placement time via leadingBuffer.
    // Consecutive tasks get exactly one buffer (leadingBuffer) between them.
    let freeSlotStart: Date;
    if (travelAfterEnd) {
      freeSlotStart = travelAfterEnd;
    } else {
      freeSlotStart = end;
    }

    // Determine free slot end
    let freeSlotEnd: Date;
    if (reclaimedTravelEnd) {
      freeSlotEnd = reclaimedTravelEnd;
    } else if (removedTravelAfterEnd) {
      freeSlotEnd = removedTravelAfterEnd;
    } else if (reusableTravelStart) {
      freeSlotEnd = reusableTravelStart;
    } else {
      freeSlotEnd = slot.end;
    }

    // After travel-after, the prev location is the travel destination (nextLocationId)
    const freeSlotPrevLocation = travelAfterEnd
      ? (nextLocationId ?? taskLocationId ?? slot.prevLocationId)
      : (taskLocationId ?? slot.prevLocationId);

    if (freeSlotEnd.getTime() > freeSlotStart.getTime()) {
      newSlots.push({
        start: freeSlotStart,
        end: freeSlotEnd,
        durationMinutes: Math.floor(
          (freeSlotEnd.getTime() - freeSlotStart.getTime()) / 60000,
        ),
        isAvailable: true,
        prevLocationId: freeSlotPrevLocation,
        nextLocationId: slot.nextLocationId,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
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

    // Add new travel-after right after the task
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
        "outbound",
        uuidv4(),
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
