/**
 * TravelManager
 *
 * Manages travel time calculations and travel slot reservations.
 * Handles normal travel, insufficient travel, and location transitions.
 */

import { TimeSlot, TimeSlotUtils } from "../../../models/TimeSlot";
import { TravelTimeEntry } from "../../../models/SchedulingModels";
import { CategoryContext } from "../context/CategoryContext";
import {
  Interval,
  LocationTransition,
  findLocationTransitions,
} from "../../../utils/intervalUtils";

export class TravelManager {
  private travelTimeMatrix: Map<string, TravelTimeEntry> | null = null;

  constructor(
    private availableSlots: Map<string, TimeSlot[]>,
    private occupiedSlots: Map<string, TimeSlot[]>,
    private bufferTimeMinutes: number,
    private categoryContext: CategoryContext,
    private getDayKeyFn: (date: Date) => string,
    travelTimeMatrix?: Map<string, TravelTimeEntry>,
  ) {
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
    timeOfDay: Date,
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
   * Check if we can place a standalone travel-before that ends at a given time.
   * Non-mutating: scans available slots on the day to see if [travelStart, travelEnd] fits.
   */
  canPlaceStandaloneTravelBefore(
    travelEnd: Date,
    travelMinutes: number,
  ): boolean {
    const dayKey = this.getDayKeyFn(travelEnd);
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
          slot.end.getTime() >= travelEndMs,
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
    force: boolean = false,
  ): { success: boolean } {
    const dayKey = this.getDayKeyFn(travelEnd);
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
        `travel-to-${eventId}`,
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
              durationMinutes: Math.floor(
                (travelStartMs - slotStartMs) / 60000,
              ),
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
        slot.end.getTime() >= travelEndMs,
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
          (travelStartMs - slot.start.getTime()) / 60000,
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
      `travel-to-${eventId}`,
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
    force: boolean = false,
  ): { success: boolean } {
    const dayKey = this.getDayKeyFn(travelStart);
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
        `travel-from-${eventId}`,
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
              durationMinutes: Math.floor(
                (travelStartMs - slotStartMs) / 60000,
              ),
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
        slot.end.getTime() >= travelEndMs,
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
          (travelStartMs - slot.start.getTime()) / 60000,
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
      `travel-from-${eventId}`,
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
    eventId: string,
  ): { success: boolean } {
    const dayKey = this.getDayKeyFn(travelEnd);
    const slots = this.availableSlots.get(dayKey);
    if (!slots) return { success: false };

    const travelEndMs = travelEnd.getTime();
    const bufferMs = this.bufferTimeMinutes * 60000;

    // Find the slot that ends at or contains travelEnd
    const slotIndex = slots.findIndex(
      (slot) => slot.isAvailable && slot.end.getTime() >= travelEndMs,
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
      },
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
    eventId: string,
  ): { success: boolean } {
    const dayKey = this.getDayKeyFn(travelStart);
    const slots = this.availableSlots.get(dayKey);
    if (!slots) return { success: false };

    const travelStartMs = travelStart.getTime();
    const bufferMs = this.bufferTimeMinutes * 60000;

    // Find the slot that contains travelStart (account for buffer zone)
    const slotIndex = slots.findIndex(
      (slot) =>
        slot.isAvailable &&
        slot.start.getTime() - bufferMs <= travelStartMs &&
        slot.end.getTime() > travelStartMs,
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
          (travelStartMs - slot.start.getTime()) / 60000,
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
      },
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
   * Find an existing travel slot going to a destination near a given time.
   * Used to determine if travel-after can be reused instead of reserving new space.
   *
   * @param nearTime - The time to search near (typically the end of an available slot)
   * @param toLocationId - The destination location to check for
   * @returns The travel slot's start time if found, null otherwise
   */
  findAdjacentTravelTo(nearTime: Date, toLocationId: string): Date | null {
    const dayKey = this.getDayKeyFn(nearTime);
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];

    // Look for travel slots that:
    // 1. Go to the same destination (toLocationId)
    // 2. Start near the given time (within buffer + reasonable search window)
    const bufferMs = this.bufferTimeMinutes * 60000;
    // ADJACENT_TRAVEL_TOLERANCE_MS = 10 * 60 * 1000 (10 minutes)
    const searchWindowMs = bufferMs + 10 * 60 * 1000;

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
   * Process location transitions to create travel slots
   * Handles: normal travel, insufficient travel (partial), and trespassing (no travel)
   * Modifies slots array in place and adds travel slots to occupiedSlots
   */
  processTravelTransitions(
    startDate: Date,
    intervals: Interval[],
    slots: TimeSlot[],
  ): void {
    const dayKey = this.getDayKeyFn(startDate);
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
    const transitions = findLocationTransitions(intervals);

    for (const transition of transitions) {
      // Determine effective from-location and to-location for travel
      // considering category boundaries.
      //
      // If the TO event is inside a category, travel should be FROM category location
      // If the FROM event is inside a category, travel should be TO category location
      // (then separate category travel handles category → outside)

      const catLocAtFrom = this.categoryContext.getCategoryLocationAt(
        transition.fromEventEnd,
      );
      const catLocAtTo = this.categoryContext.getCategoryLocationAt(
        transition.toEventStart,
      );

      let effectiveFromLocationId = transition.fromLocationId;
      let effectiveToLocationId = transition.toLocationId;

      if (catLocAtTo) {
        // TO event is inside a category - travel should be from category location
        effectiveFromLocationId = catLocAtTo;
      } else {
        // Not in a category - use slot-based prev location when available
        const slotAtGapEnd = slots.find(
          (s) => s.end.getTime() === transition.toEventStart.getTime(),
        );
        effectiveFromLocationId =
          slotAtGapEnd?.prevLocationId ?? transition.fromLocationId;
      }

      if (catLocAtFrom && !catLocAtTo) {
        // FROM event is inside a category, TO event is outside
        // Travel should return to category location first
        // (category travel AFTER will handle category → next location)
        effectiveToLocationId = catLocAtFrom;
      }

      const requiredTravelMinutes = this.getTravelTime(
        effectiveFromLocationId,
        effectiveToLocationId,
        transition.toEventStart,
      );

      // DEBUG - find interval names
      const _fromInterval = intervals.find(
        (i) => i.end.getTime() === transition.fromEventEnd.getTime(),
      );
      const _toInterval = intervals.find(
        (i) => i.start.getTime() === transition.toEventStart.getTime(),
      );
      console.log(
        `[TRAVEL] "${"fromEvent"}" → "${"toEvent"}" | ` +
          `times: ${transition.fromEventEnd.toLocaleTimeString()}-${transition.toEventStart.toLocaleTimeString()} | ` +
          `origLocs: ${transition.fromLocationId || "null"}→${transition.toLocationId || "null"} | ` +
          `catLocs: from=${catLocAtFrom || "null"} to=${catLocAtTo || "null"} | ` +
          `effective: ${effectiveFromLocationId || "null"}→${effectiveToLocationId || "null"} | ` +
          `travel=${requiredTravelMinutes}min gap=${transition.gapMinutes}min`,
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
        console.log(`[TRAVEL] → CREATING INSUFFICIENT travel slot`);
        this.createInsufficientTravelSlot(
          transition,
          requiredTravelMinutes,
          slots,
          occupiedSlots,
          effectiveFromLocationId,
          effectiveToLocationId,
        );
      } else {
        // Normal case - enough space for full travel
        console.log(`[TRAVEL] → CREATING NORMAL travel slot`);
        this.createNormalTravelSlot(
          transition,
          requiredTravelMinutes,
          slots,
          occupiedSlots,
          effectiveFromLocationId,
          effectiveToLocationId,
        );
      }
    }

    this.occupiedSlots.set(dayKey, occupiedSlots);
  }

  /**
   * Create a travel slot when there's insufficient time (fills available space)
   */
  private createInsufficientTravelSlot(
    transition: LocationTransition,
    requiredTravelMinutes: number,
    slots: TimeSlot[],
    occupiedSlots: TimeSlot[],
    effectiveFromLocationId: string | null | undefined,
    effectiveToLocationId: string | null | undefined,
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
      },
    );
    occupiedSlots.push(travelSlot);

    // Shrink the corresponding available slot
    const correspondingSlot = slots.find(
      (s) =>
        s.end.getTime() === transition.toEventStart.getTime() &&
        s.prevLocationId === effectiveFromLocationId,
    );
    if (correspondingSlot) {
      correspondingSlot.end = travelStart;
      correspondingSlot.durationMinutes = Math.floor(
        (correspondingSlot.end.getTime() - correspondingSlot.start.getTime()) /
          60000,
      );
    }
  }

  /**
   * Create a travel slot when there's enough time for full travel
   * Travel is placed at the END of the slot (right before the next event)
   */
  private createNormalTravelSlot(
    transition: LocationTransition,
    requiredTravelMinutes: number,
    slots: TimeSlot[],
    occupiedSlots: TimeSlot[],
    effectiveFromLocationId: string | null | undefined,
    effectiveToLocationId: string | null | undefined,
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
        `travel-gap-${originalGapStart}`,
      );
      occupiedSlots.push(travelSlot);

      // Find and shrink the corresponding available slot
      const correspondingSlot = slots.find(
        (s) =>
          s.end.getTime() === transition.toEventStart.getTime() &&
          s.prevLocationId === effectiveFromLocationId,
      );

      if (correspondingSlot) {
        // Shrink the available slot to end at buffer before travel (or slot start if no room)
        const newEndTime = Math.max(
          correspondingSlot.start.getTime(),
          travelStart.getTime() - bufferMs,
        );
        correspondingSlot.end = new Date(newEndTime);
        correspondingSlot.durationMinutes = Math.floor(
          (correspondingSlot.end.getTime() -
            correspondingSlot.start.getTime()) /
            60000,
        );
      }
    }
  }
}
