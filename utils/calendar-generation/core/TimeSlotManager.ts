// Local enum for ItemType to match schema
export enum ItemTypeEnum {
  task = "task",
  plan = "plan",
  goal = "goal",
  template = "template",
}
// Strict type for dynamic scheduling items
export interface DynamicScheduleItem {
  id: string;
  durationMinutes: number;
  title: string;
  extendedProps?: {
    id: string;
    itemType: string;
    completedStartTime: string | null;
    completedEndTime: string | null;
    parentId: string | null;
    eventId: string;
  };
  backgroundColor?: string;
}
/**
 * TimeSlotManager
 * Efficient management of available time slots for scheduling.
 */

import { SimpleEvent } from "@/types/prisma";
import { TimeSlot, TimeSlotUtils } from "../models/TimeSlot";
import {
  Interval,
  eventsToIntervals,
  findGaps,
  findLocationTransitions,
  gapsToTimeSlots,
  masksToIntervals,
  PerTemplateMask,
} from "../utils/intervalUtils";
import { dateTimeService } from "../utils/dateTimeService";
import { SCHEDULING_CONFIG } from "../constants";
import { WeekDayIntegers } from "@/types/calendarTypes";

import { EventTemplate } from "@/types/prisma";
import { TemplateExpander } from "./TemplateExpander";
import { TravelTimeEntry } from "../models/SchedulingModels";

export class TimeSlotManager {
  private availableSlots: Map<string, TimeSlot[]> = new Map();
  private occupiedSlots: Map<string, TimeSlot[]> = new Map();
  private bufferTimeMinutes: number = 0;
  private travelTimeMatrix: Map<string, TravelTimeEntry> | null = null;

  constructor(
    private weekStartDay: WeekDayIntegers,
    private currentDate: Date = new Date(),
    bufferTimeMinutes: number = 0,
    travelTimeMatrix?: Map<string, TravelTimeEntry>
  ) {
    this.bufferTimeMinutes = bufferTimeMinutes;
    this.travelTimeMatrix = travelTimeMatrix ?? null;
  }

  /**
   * Set the travel time matrix for location-aware scheduling
   */
  setTravelTimeMatrix(matrix: Map<string, TravelTimeEntry> | null): void {
    this.travelTimeMatrix = matrix;
  }

