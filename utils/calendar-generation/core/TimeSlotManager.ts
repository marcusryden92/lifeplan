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
      return 0;
    }

    if (!this.travelTimeMatrix) {
      return 0;
    }

    const travelKey = `${fromLocationId}->${toLocationId}`;
    const entry = this.travelTimeMatrix.get(travelKey);

    if (!entry) {
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
   * Calculate total travel time required for placing a task with a given location in a slot
   * Returns { travelBefore, travelAfter } in minutes
   */
  calculateRequiredTravelTime(
    slot: TimeSlot,
    taskLocationId: string | null,
    startTime: Date
  ): { travelBefore: number; travelAfter: number } {
    const travelBefore = this.getTravelTime(
      slot.prevLocationId ?? null,
      taskLocationId,
      startTime
    );

    // Estimate end time for calculating travel after
    const travelAfter = this.getTravelTime(
      taskLocationId,
      slot.nextLocationId ?? null,
      startTime // Use start time as approximation
    );

    return { travelBefore, travelAfter };
  }

  /**
   * Check if a slot can fit a task considering travel time requirements
   * Returns the effective available minutes after accounting for travel
   */
  getEffectiveSlotCapacity(
    slot: TimeSlot,
    taskLocationId: string | null,
    startTime: Date
  ): number {
    const { travelBefore, travelAfter } = this.calculateRequiredTravelTime(
      slot,
      taskLocationId,
      startTime
    );

    // Total travel overhead
    const travelOverhead = travelBefore + travelAfter;

    return Math.max(0, slot.durationMinutes - travelOverhead);
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
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

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
          const lookupId = (prevEvent.extendedProps?.eventId as string) || prevEvent.id;
          slot.prevLocationId = plannerLocationMap.get(lookupId) ?? null;
        }
        if (nextEvent) {
          const lookupId = (nextEvent.extendedProps?.eventId as string) || nextEvent.id;
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
    const requiredMinutes = durationMinutes + (2 * this.bufferTimeMinutes);

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
   * Find all slots that can fit a duration (plus buffer time and travel time)
   * Preserves location info (prevLocationId, nextLocationId) on returned slots
   * @param taskLocationId - Location of the task being scheduled (for travel time calculation)
   */
  findAllFittingSlots(
    durationMinutes: number,
    afterDate: Date = this.currentDate,
    maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH,
    taskLocationId?: string | null
  ): TimeSlot[] {
    const fittingSlots: TimeSlot[] = [];
    const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
    let currentDate = new Date(afterDate);

    // Base required time: task duration + buffer on both sides
    const baseRequiredMinutes = durationMinutes + (2 * this.bufferTimeMinutes);

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

          // Calculate travel time if task has a location
          let travelOverhead = 0;
          if (taskLocationId !== undefined) {
            const { travelBefore, travelAfter } = this.calculateRequiredTravelTime(
              slot,
              taskLocationId,
              effectiveStart
            );
            travelOverhead = travelBefore + travelAfter;
          }

          const totalRequiredMinutes = baseRequiredMinutes + travelOverhead;

          if (effectiveMinutes >= totalRequiredMinutes) {
            fittingSlots.push({
              ...slot,
              start: effectiveStart,
              durationMinutes: effectiveMinutes,
              // Preserve location info
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
   * Reserve a time slot with travel time handling
   * Returns the travel events that should be created (if any)
   * @param taskLocationId - Location of the task being placed
   * @param prevLocationId - Location of the event before this slot (passed from caller for accuracy)
   * @param nextLocationId - Location of the event after this slot (passed from caller for accuracy)
   */
  reserveSlotWithTravel(
    start: Date,
    end: Date,
    eventId: string,
    eventType: "task" | "goal" | "plan" | "template",
    taskLocationId: string | null,
    prevLocationId?: string | null,
    nextLocationId?: string | null
  ): {
    success: boolean;
    travelEvents: Array<{
      id: string;
      start: Date;
      end: Date;
      fromLocationId: string;
      toLocationId: string;
      travelMinutes: number;
    }>;
  } {
    const dayKey = this.getDayKey(start);
    const slots = this.availableSlots.get(dayKey);

    if (!slots) {
      return { success: false, travelEvents: [] };
    }

    // Find the slot that contains this time range
    const slotIndex = slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.start.getTime() <= start.getTime() &&
        slot.end.getTime() >= end.getTime()
    );

    if (slotIndex === -1) {
      return { success: false, travelEvents: [] };
    }

    const slot = slots[slotIndex];
    const travelEvents: Array<{
      id: string;
      start: Date;
      end: Date;
      fromLocationId: string;
      toLocationId: string;
      travelMinutes: number;
    }> = [];

    // Use passed location IDs if provided, otherwise fall back to slot's info
    const effectivePrevLocationId = prevLocationId !== undefined ? prevLocationId : (slot.prevLocationId ?? null);
    const effectiveNextLocationId = nextLocationId !== undefined ? nextLocationId : (slot.nextLocationId ?? null);

    // Calculate travel time before (from previous event's location to this task's location)
    const travelBefore = this.getTravelTime(
      effectivePrevLocationId,
      taskLocationId,
      start
    );

    // Calculate travel time after (from this task's location to next event's location)
    const travelAfter = this.getTravelTime(
      taskLocationId,
      effectiveNextLocationId,
      end
    );

    // If we need travel before, create a travel event
    if (travelBefore > 0 && effectivePrevLocationId && taskLocationId) {
      const travelStart = new Date(start.getTime() - travelBefore * 60000);
      travelEvents.push({
        id: `travel-to-${eventId}`,
        start: travelStart,
        end: start,
        fromLocationId: effectivePrevLocationId,
        toLocationId: taskLocationId,
        travelMinutes: travelBefore,
      });
    }

    // If we need travel after, create a travel event
    if (travelAfter > 0 && taskLocationId && effectiveNextLocationId) {
      const travelEnd = new Date(end.getTime() + travelAfter * 60000);
      travelEvents.push({
        id: `travel-from-${eventId}`,
        start: end,
        end: travelEnd,
        fromLocationId: taskLocationId,
        toLocationId: effectiveNextLocationId,
        travelMinutes: travelAfter,
      });
    }

    // Calculate the full range we need to reserve (task + travel events)
    const fullStart = travelBefore > 0
      ? new Date(start.getTime() - travelBefore * 60000)
      : start;
    const fullEnd = travelAfter > 0
      ? new Date(end.getTime() + travelAfter * 60000)
      : end;

    // Verify the slot can still fit everything
    if (fullStart.getTime() < slot.start.getTime() || fullEnd.getTime() > slot.end.getTime()) {
      return { success: false, travelEvents: [] };
    }

    // Reserve the full range (including travel time)
    const newSlots = TimeSlotUtils.occupySlot(
      slot,
      fullStart,
      fullEnd,
      eventId,
      eventType,
      taskLocationId
    );

    // Replace the old slot with the new slots
    const availableNewSlots = newSlots.filter((s) => s.isAvailable);
    slots.splice(slotIndex, 1, ...availableNewSlots);

    // Track occupied slots
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
    occupiedSlots.push(...newSlots.filter((s) => !s.isAvailable));
    this.occupiedSlots.set(dayKey, occupiedSlots);

    return {
      success: true,
      travelEvents,
    };
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
            if (
              slot.isAvailable &&
              slot.durationMinutes >= requiredMinutes
            ) {
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
