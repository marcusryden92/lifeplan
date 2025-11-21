/**
 * TimeSlotManager
 *
 * Efficient management of available time slots for scheduling.
 * Replaces minute-by-minute iteration with interval-based approach.
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

export class TimeSlotManager {
  private availableSlots: Map<string, TimeSlot[]> = new Map();
  private occupiedSlots: Map<string, TimeSlot[]> = new Map();

  constructor(
    private weekStartDay: WeekDayIntegers,
    private currentDate: Date = new Date()
  ) {}

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
   * Find the first available slot that can fit a duration
   */
  findFirstFit(
    durationMinutes: number,
    afterDate: Date = this.currentDate,
    maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH
  ): TimeSlot | null {
    const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
    let currentDate = new Date(afterDate);

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

          if (effectiveMinutes >= durationMinutes) {
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
   * Find all slots that can fit a duration
   */
  findAllFittingSlots(
    durationMinutes: number,
    afterDate: Date = this.currentDate,
    maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH
  ): TimeSlot[] {
    const fittingSlots: TimeSlot[] = [];
    const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
    let currentDate = new Date(afterDate);

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

          if (effectiveMinutes >= durationMinutes) {
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

    // No need to set again since we mutated the array in place
    // this.availableSlots already has the updated reference

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
   * Get a unique key for a day
   */
  private getDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
