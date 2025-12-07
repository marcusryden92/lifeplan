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
  eventsToIntervals,
  findGaps,
  intervalsToTimeSlots,
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
   * @param plannerLocationMap - Optional map of planner ID to location ID for tracking slot neighbors
   */
  buildAvailableSlots(
    startDate: Date,
    endDate: Date,
    existingEvents: SimpleEvent[],
    templateEvents: SimpleEvent[],
    plannerLocationMap?: Map<string, string | null>
  ): TimeSlot[] {
    // Combine all events that occupy time
    const allEvents = [...existingEvents, ...templateEvents];

    // Filter events to only those that overlap with this date range
    // and sort by start time for location tracking
    const relevantEvents = allEvents
      .filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        // Event overlaps if it starts before range ends AND ends after range starts
        return eventStart < endDate && eventEnd > startDate;
      })
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );

    // Buffer is now handled during scheduling (leading buffer before event start)
    // so we don't extend event end times here
    const occupiedIntervals = eventsToIntervals(relevantEvents);

    // Find gaps between occupied intervals
    const gaps = findGaps(occupiedIntervals, startDate, endDate);

    // Convert gaps to available time slots
    const slots = intervalsToTimeSlots(gaps, true);

    // If we have a planner location map, set prevLocationId and nextLocationId on each slot
    if (plannerLocationMap && relevantEvents.length > 0) {
      for (const slot of slots) {
        // Find the event immediately before this slot
        const prevEvent = relevantEvents.find((e) => {
          const eventEnd = new Date(e.end);
          // Event ends at or just before slot starts (within 1 minute tolerance)
          return Math.abs(eventEnd.getTime() - slot.start.getTime()) < 60000;
        });

        // Find the event immediately after this slot
        const nextEvent = relevantEvents.find((e) => {
          const eventStart = new Date(e.start);
          // Event starts at or just after slot ends (within 1 minute tolerance)
          return Math.abs(eventStart.getTime() - slot.end.getTime()) < 60000;
        });

        // Look up locations from the planner map
        // Use extendedProps.eventId first (for template events which have compound IDs),
        // then fall back to event.id (for planner items)
        if (prevEvent) {
          const lookupId =
            (prevEvent.extendedProps?.eventId as string) || prevEvent.id;
          slot.prevLocationId = plannerLocationMap.get(lookupId) ?? null;
        }
        if (nextEvent) {
          const lookupId =
            (nextEvent.extendedProps?.eventId as string) || nextEvent.id;
          slot.nextLocationId = plannerLocationMap.get(lookupId) ?? null;
        }
      }
    }

    // Merge adjacent slots (preserve location info from first slot in merge)
    return TimeSlotUtils.mergeAdjacentSlots(slots);
  }

  /**
   * Build slots for multiple days at once
   * @param plannerLocationMap - Optional map of planner ID to location ID for tracking slot neighbors
   */
  buildDailySlots(
    startDate: Date,
    numDays: number,
    existingEvents: SimpleEvent[],
    templateEvents: SimpleEvent[],
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
        templateEvents,
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

    // Base required time: task duration + buffer on both sides
    const baseRequiredMinutes = durationMinutes + 2 * this.bufferTimeMinutes;

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
   * @param travelAfter - Minutes of travel needed after task (pre-calculated by caller)
   * @param prevLocationId - Location of the event before this slot
   * @param nextLocationId - Location of the event after this slot
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
    nextLocationId: string | null
  ): { success: boolean } {
    const dayKey = this.getDayKey(start);
    const slots = this.availableSlots.get(dayKey);

    if (!slots) {
      return { success: false };
    }

    const bufferMinutes = this.bufferTimeMinutes;

    // Layout: [buffer] -> [travelBefore] -> [buffer] -> [task] -> [buffer] -> [travelAfter] -> [buffer]
    // The `start` param is the task start time (already positioned after travel + buffers by Scheduler)
    // Calculate positions for all components

    // Travel before starts after leading buffer, ends at buffer before task
    // So: travelBeforeEnd = start - buffer, travelBeforeStart = travelBeforeEnd - travelBefore
    const travelBeforeEnd =
      travelBefore > 0
        ? new Date(start.getTime() - bufferMinutes * 60000)
        : start;
    const travelBeforeStart =
      travelBefore > 0
        ? new Date(travelBeforeEnd.getTime() - travelBefore * 60000)
        : start;

    // Travel after starts at buffer after task, ends before trailing buffer
    // So: travelAfterStart = end + buffer, travelAfterEnd = travelAfterStart + travelAfter
    const travelAfterStart =
      travelAfter > 0 ? new Date(end.getTime() + bufferMinutes * 60000) : end;
    const travelAfterEnd =
      travelAfter > 0
        ? new Date(travelAfterStart.getTime() + travelAfter * 60000)
        : end;

    // Full occupied range: from leading buffer start to trailing buffer end
    const fullStart =
      travelBefore > 0
        ? new Date(travelBeforeStart.getTime() - bufferMinutes * 60000)
        : new Date(start.getTime() - bufferMinutes * 60000);
    const fullEnd =
      travelAfter > 0
        ? new Date(travelAfterEnd.getTime() + bufferMinutes * 60000)
        : new Date(end.getTime() + bufferMinutes * 60000);

    // Find the slot that contains this full time range
    const slotIndex = slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.start.getTime() <= fullStart.getTime() &&
        slot.end.getTime() >= fullEnd.getTime()
    );

    if (slotIndex === -1) {
      return { success: false };
    }

    const slot = slots[slotIndex];
    const newSlots: TimeSlot[] = [];

    // Slot before everything (available) - ends at fullStart
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

    // Travel slot BEFORE the task (if needed)
    if (travelBefore > 0 && prevLocationId && taskLocationId) {
      newSlots.push(
        TimeSlotUtils.createTravelSlot(
          travelBeforeStart,
          travelBeforeEnd,
          prevLocationId,
          taskLocationId,
          `travel-to-${eventId}`
        )
      );
    }

    // The task itself (occupied)
    newSlots.push({
      start,
      end,
      durationMinutes: Math.floor((end.getTime() - start.getTime()) / 60000),
      isAvailable: false,
      eventId,
      eventType,
      prevLocationId: taskLocationId,
      nextLocationId: taskLocationId,
    });

    // Travel slot AFTER the task (if needed)
    if (travelAfter > 0 && taskLocationId && nextLocationId) {
      newSlots.push(
        TimeSlotUtils.createTravelSlot(
          travelAfterStart,
          travelAfterEnd,
          taskLocationId,
          nextLocationId,
          `travel-from-${eventId}`
        )
      );
    }

    // Slot after everything (available) - starts at fullEnd
    if (fullEnd.getTime() < slot.end.getTime()) {
      newSlots.push({
        start: fullEnd,
        end: slot.end,
        durationMinutes: Math.floor(
          (slot.end.getTime() - fullEnd.getTime()) / 60000
        ),
        isAvailable: true,
        prevLocationId: taskLocationId ?? slot.prevLocationId,
        nextLocationId: slot.nextLocationId,
      });
    }

    // Replace the old slot with new slots
    const availableNewSlots = newSlots.filter((s) => s.isAvailable);
    slots.splice(slotIndex, 1, ...availableNewSlots);

    // Track all occupied slots (including travel)
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
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

    return travelSlots.map((slot) => {
      const eventId = slot.eventId || `travel-${slot.start.getTime()}`;
      // Travel events have extra props not in the base schema (fromLocationId, toLocationId, travelMinutes)
      // These are used for display purposes only, not persisted
      return {
        userId,
        id: eventId,
        title: "Travel",
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        backgroundColor: "#9CA3AF",
        borderColor: "#6B7280",
        duration: null,
        rrule: null,
        extendedProps: {
          id: eventId,
          eventId: eventId,
          itemType: "travel",
          parentId: null,
          completedEndTime: null,
          completedStartTime: null,
          // Extra travel-specific props (not in Prisma schema, used for display)
          fromLocationId: slot.travelFromLocationId ?? null,
          toLocationId: slot.travelToLocationId ?? null,
          travelMinutes: slot.durationMinutes,
        },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      } as SimpleEvent;
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
   * @param userId - ID of the user
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

      // Expand template events for this week using per-template masks so
      // uneven (every-N-days) templates and cross-midnight parts are
      // respected without expanding full rrule occurrences.
      const perTemplateMasks = templateExpander.getPerTemplateMasks(templates);
      const templateEvents =
        templateExpander.generateSimpleEventsFromPerTemplateMasks(
          userId,
          perTemplateMasks,
          weekStart,
          7
        );

      // Gather all static and template events for this week
      const weekEvents = [
        ...staticEvents.filter((e) => {
          const eventStart = new Date(e.start);
          return eventStart >= weekStart && eventStart <= weekEnd;
        }),
        ...templateEvents,
      ];

      // Build available slots for the week
      const weekSlots = this.buildDailySlots(weekStart, 7, weekEvents, []);

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
