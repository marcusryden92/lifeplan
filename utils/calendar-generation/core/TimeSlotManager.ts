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

import {
  TravelTimeEntry,
  CategoryConstraint,
} from "../models/SchedulingModels";

export class TimeSlotManager {
  private availableSlots: Map<string, TimeSlot[]> = new Map();
  private occupiedSlots: Map<string, TimeSlot[]> = new Map();
  private bufferTimeMinutes: number = 0;
  private travelTimeMatrix: Map<string, TravelTimeEntry> | null = null;
  // Category periods by day for wrapper-aware travel context
  private categoryPeriodsByDay: Map<
    string,
    Array<{ start: Date; end: Date; locationId: string | null }>
  > = new Map();

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
   * Check if we can place a standalone travel-before that ends at a given time.
   * Non-mutating: scans available slots on the day to see if [travelStart, travelEnd] fits.
   */
  canPlaceStandaloneTravelBefore(
    travelEnd: Date,
    travelMinutes: number
  ): boolean {
    const dayKey = this.getDayKey(travelEnd);
    const slots = this.availableSlots.get(dayKey) || [];

    const travelEndMs = travelEnd.getTime();
    const travelStartMs = travelEndMs - travelMinutes * 60000;

    // Travel should end buffer before the task start, so ensure positive duration
    if (travelMinutes <= 0 || travelStartMs >= travelEndMs) return false;

    // Find an available slot that contains the travel end point.
    // Travel can start in the buffer zone before the slot (slot.start is buffer-adjusted),
    // so we only require that travelEnd is within the slot and travelStart is at or after
    // the original gap start (which is slot.start - bufferTimeMinutes).
    const bufferMs = this.bufferTimeMinutes * 60000;

    return (
      slots.findIndex(
        (slot) =>
          slot.isAvailable &&
          slot.start.getTime() - bufferMs <= travelStartMs &&
          slot.end.getTime() >= travelEndMs
      ) !== -1
    );
  }

  /**
   * Reserve a standalone travel-before segment that ends at a given time.
   * Splits the containing available slot and records the travel as occupied.
   * @param force If true, creates the travel at full duration and marks overlapping
   *              slots as unavailable. Used for category travel where travel time is
   *              fixed regardless of schedule conflicts.
   */
  reserveStandaloneTravelBefore(
    travelEnd: Date,
    travelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
    eventId: string,
    force: boolean = false
  ): { success: boolean } {
    const dayKey = this.getDayKey(travelEnd);
    const travelEndMs = travelEnd.getTime();
    const travelStart = new Date(travelEndMs - travelMinutes * 60000);
    const travelStartMs = travelStart.getTime();

    // Force mode: create travel at full duration and mark overlapping slots as unavailable
    if (force) {
      const travelSlot = TimeSlotUtils.createTravelSlot(
        travelStart,
        travelEnd,
        fromLocationId,
        toLocationId,
        `travel-to-${eventId}`
      );
      const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
      occupiedSlots.push(travelSlot);
      this.occupiedSlots.set(dayKey, occupiedSlots);

      // Also mark overlapping available slots as occupied
      const slots = this.availableSlots.get(dayKey);
      if (slots) {
        const newSlots: TimeSlot[] = [];
        for (const slot of slots) {
          if (!slot.isAvailable) {
            newSlots.push(slot);
            continue;
          }
          const slotStartMs = slot.start.getTime();
          const slotEndMs = slot.end.getTime();

          // No overlap - keep slot as is
          if (slotEndMs <= travelStartMs || slotStartMs >= travelEndMs) {
            newSlots.push(slot);
            continue;
          }

          // Partial overlap - keep portion before travel
          if (slotStartMs < travelStartMs) {
            newSlots.push({
              ...slot,
              end: travelStart,
              durationMinutes: Math.floor((travelStartMs - slotStartMs) / 60000),
            });
          }

          // Partial overlap - keep portion after travel
          if (slotEndMs > travelEndMs) {
            newSlots.push({
              ...slot,
              start: travelEnd,
              durationMinutes: Math.floor((slotEndMs - travelEndMs) / 60000),
              prevLocationId: toLocationId,
            });
          }
          // If slot is fully contained by travel, it's removed (not added to newSlots)
        }
        this.availableSlots.set(dayKey, newSlots);
      }

      return { success: true };
    }

    const slots = this.availableSlots.get(dayKey);
    if (!slots) return { success: false };

    // Travel can start in the buffer zone before the slot (slot.start is buffer-adjusted)
    const bufferMs = this.bufferTimeMinutes * 60000;
    const slotIndex = slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.start.getTime() - bufferMs <= travelStartMs &&
        slot.end.getTime() >= travelEndMs
    );
    if (slotIndex === -1) return { success: false };

