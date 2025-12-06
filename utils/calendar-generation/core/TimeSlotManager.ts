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

export class TimeSlotManager {
  private availableSlots: Map<string, TimeSlot[]> = new Map();
  private occupiedSlots: Map<string, TimeSlot[]> = new Map();
  private bufferTimeMinutes: number = 0;

  constructor(
    private weekStartDay: WeekDayIntegers,
    private currentDate: Date = new Date(),
    bufferTimeMinutes: number = 0
  ) {
    this.bufferTimeMinutes = bufferTimeMinutes;
  }

  /**
   * Build available time slots for a date range
   */
  buildAvailableSlots(
    startDate: Date,
    endDate: Date,
    existingEvents: SimpleEvent[],
    templateEvents: SimpleEvent[]
  ): TimeSlot[] {
    // Combine all events that occupy time
    const allEvents = [...existingEvents, ...templateEvents];

    // Filter events to only those that overlap with this date range
    const relevantEvents = allEvents.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      // Event overlaps if it starts before range ends AND ends after range starts
      return eventStart < endDate && eventEnd > startDate;
    });

    // Buffer is now handled during scheduling (leading buffer before event start)
    // so we don't extend event end times here
    const occupiedIntervals = eventsToIntervals(relevantEvents);

    // Find gaps between occupied intervals
    const gaps = findGaps(occupiedIntervals, startDate, endDate);

    // Convert gaps to available time slots
    const slots = intervalsToTimeSlots(gaps, true);

    // Merge adjacent slots
    return TimeSlotUtils.mergeAdjacentSlots(slots);
  }

  /**
   * Build slots for multiple days at once
   */
  buildDailySlots(
    startDate: Date,
    numDays: number,
    existingEvents: SimpleEvent[],
    templateEvents: SimpleEvent[]
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
        templateEvents
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
   * Find all slots that can fit a duration (plus buffer time on both sides)
   */
  findAllFittingSlots(
    durationMinutes: number,
    afterDate: Date = this.currentDate,
    maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH
  ): TimeSlot[] {
    const fittingSlots: TimeSlot[] = [];
    const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
    let currentDate = new Date(afterDate);

    // Account for buffer time on both sides of the event
    const requiredMinutes = durationMinutes + (2 * this.bufferTimeMinutes);

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

          if (effectiveMinutes >= requiredMinutes) {
            fittingSlots.push({
              ...slot,
              start: effectiveStart,
              durationMinutes: effectiveMinutes,
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
   */
  reserveSlot(
    start: Date,
    end: Date,
    eventId: string,
    eventType: "task" | "goal" | "plan" | "template"
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
    const newSlots = TimeSlotUtils.occupySlot(
      slot,
      start,
      end,
      eventId,
      eventType
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