  /**
   * Get travel time between two locations based on time of day
   * Returns 0 if either location is null (meaning "Everywhere") or if no travel entry exists
   */
  getTravelTime(
    fromLocationId: string | null,
    toLocationId: string | null,
    timeOfDay: Date
  ): number {
    // No travel needed if either location is null ("Everywhere") or same location
    if (!fromLocationId || !toLocationId || fromLocationId === toLocationId) {
      // console.log(`[getTravelTime] Returning 0: from=${fromLocationId} to=${toLocationId}`);
      return 0;
    }

    if (!this.travelTimeMatrix) {
      // console.log(`[getTravelTime] Returning 0: no travel matrix`);
      return 0;
    }

    const travelKey = `${fromLocationId}->${toLocationId}`;
    const entry = this.travelTimeMatrix.get(travelKey);

    // console.log(`[getTravelTime] Looking up key: ${travelKey}, found: ${entry ? 'yes' : 'no'}`);
    if (!entry) {
      // Debug: Log all available keys
      // console.log(`[getTravelTime] Available keys in matrix:`);
      this.travelTimeMatrix.forEach((_, key) => console.log(`  ${key}`));
      return 0;
    }

    // Determine which travel time to use based on time of day
    const hour = timeOfDay.getHours();

    if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 19)) {
      // Rush hour
      return entry.rushHourMinutes;
    } else if (hour >= 22 || hour < 6) {
      // Night
      return entry.nightMinutes;
    } else {
      // Regular
      return entry.regularMinutes;
    }
  }

  /**
   * Get effective slot capacity (just the slot duration)
   * NOTE: Travel time is handled in post-processing, not during slot fitting
   */
  getEffectiveSlotCapacity(slot: TimeSlot): number {
    return slot.durationMinutes;
  }

  /**
   * Build available time slots for a date range
   * @param templateMasks - Template masks for determining occupied time (no SimpleEvent generation needed)
   * @param plannerLocationMap - Optional map of planner ID to location ID for tracking slot neighbors
   */
  buildAvailableSlots(
    startDate: Date,
    endDate: Date,
    existingEvents: SimpleEvent[],
    templateMasks: PerTemplateMask[],
    plannerLocationMap?: Map<string, string | null>
  ): TimeSlot[] {
    // Filter existing events to only those that overlap with this date range
    // Exclude template events since we create intervals from masks instead
    const relevantEvents = existingEvents.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const isTemplate = event.extendedProps?.itemType === "template";
      // Event overlaps if it starts before range ends AND ends after range starts
      return !isTemplate && eventStart < endDate && eventEnd > startDate;
    });

    // Convert existing events to intervals with location info
    const eventIntervals = eventsToIntervals(
      relevantEvents,
      plannerLocationMap
    );

    // Convert template masks directly to intervals for this date (no SimpleEvent creation)
    // Templates are handled via masks to avoid duplication
    const templateIntervals = masksToIntervals(templateMasks, startDate);

    // Combine all occupied intervals
    const occupiedIntervals = [...eventIntervals, ...templateIntervals];

    // Find gaps between occupied intervals (gaps now have prevLocationId/nextLocationId)
    const gaps = findGaps(occupiedIntervals, startDate, endDate);

    // Convert gaps to available time slots (location info is preserved)
    let slots = gapsToTimeSlots(gaps);

    // Apply leading buffer to slots that have a preceding event
    // This ensures tasks don't touch the template/event before them
    // Slots after reserved tasks already have buffer baked in (taskReserveEnd = task.end + buffer)
    // We identify "start of range" slots by comparing slot.start to startDate
    if (this.bufferTimeMinutes > 0) {
      const rangeStartTime = startDate.getTime();
      slots = slots.map((slot) => {
        // Only apply leading buffer if this slot doesn't start at the range beginning
        // (meaning there's a preceding event/template before this slot)
        const isStartOfRange = slot.start.getTime() === rangeStartTime;
        if (!isStartOfRange) {
          const newStart = new Date(slot.start.getTime() + this.bufferTimeMinutes * 60000);
          const newDuration = Math.floor((slot.end.getTime() - newStart.getTime()) / 60000);
          // Only shrink if there's still usable time left
          if (newDuration > 0) {
            return {
              ...slot,
              start: newStart,
              durationMinutes: newDuration,
            };
          }
        }
        return slot;
      }).filter((slot) => slot.durationMinutes > 0);
    }

    // Create travel slots between adjacent events with different locations
    if (plannerLocationMap) {
      const allIntervals: Interval[] = [
        ...eventIntervals,
        ...templateIntervals,
      ];
      this.processTravelTransitions(startDate, allIntervals, slots);
    }

    // Merge adjacent slots (preserve location info from first slot in merge)
    return TimeSlotUtils.mergeAdjacentSlots(slots);
  }

  /**
   * Process location transitions to create travel slots
   * Handles: normal travel, insufficient travel (partial), and trespassing (no travel)
   * Modifies slots array in place and adds travel slots to occupiedSlots
   */
  private processTravelTransitions(
    startDate: Date,
    intervals: Interval[],
    slots: TimeSlot[]
  ): void {
    const dayKey = this.getDayKey(startDate);
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
    const transitions = findLocationTransitions(intervals);

    for (const transition of transitions) {
      const requiredTravelMinutes = this.getTravelTime(
        transition.fromLocationId,
        transition.toLocationId,
        transition.toEventStart
      );

      if (requiredTravelMinutes <= 0) continue;

      const availableMinutes = transition.gapMinutes;

      if (transition.isTrespassing) {
        // Events overlap or touch exactly - NO travel event is created
        // Trespassing indicators are added to events in CalendarGenerator
        continue;
      }

      if (availableMinutes < requiredTravelMinutes) {
        // Insufficient space - create travel that fills available space
        this.createInsufficientTravelSlot(
          transition,
          requiredTravelMinutes,
          slots,
          occupiedSlots
        );
      } else {
        // Normal case - enough space for full travel
        this.createNormalTravelSlot(
          transition,
          requiredTravelMinutes,
          slots,
          occupiedSlots
        );
      }
    }

    this.occupiedSlots.set(dayKey, occupiedSlots);
  }

  /**
   * Create a travel slot when there's insufficient time (fills available space)
   */
  private createInsufficientTravelSlot(
    transition: ReturnType<typeof findLocationTransitions>[number],
    requiredTravelMinutes: number,
    slots: TimeSlot[],
    occupiedSlots: TimeSlot[]
  ): void {
    const travelEnd = new Date(transition.toEventStart.getTime());
    const travelStart = new Date(transition.fromEventEnd.getTime());

    const travelSlot = TimeSlotUtils.createTravelSlot(
      travelStart,
      travelEnd,
      transition.fromLocationId!,
      transition.toLocationId!,
      `travel-insufficient-${transition.toEventStart.getTime()}`,
      {
        insufficientTravel: true,
        requiredTravelMinutes,
      }
    );
    occupiedSlots.push(travelSlot);

    // Shrink the corresponding available slot
    const correspondingSlot = slots.find(
      (s) =>
        s.end.getTime() === transition.toEventStart.getTime() &&
        s.prevLocationId === transition.fromLocationId
    );
    if (correspondingSlot) {
      correspondingSlot.end = travelStart;
      correspondingSlot.durationMinutes = Math.floor(
        (correspondingSlot.end.getTime() - correspondingSlot.start.getTime()) /
          60000
      );
    }
  }

  /**
   * Create a travel slot when there's enough time for full travel
   * Travel is placed at the END of the slot (right before the next event)
   */
  private createNormalTravelSlot(
    transition: ReturnType<typeof findLocationTransitions>[number],
    requiredTravelMinutes: number,
    slots: TimeSlot[],
    occupiedSlots: TimeSlot[]
  ): void {
    const bufferMs = this.bufferTimeMinutes * 60000;
    const travelMs = requiredTravelMinutes * 60000;

    const travelEnd = new Date(transition.toEventStart.getTime());
    const travelStart = new Date(travelEnd.getTime() - travelMs);

    const correspondingSlot = slots.find(
      (s) =>
        s.end.getTime() === transition.toEventStart.getTime() &&
        s.prevLocationId === transition.fromLocationId
    );

    if (
      correspondingSlot &&
      travelStart.getTime() > correspondingSlot.start.getTime() + bufferMs
    ) {
      const travelSlot = TimeSlotUtils.createTravelSlot(
        travelStart,
        travelEnd,
        transition.fromLocationId!,
        transition.toLocationId!,
        `travel-gap-${correspondingSlot.start.getTime()}`
      );
      occupiedSlots.push(travelSlot);

      // Shrink the available slot to end at buffer before travel
      correspondingSlot.end = new Date(travelStart.getTime() - bufferMs);
      correspondingSlot.durationMinutes = Math.floor(
        (correspondingSlot.end.getTime() - correspondingSlot.start.getTime()) /
          60000
      );
    }
  }

  /**
   * Build slots for multiple days at once
   * @param plannerLocationMap - Optional map of planner ID to location ID for tracking slot neighbors
   */
  buildDailySlots(
    startDate: Date,
    numDays: number,
    existingEvents: SimpleEvent[],
    templateMasks: PerTemplateMask[],
    plannerLocationMap?: Map<string, string | null>
  ): Map<string, TimeSlot[]> {
    const dailySlots = new Map<string, TimeSlot[]>();

    for (let i = 0; i < numDays; i++) {
      const date = dateTimeService.shiftDays(startDate, i);
      const dayKey = this.getDayKey(date);
      const dayStart = dateTimeService.startOfDay(date);
      const dayEnd = dateTimeService.endOfDay(date);

      const daySlots = this.buildAvailableSlots(
        dayStart,
        dayEnd,
        existingEvents,
        templateMasks,
        plannerLocationMap
      );

      dailySlots.set(dayKey, daySlots);
      this.availableSlots.set(dayKey, daySlots);
    }

    return dailySlots;
  }

  /**
   * Find the first available slot that can fit a duration (plus buffer time for reservation)
   */
  findFirstFit(
    durationMinutes: number,
    afterDate: Date = this.currentDate,
    maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH
  ): TimeSlot | null {
    const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
    let currentDate = new Date(afterDate);

    // Account for buffer time on both sides of the event
    const requiredMinutes = durationMinutes + 2 * this.bufferTimeMinutes;

    while (currentDate <= searchEndDate) {
      const dayKey = this.getDayKey(currentDate);
      const slots = this.availableSlots.get(dayKey);

      if (slots) {
        for (const slot of slots) {
          // Skip if slot is before our search start time
          if (slot.end <= afterDate) continue;

          // Adjust slot start if it begins before afterDate
          const effectiveStart =
            slot.start < afterDate ? afterDate : slot.start;
          const effectiveMinutes = dateTimeService.getMinutesDifference(
            effectiveStart,
            slot.end
          );

          if (effectiveMinutes >= requiredMinutes) {
            return {
              ...slot,
              start: effectiveStart,
              durationMinutes: effectiveMinutes,
            };
          }
        }
      }

      // Move to next day
      currentDate = dateTimeService.shiftDays(currentDate, 1);
    }

    return null;
  }

  /**
   * Find all slots that could potentially fit a duration (plus buffer time)
   * Does NOT filter by travel time - caller should check capacity based on location match
   * Preserves location info (prevLocationId, nextLocationId) on returned slots
   */
  findAllFittingSlots(
    durationMinutes: number,
    afterDate: Date = this.currentDate,
    maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH
  ): TimeSlot[] {
    const fittingSlots: TimeSlot[] = [];
    const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
    let currentDate = new Date(afterDate);

    // Base required time: task duration + 1 buffer (minimum)
    // The Scheduler will do the final capacity check including travel time
    const baseRequiredMinutes = durationMinutes + this.bufferTimeMinutes;

    // DEBUG: Log first day's available slots
    const firstDayKey = this.getDayKey(afterDate);
    const firstDaySlots = this.availableSlots.get(firstDayKey);
    console.log(`[findAllFittingSlots] afterDate=${afterDate.toISOString()} dayKey=${firstDayKey} availableSlots=${firstDaySlots?.length ?? 0} baseRequired=${baseRequiredMinutes}`);
    if (firstDaySlots && firstDaySlots.length <= 10) {
      firstDaySlots.forEach((s, i) => {
        const passes = s.end > afterDate && Math.floor((Math.max(s.start.getTime(), afterDate.getTime()) - s.end.getTime()) / -60000) >= baseRequiredMinutes;
        console.log(`  slot[${i}]: ${s.start.toISOString().slice(11,16)}-${s.end.toISOString().slice(11,16)} dur=${s.durationMinutes}min passes=${passes}`);
      });
    }

    while (currentDate <= searchEndDate) {
      const dayKey = this.getDayKey(currentDate);
      const slots = this.availableSlots.get(dayKey);

      if (slots) {
        for (const slot of slots) {
          if (slot.end <= afterDate) continue;

          const effectiveStart =
            slot.start < afterDate ? afterDate : slot.start;
          const effectiveMinutes = dateTimeService.getMinutesDifference(
            effectiveStart,
            slot.end
          );

          // Only check if slot can fit base requirement (duration + buffer)
          // Travel time capacity is checked later after scoring
          if (effectiveMinutes >= baseRequiredMinutes) {
            fittingSlots.push({
              ...slot,
              start: effectiveStart,
              durationMinutes: effectiveMinutes,
              // Preserve location info for scoring and capacity check
              prevLocationId: slot.prevLocationId,
              nextLocationId: slot.nextLocationId,
            });
          }
        }
      }

      currentDate = dateTimeService.shiftDays(currentDate, 1);
    }

    return fittingSlots;
  }

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
    locationId?: string | null
  ): boolean {
    const dayKey = this.getDayKey(start);
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
        slot.end.getTime() >= endTime
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
      locationId
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
   * Reserve a time slot with travel-after placed at the END of the original slot.
   *
   * Layout: [task reservation] [FREE SLOT] [travel-after]
   *
   * The travel-after is anchored to the end (before the next template/event).
   * The free slot in between has prevLocationId = taskLocationId so subsequent
   * same-location tasks don't need travel-before.
   *
   * When the next task is placed in the free slot, travel-after shifts forward.
   *
   * @param taskReserveStart - Start of task reservation (includes leading buffer + travel-before if any)
   * @param taskReserveEnd - End of task reservation (task end + trailing buffer)
   * @param eventId - ID of the event being placed
   * @param eventType - Type of the event
   * @param taskLocationId - Location of the task (null = "everywhere", transparent for travel)
   * @param travelAfterMinutes - Minutes of travel needed after (0 if none)
   * @param nextLocationId - Location of the next event (for travel-after destination)
   */
  reserveSlotWithTravelAfter(
    taskReserveStart: Date,
    taskReserveEnd: Date,
    eventId: string,
    eventType: "task" | "goal" | "plan" | "template",
    taskLocationId: string | null,
    travelAfterMinutes: number,
    nextLocationId: string | null
  ): boolean {
    const dayKey = this.getDayKey(taskReserveStart);
    const slots = this.availableSlots.get(dayKey);

    if (!slots) return false;

    const bufferMinutes = this.bufferTimeMinutes;

    // Find the slot that contains the task reservation
    const slotIndex = slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.start.getTime() <= taskReserveStart.getTime() &&
        slot.end.getTime() >= taskReserveEnd.getTime()
    );

    if (slotIndex === -1) return false;

    const slot = slots[slotIndex];
    const newSlots: TimeSlot[] = [];

    // Calculate travel-after position at the END of the original slot
    // Layout at end: [buffer] [travel] ending at slot.end
    // The buffer separates the free slot from travel, travel ends at slot.end
    const travelAfterEnd =
      travelAfterMinutes > 0 ? new Date(slot.end.getTime()) : null;
    const travelAfterStart =
      travelAfterMinutes > 0 && travelAfterEnd
        ? new Date(travelAfterEnd.getTime() - travelAfterMinutes * 60000)
        : null;
    const travelAfterBufferStart = travelAfterStart
      ? new Date(travelAfterStart.getTime() - bufferMinutes * 60000)
      : null;

    // 1. Slot before task (if any space)
    if (taskReserveStart.getTime() > slot.start.getTime()) {
      newSlots.push({
        start: slot.start,
        end: taskReserveStart,
        durationMinutes: Math.floor(
          (taskReserveStart.getTime() - slot.start.getTime()) / 60000
        ),
        isAvailable: true,
        prevLocationId: slot.prevLocationId,
        nextLocationId: taskLocationId ?? slot.prevLocationId, // null tasks are transparent
      });
    }

    // 2. Task reservation (occupied) - this is NOT a slot we track, task event handles it
    // We just need to mark this time as used by splitting the slot

    // 3. Free slot BETWEEN task and travel-after
    // prevLocationId = taskLocationId (or preserved if task is null/everywhere)
    // nextLocationId = slot.nextLocationId (the template location)
    const freeSlotStart = taskReserveEnd;
    const freeSlotEnd = travelAfterBufferStart ?? slot.end;

    // Determine prevLocationId for free slot:
    // - If task has location: use task's location
    // - If task is null (everywhere): preserve the original slot's prevLocationId
    const freeSlotPrevLocation = taskLocationId ?? slot.prevLocationId;

    if (freeSlotEnd.getTime() > freeSlotStart.getTime()) {
      newSlots.push({
        start: freeSlotStart,
        end: freeSlotEnd,
        durationMinutes: Math.floor(
          (freeSlotEnd.getTime() - freeSlotStart.getTime()) / 60000
        ),
        isAvailable: true,
        prevLocationId: freeSlotPrevLocation,
        nextLocationId: slot.nextLocationId,
      });
    }

    // 4. Handle travel-after: remove any existing travel that ends near where the new travel would be,
    // then add new travel at the shifted position
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];

    // Remove any existing travel slot that ends near slot.end (the original template position)
    // This handles both:
    // - Travel placed by buildAvailableSlots (template-to-template)
    // - Travel placed by previous task scheduling that now needs to shift
    // We look for travel ending within 2 buffer periods of the original slot end
    const searchWindowStart =
      slot.end.getTime() - (3 * bufferMinutes * 60000 + 60 * 60000); // allow for up to 60min travel
    const searchWindowEnd = slot.end.getTime() + bufferMinutes * 60000;

    // Remove all travel slots that would be "overwritten" by placing this task
    for (let i = occupiedSlots.length - 1; i >= 0; i--) {
      const occ = occupiedSlots[i];
      if (
        TimeSlotUtils.isTravelSlot(occ) &&
        occ.end.getTime() >= searchWindowStart &&
        occ.end.getTime() <= searchWindowEnd
      ) {
        occupiedSlots.splice(i, 1);
      }
    }

    // Add new travel-after slot at the END of the remaining free space
    if (
      travelAfterMinutes > 0 &&
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
        `travel-from-${eventId}`
      );

      occupiedSlots.push(travelSlot);
    }

    this.occupiedSlots.set(dayKey, occupiedSlots);

    // Replace old slot with new available slots
    slots.splice(slotIndex, 1, ...newSlots);

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
    reusableTravelStart?: Date | null
  ): { success: boolean } {
    const dayKey = this.getDayKey(start);
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
        slot.end.getTime() >= taskReserveEnd.getTime()
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
      const searchWindowMs = 3 * 60 * 60 * 1000; // 3 hours

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
        travelAfterEnd.getTime() - travelAfter * 60000
      );
    }

    // 1. Slot before everything (available) - from slot.start to fullStart
    if (fullStart.getTime() > slot.start.getTime()) {
      newSlots.push({
        start: slot.start,
        end: fullStart,
        durationMinutes: Math.floor(
          (fullStart.getTime() - slot.start.getTime()) / 60000
        ),
        isAvailable: true,
        prevLocationId: slot.prevLocationId,
        nextLocationId: prevLocationId ?? taskLocationId,
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
      const searchWindowMs = 3 * 60 * 60 * 1000; // 3 hours

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
            console.log(`  [reserveSlotWithTravel] Removed existing travel to ${taskLocationId} ending at ${removedTravelAfterEnd.toISOString()}`);
            occupiedSlots.splice(i, 1);
          }
        }
      }

      const travelSlot = TimeSlotUtils.createTravelSlot(
        travelBeforeStart,
        travelBeforeEnd,
        prevLocationId,
        taskLocationId,
        `travel-to-${eventId}`
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
    const reserveDayKey = this.getDayKey(start);
    console.log(
      `  [reserveSlotWithTravel] dayKey=${reserveDayKey} Checking reclaim: travelAfter=${travelAfter} taskLoc=${taskLocationId} nextLoc=${nextLocationId} match=${taskLocationId === nextLocationId}`
    );
    if (
      travelAfter === 0 &&
      taskLocationId &&
      nextLocationId &&
      taskLocationId === nextLocationId
    ) {
      // Task is at same location as next event - find and remove pre-created travel
      const slotEndTime = slot.end.getTime();
      const searchWindowMs = 3 * 60 * 60 * 1000; // 3 hours

      console.log(
        `  [reserveSlotWithTravel] Looking for travel to ${nextLocationId} ending after slot.end=${slot.end.toISOString()} (slotEndTime=${slotEndTime})`
      );
      console.log(
        `  [reserveSlotWithTravel] occupiedSlots count: ${occupiedSlots.length}`
      );
      for (const occ of occupiedSlots) {
        if (TimeSlotUtils.isTravelSlot(occ)) {
          console.log(
            `    Travel: ${occ.start.toISOString()} to ${occ.end.toISOString()} -> ${occ.travelToLocationId}`
          );
        }
      }

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
          console.log(
            `    Checking travel ${occ.start.toISOString()}-${occ.end.toISOString()}: travelEndTime=${travelEndTime} > slotEndTime=${slotEndTime}? ${travelEndTime > slotEndTime}, diff=${travelEndTime - slotEndTime}ms < ${searchWindowMs}? ${travelEndTime - slotEndTime < searchWindowMs}, MATCH=${meetsCondition}`
          );
          if (meetsCondition) {
            reclaimedTravelEnd = new Date(occ.end.getTime());
            occupiedSlots.splice(i, 1);
            console.log(
              `  [reserveSlotWithTravel] Reclaimed pre-created travel to ${nextLocationId}, extending to ${reclaimedTravelEnd.toISOString()}`
            );
            break;
          }
        }
      }
      if (!reclaimedTravelEnd) {
        console.log(`  [reserveSlotWithTravel] No reclaimable travel found`);
      }
    }

    if (travelAfterStart) {
      freeSlotEnd = new Date(
        travelAfterStart.getTime() - bufferMinutes * 60000
      );
    } else if (reclaimedTravelEnd) {
      // Use the reclaimed travel's end time (actual next event start)
      freeSlotEnd = reclaimedTravelEnd;
    } else if (removedTravelAfterEnd) {
      // We removed a travelAfter from a previous task when creating our travelBefore
      // (because our travelBefore goes to the same destination). The slot should extend
      // to where that removed travel ended (the actual next event start).
      freeSlotEnd = removedTravelAfterEnd;
      console.log(`  [reserveSlotWithTravel] Extended freeSlotEnd to ${removedTravelAfterEnd.toISOString()} from removed travelAfter`);
    } else if (reusableTravelStart) {
      // We're reusing existing travel (travelAfter=0), so the free slot ends where that travel starts (minus buffer)
      freeSlotEnd = new Date(reusableTravelStart.getTime() - bufferMinutes * 60000);
      console.log(`  [reserveSlotWithTravel] Free slot ends at ${freeSlotEnd.toISOString()} (before reusable travel at ${reusableTravelStart.toISOString()})`);
    } else {
      freeSlotEnd = slot.end;
    }
    const freeSlotPrevLocation = taskLocationId ?? slot.prevLocationId;

    // DEBUG: Log free slot creation
    const freeSlotDuration = Math.floor(
      (freeSlotEnd.getTime() - freeSlotStart.getTime()) / 60000
    );
    console.log(
      `[reserveSlotWithTravel] eventId=${eventId} Creating free slot: ${freeSlotStart.toISOString()} to ${freeSlotEnd.toISOString()} (${freeSlotDuration}min) prev=${freeSlotPrevLocation} next=${slot.nextLocationId}`
    );
    console.log(
      `  travelAfterStart=${travelAfterStart?.toISOString() ?? "null"} slot.end=${slot.end.toISOString()}`
    );

    if (freeSlotEnd.getTime() > freeSlotStart.getTime()) {
      newSlots.push({
        start: freeSlotStart,
        end: freeSlotEnd,
        durationMinutes: Math.floor(
          (freeSlotEnd.getTime() - freeSlotStart.getTime()) / 60000
        ),
        isAvailable: true,
        prevLocationId: freeSlotPrevLocation,
        nextLocationId: slot.nextLocationId, // Still points to next template
      });
      console.log(`  -> Added free slot to newSlots`);
    } else {
      console.log(`  -> Free slot NOT added (end <= start)`);
    }

    // 5. Handle travel-after: remove existing travel going to same destination AND in the same slot region
    // We only remove travel that's being "shifted forward" by this task - not unrelated travel elsewhere
    if (travelAfter > 0 && nextLocationId && travelAfterStart) {
      // Remove existing travel slots going TO nextLocationId that are near the end of our slot
      // This handles the "travel shifts forward" case where buildAvailableSlots created travel
      // for template-to-template transitions, and now a dynamic task fills part of the gap
      const slotEndTime = slot.end.getTime();
      const searchWindowMs = 3 * 60 * 60 * 1000; // 3 hours - max reasonable travel + buffer window

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
        `travel-from-${eventId}`
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

  /**
   * Find fitting slots, considering that adjacent travel slots can be reclaimed
   * if the new task has the same location as the travel's origin.
   *
   * Returns slots with additional info about reclaimable travel time.
   */
  findAllFittingSlotsWithTravelReclaim(
    durationMinutes: number,
    taskLocationId: string | null,
    afterDate: Date = this.currentDate,
    maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH
  ): Array<
    TimeSlot & {
      reclaimableTravelBefore: number;
      reclaimableTravelAfter: number;
    }
  > {
    const fittingSlots: Array<
      TimeSlot & {
        reclaimableTravelBefore: number;
        reclaimableTravelAfter: number;
      }
    > = [];
    const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
    let currentDate = new Date(afterDate);

    const baseRequiredMinutes = durationMinutes + 2 * this.bufferTimeMinutes;

    while (currentDate <= searchEndDate) {
      const dayKey = this.getDayKey(currentDate);
      const availableSlots = this.availableSlots.get(dayKey) || [];
      const occupiedSlots = this.occupiedSlots.get(dayKey) || [];

      for (const slot of availableSlots) {
        if (slot.end <= afterDate) continue;

        const effectiveStart = slot.start < afterDate ? afterDate : slot.start;
        let effectiveMinutes = dateTimeService.getMinutesDifference(
          effectiveStart,
          slot.end
        );

        // Check for reclaimable travel slots adjacent to this available slot
        let reclaimableTravelBefore = 0;
        let reclaimableTravelAfter = 0;

        if (taskLocationId) {
          // Check for travel slot immediately BEFORE this available slot
          const travelBefore = occupiedSlots.find(
            (occ) =>
              TimeSlotUtils.isTravelSlot(occ) &&
              Math.abs(occ.end.getTime() - slot.start.getTime()) < 60000 &&
              occ.travelFromLocationId === taskLocationId
          );

          if (travelBefore) {
            reclaimableTravelBefore = travelBefore.durationMinutes;
            effectiveMinutes += reclaimableTravelBefore;
          }

          // Check for travel slot immediately AFTER this available slot
          const travelAfter = occupiedSlots.find(
            (occ) =>
              TimeSlotUtils.isTravelSlot(occ) &&
              Math.abs(occ.start.getTime() - slot.end.getTime()) < 60000 &&
              occ.travelFromLocationId === taskLocationId
          );

          if (travelAfter) {
            reclaimableTravelAfter = travelAfter.durationMinutes;
            effectiveMinutes += reclaimableTravelAfter;
          }
        }

        if (effectiveMinutes >= baseRequiredMinutes) {
          fittingSlots.push({
            ...slot,
            start: effectiveStart,
            durationMinutes: effectiveMinutes,
            prevLocationId: slot.prevLocationId,
            nextLocationId: slot.nextLocationId,
            reclaimableTravelBefore,
            reclaimableTravelAfter,
          });
        }
      }

      currentDate = dateTimeService.shiftDays(currentDate, 1);
    }

    return fittingSlots;
  }

  /**
   * Reclaim a travel slot adjacent to an available slot, merging it back into available time.
   * Used when inserting a same-location task that eliminates the need for that travel.
   */
  reclaimAdjacentTravelSlot(
    availableSlot: TimeSlot,
    position: "before" | "after"
  ): boolean {
    const dayKey = this.getDayKey(availableSlot.start);
    const availableSlots = this.availableSlots.get(dayKey);
    const occupiedSlots = this.occupiedSlots.get(dayKey);

    if (!availableSlots || !occupiedSlots) return false;

    // Find the travel slot
    const travelSlotIndex = occupiedSlots.findIndex((occ) => {
      if (!TimeSlotUtils.isTravelSlot(occ)) return false;
      if (position === "before") {
        return (
          Math.abs(occ.end.getTime() - availableSlot.start.getTime()) < 60000
        );
      } else {
        return (
          Math.abs(occ.start.getTime() - availableSlot.end.getTime()) < 60000
        );
      }
    });

    if (travelSlotIndex === -1) return false;

    const travelSlot = occupiedSlots[travelSlotIndex];

    // Find the available slot in the available slots array
    const availableSlotIndex = availableSlots.findIndex(
      (s) => s.start.getTime() === availableSlot.start.getTime()
    );

    if (availableSlotIndex === -1) return false;

    // Convert travel slot to available and merge with the existing available slot
    const reclaimedSlot = TimeSlotUtils.reclaimTravelSlot(travelSlot);

    if (position === "before") {
      // Extend available slot backward
      availableSlots[availableSlotIndex] = {
        ...availableSlots[availableSlotIndex],
        start: reclaimedSlot.start,
        durationMinutes:
          availableSlots[availableSlotIndex].durationMinutes +
          reclaimedSlot.durationMinutes,
        prevLocationId: reclaimedSlot.prevLocationId,
      };
    } else {
      // Extend available slot forward
      availableSlots[availableSlotIndex] = {
        ...availableSlots[availableSlotIndex],
        end: reclaimedSlot.end,
        durationMinutes:
          availableSlots[availableSlotIndex].durationMinutes +
          reclaimedSlot.durationMinutes,
        nextLocationId: reclaimedSlot.nextLocationId,
      };
    }

    // Remove the travel slot from occupied
    occupiedSlots.splice(travelSlotIndex, 1);

    return true;
  }

  /**
   * Find an existing travel slot going to a destination near a given time.
   * Used to determine if travel-after can be reused instead of reserving new space.
   *
   * @param nearTime - The time to search near (typically the end of an available slot)
   * @param toLocationId - The destination location to check for
   * @returns The travel slot's start time if found, null otherwise
   */
  findAdjacentTravelTo(nearTime: Date, toLocationId: string): Date | null {
    const dayKey = this.getDayKey(nearTime);
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];

    // Look for travel slots that:
    // 1. Go to the same destination (toLocationId)
    // 2. Start near the given time (within buffer + reasonable search window)
    const bufferMs = this.bufferTimeMinutes * 60000;
    const searchWindowMs = bufferMs + 10 * 60000; // buffer + 10 minutes tolerance

    console.log(`    [findAdjacentTravelTo] Looking for travel to ${toLocationId} near ${nearTime.toISOString()}, searchWindow=${searchWindowMs}ms`);

    for (const slot of occupiedSlots) {
      if (
        TimeSlotUtils.isTravelSlot(slot) &&
        slot.travelToLocationId === toLocationId
      ) {
        // Check if this travel starts near our search time
        const timeDiff = Math.abs(slot.start.getTime() - nearTime.getTime());
        console.log(`      Found travel ${slot.start.toISOString()}->${slot.travelToLocationId}, timeDiff=${timeDiff}ms, fits=${timeDiff <= searchWindowMs}`);
        if (timeDiff <= searchWindowMs) {
          return new Date(slot.start.getTime());
        }
      }
    }

    return null;
  }

  /**
   * Get all occupied slots (for generating final travel events)
   */
  getAllOccupiedSlots(): Map<string, TimeSlot[]> {
    return new Map(this.occupiedSlots);
  }

  /**
   * Get all travel slots (for converting to SimpleEvents at the end)
   */
  getAllTravelSlots(): TimeSlot[] {
    const travelSlots: TimeSlot[] = [];
    for (const slots of this.occupiedSlots.values()) {
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
  generateTravelEvents(userId: string): SimpleEvent[] {
    const travelSlots = this.getAllTravelSlots();
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
        title: "Travel",
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

  /**
   * Get available slots for a specific day
   */
  getDaySlots(date: Date): TimeSlot[] {
    const dayKey = this.getDayKey(date);
    return this.availableSlots.get(dayKey) || [];
  }

  /**
   * Get total available minutes for a day
   */
  getDayAvailableMinutes(date: Date): number {
    const slots = this.getDaySlots(date);
    return slots.reduce((total, slot) => total + slot.durationMinutes, 0);
  }

  /**
   * Get total available minutes for a week
   */
  getWeekAvailableMinutes(weekStartDate: Date): number {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const date = dateTimeService.shiftDays(weekStartDate, i);
      total += this.getDayAvailableMinutes(date);
    }
    return total;
  }

  /**
   * Clear all cached slots (useful for rebuilding)
   */
  clear(): void {
    this.availableSlots.clear();
    this.occupiedSlots.clear();
  }

  /**
   * Get the buffer time in minutes
   */
  getBufferTimeMinutes(): number {
    return this.bufferTimeMinutes;
  }

  /**
   * Get a unique key for a day
   */
  private getDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Schedule dynamic items week-by-week until all are placed or max days reached
   * @param userId - ID of the user (for creating scheduled events)
   * @param templates - All template items (with rrules, exceptions)
   * @param staticEvents - Static events (plans, etc.)
   * @param dynamicItems - Items to be scheduled dynamically
   * @param startDate - Date to start scheduling from
   * @param maxDays - Maximum days to schedule (default: Infinity)
   * @returns Scheduled events and any unscheduled dynamic items
   */
  schedule(
    userId: string,
    templates: EventTemplate[],
    staticEvents: SimpleEvent[],
    dynamicItems: DynamicScheduleItem[],
    startDate: Date,
    maxDays: number = Infinity
  ): {
    scheduledEvents: SimpleEvent[];
    unscheduledItems: DynamicScheduleItem[];
  } {
    const templateExpander = new TemplateExpander(this.weekStartDay);
    let currentDate = new Date(startDate);
    let daysScheduled = 0;
    const scheduledEvents: SimpleEvent[] = [];
    let unscheduledItems = [...dynamicItems];

    // Clear previous slots
    this.clear();

    // Loop until all dynamic items are scheduled or max days reached
    while (unscheduledItems.length > 0 && daysScheduled < maxDays) {
      // Get week boundaries
      const weekStart = dateTimeService.getWeekFirstDate(
        currentDate,
        this.weekStartDay
      );
      const weekEnd = dateTimeService.getWeekLastDate(
        currentDate,
        this.weekStartDay
      );

      // Build per-template masks for direct slot building (no SimpleEvent generation)
      const perTemplateMasks = templateExpander.getPerTemplateMasks(templates);

      // Filter static events for this week
      const weekStaticEvents = staticEvents.filter((e) => {
        const eventStart = new Date(e.start);
        return eventStart >= weekStart && eventStart <= weekEnd;
      });

      // Build available slots for the week using masks directly
      const weekSlots = this.buildDailySlots(
        weekStart,
        7,
        weekStaticEvents,
        perTemplateMasks
      );

      // Try to place dynamic items into available slots
      // Account for buffer time on both sides of the event
      const requiredBuffer = 2 * this.bufferTimeMinutes;
      for (let i = unscheduledItems.length - 1; i >= 0; i--) {
        const item = unscheduledItems[i];
        const requiredMinutes = item.durationMinutes + requiredBuffer;
        let placed = false;
        // Search each day in the week
        for (let d = 0; d < 7 && !placed; d++) {
          const date = dateTimeService.shiftDays(weekStart, d);
          const dayKey = this.getDayKey(date);
          const slots = weekSlots.get(dayKey) || [];
          for (const slot of slots) {
            if (slot.isAvailable && slot.durationMinutes >= requiredMinutes) {
              // Reserve slot for this item with leading buffer
              const start = dateTimeService.addDuration(
                slot.start,
                this.bufferTimeMinutes
              );
              const end = dateTimeService.addDuration(
                start,
                item.durationMinutes
              );
              this.reserveSlot(start, end, item.id, "task");
              // Create scheduled event
              scheduledEvents.push({
                userId,
                id: item.id,
                title: item.title,
                start: start.toISOString(),
                end: end.toISOString(),
                duration: item.durationMinutes * 60 * 1000,
                rrule: null,
                extendedProps: item.extendedProps
                  ? {
                      ...item.extendedProps,
                      itemType:
                        typeof item.extendedProps.itemType === "string"
                          ? ItemTypeEnum[
                              item.extendedProps
                                .itemType as keyof typeof ItemTypeEnum
                            ]
                          : item.extendedProps.itemType,
                    }
                  : {
                      id: item.id,
                      itemType: ItemTypeEnum.task,
                      completedStartTime: null,
                      completedEndTime: null,
                      parentId: null,
                      eventId: item.id,
                    },
                backgroundColor: item.backgroundColor ?? "#2196f3",
                borderColor: "transparent",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              // Remove from unscheduled
              unscheduledItems.splice(i, 1);
              placed = true;
              break;
            }
          }
        }
      }

      // Move to next week
      currentDate = dateTimeService.shiftDays(weekEnd, 1);
      daysScheduled += 7;
    }

    return {
      scheduledEvents,
      unscheduledItems,
    };
  }

  /**
   * Get statistics about slot availability
   */
  getStatistics(): {
    totalDays: number;
    totalAvailableMinutes: number;
    totalOccupiedMinutes: number;
    averageAvailablePerDay: number;
  } {
    let totalAvailable = 0;
    let totalOccupied = 0;

    for (const slots of this.availableSlots.values()) {
      totalAvailable += slots.reduce(
        (sum, slot) => sum + slot.durationMinutes,
        0
      );
    }

    for (const slots of this.occupiedSlots.values()) {
      totalOccupied += slots.reduce(
        (sum, slot) => sum + slot.durationMinutes,
        0
      );
    }

    const totalDays = this.availableSlots.size;

    return {
      totalDays,
      totalAvailableMinutes: totalAvailable,
      totalOccupiedMinutes: totalOccupied,
      averageAvailablePerDay: totalDays > 0 ? totalAvailable / totalDays : 0,
    };
  }
}