    const slot = slots[slotIndex];
    const newSlots: TimeSlot[] = [];

    // Available before travel (only if travel starts after the slot's buffer-adjusted start)
    if (travelStartMs > slot.start.getTime()) {
      newSlots.push({
        start: slot.start,
        end: travelStart,
        durationMinutes: Math.floor(
          (travelStartMs - slot.start.getTime()) / 60000
        ),
        isAvailable: true,
        prevLocationId: slot.prevLocationId,
        nextLocationId: fromLocationId,
      });
    }

    // Occupied travel segment
    const travelSlot = TimeSlotUtils.createTravelSlot(
      travelStart,
      travelEnd,
      fromLocationId,
      toLocationId,
      `travel-to-${eventId}`
    );
    newSlots.push(travelSlot);

    // Available after travel
    if (slot.end.getTime() > travelEndMs) {
      newSlots.push({
        start: travelEnd,
        end: slot.end,
        durationMinutes: Math.floor((slot.end.getTime() - travelEndMs) / 60000),
        isAvailable: true,
        prevLocationId: toLocationId,
        nextLocationId: slot.nextLocationId,
      });
    }

    // Replace slot and record occupied travel
    const availableNewSlots = newSlots.filter((s) => s.isAvailable);
    slots.splice(slotIndex, 1, ...availableNewSlots);

    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
    occupiedSlots.push(...newSlots.filter((s) => !s.isAvailable));
    this.occupiedSlots.set(dayKey, occupiedSlots);

    return { success: true };
  }

  /**
   * Reserve a standalone travel-after segment that starts at a given time.
   * Splits the containing available slot and records the travel as occupied.
   * @param force If true, creates the travel at full duration and marks overlapping
   *              slots as unavailable. Used for category travel where travel time is
   *              fixed regardless of schedule conflicts.
   */
  reserveStandaloneTravelAfter(
    travelStart: Date,
    travelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
    eventId: string,
    force: boolean = false
  ): { success: boolean } {
    const dayKey = this.getDayKey(travelStart);
    const travelStartMs = travelStart.getTime();
    const travelEnd = new Date(travelStartMs + travelMinutes * 60000);
    const travelEndMs = travelEnd.getTime();

    // Force mode: create travel at full duration and mark overlapping slots as unavailable
    if (force) {
      const travelSlot = TimeSlotUtils.createTravelSlot(
        travelStart,
        travelEnd,
        fromLocationId,
        toLocationId,
        `travel-from-${eventId}`
      );
      const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
      occupiedSlots.push(travelSlot);
      this.occupiedSlots.set(dayKey, occupiedSlots);

      // Also mark overlapping available slots as occupied
      const slots = this.availableSlots.get(dayKey);
      if (slots) {
        const newSlots: TimeSlot[] = [];
        for (const slot of slots) {
          if (!slot.isAvailable) {
            newSlots.push(slot);
            continue;
          }
          const slotStartMs = slot.start.getTime();
          const slotEndMs = slot.end.getTime();

          // No overlap - keep slot as is
          if (slotEndMs <= travelStartMs || slotStartMs >= travelEndMs) {
            newSlots.push(slot);
            continue;
          }

          // Partial overlap - keep portion before travel
          if (slotStartMs < travelStartMs) {
            newSlots.push({
              ...slot,
              end: travelStart,
              durationMinutes: Math.floor((travelStartMs - slotStartMs) / 60000),
            });
          }

          // Partial overlap - keep portion after travel
          if (slotEndMs > travelEndMs) {
            newSlots.push({
              ...slot,
              start: travelEnd,
              durationMinutes: Math.floor((slotEndMs - travelEndMs) / 60000),
              prevLocationId: toLocationId,
            });
          }
          // If slot is fully contained by travel, it's removed (not added to newSlots)
        }
        this.availableSlots.set(dayKey, newSlots);
      }

      return { success: true };
    }

    const slots = this.availableSlots.get(dayKey);
    if (!slots) return { success: false };

    // Travel can start in the buffer zone before the slot (slot.start is buffer-adjusted)
    const bufferMs = this.bufferTimeMinutes * 60000;
    const slotIndex = slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.start.getTime() - bufferMs <= travelStartMs &&
        slot.end.getTime() >= travelEndMs
    );
    if (slotIndex === -1) return { success: false };

    const slot = slots[slotIndex];
    const newSlots: TimeSlot[] = [];

    // Available before travel (only if travel starts after the slot's buffer-adjusted start)
    if (travelStartMs > slot.start.getTime()) {
      newSlots.push({
        start: slot.start,
        end: travelStart,
        durationMinutes: Math.floor(
          (travelStartMs - slot.start.getTime()) / 60000
        ),
        isAvailable: true,
        prevLocationId: slot.prevLocationId,
        nextLocationId: fromLocationId,
      });
    }

    // Occupied travel segment
    const travelSlot = TimeSlotUtils.createTravelSlot(
      travelStart,
      travelEnd,
      fromLocationId,
      toLocationId,
      `travel-from-${eventId}`
    );
    newSlots.push(travelSlot);

    // Available after travel
    if (slot.end.getTime() > travelEndMs) {
      newSlots.push({
        start: travelEnd,
        end: slot.end,
        durationMinutes: Math.floor((slot.end.getTime() - travelEndMs) / 60000),
        isAvailable: true,
        prevLocationId: toLocationId,
        nextLocationId: slot.nextLocationId,
      });
    }

    // Replace slot and record occupied travel
    const availableNewSlots = newSlots.filter((s) => s.isAvailable);
    slots.splice(slotIndex, 1, ...availableNewSlots);

    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
    occupiedSlots.push(...newSlots.filter((s) => !s.isAvailable));
    this.occupiedSlots.set(dayKey, occupiedSlots);

    return { success: true };
  }

  /**
   * Reserve an insufficient travel-before segment when there's not enough room for full travel.
   * Creates a travel event that fills whatever space is available before the target time,
   * marked with insufficientTravel flag for alert styling.
   */
  reserveInsufficientTravelBefore(
    travelEnd: Date,
    requiredTravelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
    eventId: string
  ): { success: boolean } {
    const dayKey = this.getDayKey(travelEnd);
    const slots = this.availableSlots.get(dayKey);
    if (!slots) return { success: false };

    const travelEndMs = travelEnd.getTime();
    const bufferMs = this.bufferTimeMinutes * 60000;

    // Find the slot that ends at or contains travelEnd
    const slotIndex = slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.end.getTime() >= travelEndMs
    );
    if (slotIndex === -1) return { success: false };

    const slot = slots[slotIndex];

    // Travel starts at the original slot start (before buffer adjustment)
    // This allows travel to fill the entire gap including the buffer zone
    const travelStart = new Date(slot.start.getTime() - bufferMs);
    const travelStartMs = travelStart.getTime();

    // If there's no space at all, skip
    if (travelStartMs >= travelEndMs) return { success: false };

    const newSlots: TimeSlot[] = [];

    // Occupied travel segment (insufficient - fills available space)
    const travelSlot = TimeSlotUtils.createTravelSlot(
      travelStart,
      travelEnd,
      fromLocationId,
      toLocationId,
      `travel-insufficient-${eventId}`,
      {
        insufficientTravel: true,
        requiredTravelMinutes,
      }
    );
    newSlots.push(travelSlot);

    // Available after travel (if any)
    if (slot.end.getTime() > travelEndMs) {
      newSlots.push({
        start: travelEnd,
        end: slot.end,
        durationMinutes: Math.floor((slot.end.getTime() - travelEndMs) / 60000),
        isAvailable: true,
        prevLocationId: toLocationId,
        nextLocationId: slot.nextLocationId,
      });
    }

    // Replace slot and record occupied travel
    const availableNewSlots = newSlots.filter((s) => s.isAvailable);
    slots.splice(slotIndex, 1, ...availableNewSlots);

    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
    occupiedSlots.push(...newSlots.filter((s) => !s.isAvailable));
    this.occupiedSlots.set(dayKey, occupiedSlots);

    return { success: true };
  }

  /**
   * Reserve an insufficient travel-after segment when there's not enough room for full travel.
   * Creates a travel event that fills whatever space is available after the start time,
   * marked with insufficientTravel flag for alert styling.
   */
  reserveInsufficientTravelAfter(
    travelStart: Date,
    requiredTravelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
    eventId: string
  ): { success: boolean } {
    const dayKey = this.getDayKey(travelStart);
    const slots = this.availableSlots.get(dayKey);
    if (!slots) return { success: false };

    const travelStartMs = travelStart.getTime();
    const bufferMs = this.bufferTimeMinutes * 60000;

    // Find the slot that contains travelStart (account for buffer zone)
    const slotIndex = slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.start.getTime() - bufferMs <= travelStartMs &&
        slot.end.getTime() > travelStartMs
    );
    if (slotIndex === -1) return { success: false };

    const slot = slots[slotIndex];

    // Travel ends at the slot end (filling available space)
    const travelEnd = slot.end;
    const travelEndMs = travelEnd.getTime();

    // If there's no space at all, skip
    if (travelStartMs >= travelEndMs) return { success: false };

    const newSlots: TimeSlot[] = [];

    // Available before travel (if any)
    if (travelStartMs > slot.start.getTime()) {
      newSlots.push({
        start: slot.start,
        end: travelStart,
        durationMinutes: Math.floor(
          (travelStartMs - slot.start.getTime()) / 60000
        ),
        isAvailable: true,
        prevLocationId: slot.prevLocationId,
        nextLocationId: fromLocationId,
      });
    }

    // Occupied travel segment (insufficient - fills available space)
    const travelSlot = TimeSlotUtils.createTravelSlot(
      travelStart,
      travelEnd,
      fromLocationId,
      toLocationId,
      `travel-insufficient-${eventId}`,
      {
        insufficientTravel: true,
        requiredTravelMinutes,
      }
    );
    newSlots.push(travelSlot);

    // Replace slot and record occupied travel
    const availableNewSlots = newSlots.filter((s) => s.isAvailable);
    slots.splice(slotIndex, 1, ...availableNewSlots);

    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
    occupiedSlots.push(...newSlots.filter((s) => !s.isAvailable));
    this.occupiedSlots.set(dayKey, occupiedSlots);

    return { success: true };
  }

  /**
   * Set the travel time matrix for location-aware scheduling
   */
  setTravelTimeMatrix(matrix: Map<string, TravelTimeEntry> | null): void {
    this.travelTimeMatrix = matrix;
  }

  /**
   * Provide category periods (wrappers) with locations for travel context.
   * Call this from CalendarGenerator after computing category windows.
   */
  setCategoryPeriods(
    periods: Array<{ start: Date; end: Date; locationId: string | null }>
  ): void {
    this.categoryPeriodsByDay.clear();
    for (const p of periods) {
      const key = this.getDayKey(p.start);
      const list = this.categoryPeriodsByDay.get(key) || [];
      list.push({
        start: p.start,
        end: p.end,
        locationId: p.locationId ?? null,
      });
      this.categoryPeriodsByDay.set(key, list);
    }
    // Sort periods per day by start time for faster lookup
    for (const [k, list] of this.categoryPeriodsByDay.entries()) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
      this.categoryPeriodsByDay.set(k, list);
    }
  }

  /**
   * Lookup category location at a given time if the time falls inside a wrapper.
   */
  private getCategoryLocationAt(date: Date): string | null {
    const key = this.getDayKey(date);
    const list = this.categoryPeriodsByDay.get(key) || [];
    for (const p of list) {
      if (date >= p.start && date <= p.end) {
        return p.locationId ?? null;
      }
    }
    return null;
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
   * Build available time slots for a date range
   * @param templateMasks - Template masks for determining occupied time (no SimpleEvent generation needed)
   * @param plannerLocationMap - Optional map of planner ID to location ID for tracking slot neighbors
   */
  buildAvailableSlots(
    startDate: Date, // Comment: Why start and end date when this function
    // is only used to calculate slots for one day?
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

    // Convert template masks directly to intervals for this date
    // Templates are handled via masks to avoid duplication
    const templateIntervals = masksToIntervals(templateMasks, startDate);

    // Combine all occupied intervals
    const occupiedIntervals = [...eventIntervals, ...templateIntervals];

    // Find gaps between occupied intervals (gaps now have prevLocationId/nextLocationId)
    const gaps = findGaps(occupiedIntervals, startDate, endDate);

    // Convert gaps to available time slots (location info is preserved)
    let slots = gapsToTimeSlots(gaps);

    // Apply leading buffer to slots that follow templates/fixed events
    // This ensures scheduled tasks don't start immediately after templates.
    // NOTE: This is NOT double-buffering - it handles different scenarios:
    // - Leading buffer: Applied once during initial slot building (after templates)
    // - Trailing buffer: Applied when scheduling tasks (via reserveSlotWithTravel)
    // When a task is scheduled, the slot is split and the "after" slot starts
    // at taskEnd + buffer, so subsequent tasks get proper spacing automatically.
    // We identify "start of range" slots by comparing slot.start to startDate
    if (this.bufferTimeMinutes > 0) {
      const rangeStartTime = startDate.getTime();
      slots = slots
        .map((slot) => {
          // Only apply leading buffer if this slot doesn't start at the range beginning
          // (meaning there's a preceding event/template before this slot)
          const isStartOfRange = slot.start.getTime() === rangeStartTime;
          if (!isStartOfRange) {
            const newStart = new Date(
              slot.start.getTime() + this.bufferTimeMinutes * 60000
            );
            const newDuration = Math.floor(
              (slot.end.getTime() - newStart.getTime()) / 60000
            );
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
        })
        .filter((slot) => slot.durationMinutes > 0);
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
      // Determine effective from-location for travel, preferring category-wrapper location
      const catLocAtTo = this.getCategoryLocationAt(transition.toEventStart);
      let effectiveFromLocationId = transition.fromLocationId;
      if (catLocAtTo) {
        effectiveFromLocationId = catLocAtTo;
      } else {
        // Fallback: prefer slot-based prev location when available
        const slotAtGapEnd = slots.find(
          (s) => s.end.getTime() === transition.toEventStart.getTime()
        );
        effectiveFromLocationId =
          slotAtGapEnd?.prevLocationId ?? transition.fromLocationId;
      }
      const effectiveToLocationId = transition.toLocationId;

      const requiredTravelMinutes = this.getTravelTime(
        effectiveFromLocationId,
        effectiveToLocationId,
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
          occupiedSlots,
          effectiveFromLocationId,
          effectiveToLocationId
        );
      } else {
        // Normal case - enough space for full travel
        this.createNormalTravelSlot(
          transition,
          requiredTravelMinutes,
          slots,
          occupiedSlots,
          effectiveFromLocationId,
          effectiveToLocationId
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
    occupiedSlots: TimeSlot[],
    effectiveFromLocationId: string | null | undefined,
    effectiveToLocationId: string | null | undefined
  ): void {
    const travelEnd = new Date(transition.toEventStart.getTime());
    const travelStart = new Date(transition.fromEventEnd.getTime());

    const travelSlot = TimeSlotUtils.createTravelSlot(
      travelStart,
      travelEnd,
      effectiveFromLocationId!,
      effectiveToLocationId!,
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
        s.prevLocationId === effectiveFromLocationId
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
    occupiedSlots: TimeSlot[],
    effectiveFromLocationId: string | null | undefined,
    effectiveToLocationId: string | null | undefined
  ): void {
    const bufferMs = this.bufferTimeMinutes * 60000;
    const travelMs = requiredTravelMinutes * 60000;

    const travelEnd = new Date(transition.toEventStart.getTime());
    const travelStart = new Date(travelEnd.getTime() - travelMs);

    // Use the original gap start (fromEventEnd) to check if travel fits,
    // since correspondingSlot.start may have been adjusted by buffer
    const originalGapStart = transition.fromEventEnd.getTime();

    // Travel fits if it starts at or after the original gap start
    if (travelStart.getTime() >= originalGapStart) {
      const travelSlot = TimeSlotUtils.createTravelSlot(
        travelStart,
        travelEnd,
        effectiveFromLocationId!,
        effectiveToLocationId!,
        `travel-gap-${originalGapStart}`
      );
      occupiedSlots.push(travelSlot);

      // Find and shrink the corresponding available slot
      const correspondingSlot = slots.find(
        (s) =>
          s.end.getTime() === transition.toEventStart.getTime() &&
          s.prevLocationId === effectiveFromLocationId
      );

      if (correspondingSlot) {
        // Shrink the available slot to end at buffer before travel (or slot start if no room)
        const newEndTime = Math.max(
          correspondingSlot.start.getTime(),
          travelStart.getTime() - bufferMs
        );
        correspondingSlot.end = new Date(newEndTime);
        correspondingSlot.durationMinutes = Math.floor(
          (correspondingSlot.end.getTime() - correspondingSlot.start.getTime()) /
            60000
        );
      }
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
   * Find all slots that could potentially fit a duration (plus buffer time)
   * Does NOT filter by travel time - caller should check capacity based on location match
   * Preserves location info (prevLocationId, nextLocationId) on returned slots
   */
  findAllFittingSlots(
    durationMinutes: number,
    afterDate: Date = this.currentDate,
    maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH,
    categoryConstraint?: CategoryConstraint
  ): TimeSlot[] {
    const fittingSlots: TimeSlot[] = [];
    const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
    let currentDate = new Date(afterDate);

    // Base required time: task duration + 1 buffer (minimum)
    // The Scheduler will do the final capacity check including travel time
    const baseRequiredMinutes = durationMinutes + this.bufferTimeMinutes;

    while (currentDate <= searchEndDate) {
      const dayKey = this.getDayKey(currentDate);
      const slots = this.availableSlots.get(dayKey);

      if (slots) {
        // If a category constraint is provided, intersect free slots with that day's category windows
        if (categoryConstraint && categoryConstraint.timeSlots?.length) {
          const dayOfWeek = currentDate.getDay();
          // Build category window periods for this day
          const categoryPeriods: Array<{ start: Date; end: Date }> = [];
          for (const catSlot of categoryConstraint.timeSlots) {
            if (!catSlot.days.includes(dayOfWeek)) continue;
            const [startHour, startMin] = catSlot.startTime
              .split(":")
              .map(Number);
            const [endHour, endMin] = catSlot.endTime.split(":").map(Number);
            const periodStart = new Date(currentDate);
            periodStart.setHours(startHour, startMin, 0, 0);
            const periodEnd = new Date(currentDate);
            periodEnd.setHours(endHour, endMin, 0, 0);
            categoryPeriods.push({ start: periodStart, end: periodEnd });
          }

          for (const slot of slots) {
            if (slot.end <= afterDate) continue;

            for (const period of categoryPeriods) {
              // Compute intersection of available slot and category period
              const intersectStart =
                slot.start > period.start ? slot.start : period.start;
              const intersectEnd =
                slot.end < period.end ? slot.end : period.end;
              if (intersectEnd <= intersectStart) continue;

              const effectiveStart =
                intersectStart < afterDate ? afterDate : intersectStart;
              if (intersectEnd <= effectiveStart) continue;

              const effectiveMinutes = dateTimeService.getMinutesDifference(
                effectiveStart,
                intersectEnd
              );

              if (effectiveMinutes >= baseRequiredMinutes) {
                // Inside a category window: prefer the category's location context for travel
                const categoryLoc = categoryConstraint?.locationId ?? null;
                fittingSlots.push({
                  ...slot,
                  start: effectiveStart,
                  end: intersectEnd,
                  durationMinutes: effectiveMinutes,
                  prevLocationId: categoryLoc ?? slot.prevLocationId,
                  nextLocationId: categoryLoc ?? slot.nextLocationId,
                });
              }
            }
          }
        } else {
          // Original behavior: consider all free slots
          for (const slot of slots) {
            if (slot.end <= afterDate) continue;

            const effectiveStart =
              slot.start < afterDate ? afterDate : slot.start;
            const effectiveMinutes = dateTimeService.getMinutesDifference(
              effectiveStart,
              slot.end
            );

            // Only check if slot can fit base requirement (duration + buffer)
            if (effectiveMinutes >= baseRequiredMinutes) {
              fittingSlots.push({
                ...slot,
                start: effectiveStart,
                durationMinutes: effectiveMinutes,
                prevLocationId: slot.prevLocationId,
                nextLocationId: slot.nextLocationId,
              });
            }
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
        travelAfterEnd.getTime() - travelAfter * 60000
      );
    }

    // 1. Slot before everything (available) - from slot.start to fullStart
    // The slot BEFORE a task should have nextLocationId = taskLocationId (where we're going)
    if (fullStart.getTime() > slot.start.getTime()) {
      newSlots.push({
        start: slot.start,
        end: fullStart,
        durationMinutes: Math.floor(
          (fullStart.getTime() - slot.start.getTime()) / 60000
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
    } else if (reusableTravelStart) {
      // We're reusing existing travel (travelAfter=0), so the free slot ends where that travel starts (minus buffer)
      freeSlotEnd = new Date(
        reusableTravelStart.getTime() - bufferMinutes * 60000
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
          (freeSlotEnd.getTime() - freeSlotStart.getTime()) / 60000
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
    const searchWindowMs = bufferMs + SCHEDULING_CONFIG.ADJACENT_TRAVEL_TOLERANCE_MS;

    for (const slot of occupiedSlots) {
      if (
        TimeSlotUtils.isTravelSlot(slot) &&
        slot.travelToLocationId === toLocationId
      ) {
        // Check if this travel starts near our search time
        const timeDiff = Math.abs(slot.start.getTime() - nearTime.getTime());
        if (timeDiff <= searchWindowMs) {
          return new Date(slot.start.getTime());
        }
      }
    }

    return null;
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
}
