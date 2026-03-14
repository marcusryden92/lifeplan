/**
 * TimeSlot Model
 *
 * Represents an available or occupied time slot in the calendar.
 * Used for efficient scheduling without minute-by-minute iteration.
 */

export interface TimeSlot {
  /** Start time of the slot */
  start: Date;
  /** End time of the slot */
  end: Date;
  /** Duration in minutes */
  durationMinutes: number;
  /** Whether this slot is available for scheduling */
  isAvailable: boolean;
  /** ID of the event occupying this slot (if any) */
  eventId?: string;
  /** Type of event occupying this slot (if any) */
  eventType?: "task" | "goal" | "plan" | "template" | "travel";
  /** Location ID of the event immediately before this slot (null if none or unknown) */
  prevLocationId?: string | null;
  /** Location ID of the event immediately after this slot (null if none or unknown) */
  nextLocationId?: string | null;
  /** For travel slots: the location ID of the task this travel is associated with */
  travelFromLocationId?: string | null;
  /** For travel slots: the destination location ID */
  travelToLocationId?: string | null;
  /** For travel slots: true if actual travel time is less than required */
  insufficientTravel?: boolean;
  /** For travel slots: the original required travel time in minutes */
  requiredTravelMinutes?: number;
  /** Category that owns this time window, null if uncategorized free time */
  categoryId?: string | null;
  /** Whether this slot belongs to a strict category (blocks uncategorized tasks) */
  isStrictCategory?: boolean;
}

export interface TimeSlotBlock {
  /** Start of the day */
  date: Date;
  /** All slots for this day */
  slots: TimeSlot[];
  /** Quick lookup for available slots */
  availableSlots: TimeSlot[];
}

/**
 * Helper functions for TimeSlot operations
 */
export class TimeSlotUtils {
  /**
   * Calculate duration of a time slot in minutes
   */
  static getDurationMinutes(slot: TimeSlot): number {
    return Math.floor(
      (slot.end.getTime() - slot.start.getTime()) / (1000 * 60)
    );
  }

  /**
   * Check if a time slot can fit a task
   */
  static canFitDuration(slot: TimeSlot, requiredMinutes: number): boolean {
    return slot.isAvailable && slot.durationMinutes >= requiredMinutes;
  }

  /**
   * Check if two time slots overlap
   */
  static doSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    return slot1.start < slot2.end && slot2.start < slot1.end;
  }

  /**
   * Merge adjacent available time slots
   */
  static mergeAdjacentSlots(slots: TimeSlot[]): TimeSlot[] {
    if (slots.length === 0) return [];

    const sorted = [...slots].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
    const merged: TimeSlot[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      // If slots are adjacent, both available, and in the same category window, merge them
      if (
        last.isAvailable &&
        current.isAvailable &&
        last.end.getTime() === current.start.getTime() &&
        last.categoryId === current.categoryId
      ) {
        last.end = current.end;
        last.durationMinutes = TimeSlotUtils.getDurationMinutes(last);
        // Preserve nextLocationId from the slot being absorbed (it's the rightmost)
        last.nextLocationId = current.nextLocationId;
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Split a time slot at a specific time
   */
  static splitSlot(
    slot: TimeSlot,
    splitTime: Date
  ): [TimeSlot | null, TimeSlot | null] {
    if (splitTime <= slot.start || splitTime >= slot.end) {
      return [slot, null];
    }

    const before: TimeSlot = {
      start: slot.start,
      end: splitTime,
      durationMinutes: Math.floor(
        (splitTime.getTime() - slot.start.getTime()) / (1000 * 60)
      ),
      isAvailable: slot.isAvailable,
      eventId: slot.eventId,
      eventType: slot.eventType,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    };

    const after: TimeSlot = {
      start: splitTime,
      end: slot.end,
      durationMinutes: Math.floor(
        (slot.end.getTime() - splitTime.getTime()) / (1000 * 60)
      ),
      isAvailable: slot.isAvailable,
      eventId: slot.eventId,
      eventType: slot.eventType,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    };

    return [before, after];
  }

  /**
   * Create an occupied slot from an existing available slot
   * @param locationId - Location ID of the event being placed (null = "everywhere")
   *
   * Location inheritance rules:
   * - If task has a location: adjacent slots get that location
   * - If task is "everywhere" (null):
   *   - "before" slot gets nextLocationId = null (no travel to "everywhere")
   *   - "after" slot inherits prevLocationId from original slot (preserve travel context)
   */
  static occupySlot(
    slot: TimeSlot,
    start: Date,
    end: Date,
    eventId: string,
    eventType: "task" | "goal" | "plan" | "template" | "travel",
    locationId?: string | null
  ): TimeSlot[] {
    const result: TimeSlot[] = [];

    // For "everywhere" tasks (locationId is null or undefined):
    // - The "after" slot should inherit the original prevLocationId to preserve travel context
    // For tasks with a location:
    // - The "after" slot gets that location as its prevLocationId
    const afterSlotPrevLocation = locationId ?? slot.prevLocationId;

    // Add slot before the occupied time
    // Its nextLocationId becomes the task's location (null for "everywhere" = no travel needed)
    if (start > slot.start) {
      result.push({
        start: slot.start,
        end: start,
        durationMinutes: Math.floor(
          (start.getTime() - slot.start.getTime()) / (1000 * 60)
        ),
        isAvailable: true,
        prevLocationId: slot.prevLocationId,
        nextLocationId: locationId ?? null,  // null means no travel needed to reach this event
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
      });
    }

    // Add the occupied slot
    result.push({
      start,
      end,
      durationMinutes: Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60)
      ),
      isAvailable: false,
      eventId,
      eventType,
    });

    // Add slot after the occupied time
    // Its prevLocationId inherits for "everywhere" tasks, or uses task's location
    if (end < slot.end) {
      result.push({
        start: end,
        end: slot.end,
        durationMinutes: Math.floor(
          (slot.end.getTime() - end.getTime()) / (1000 * 60)
        ),
        isAvailable: true,
        prevLocationId: afterSlotPrevLocation,
        nextLocationId: slot.nextLocationId,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
      });
    }

    return result;
  }

  /**
   * Create a travel slot (occupied, but can be reclaimed by same-location tasks)
   * @param options - Optional properties for tracking travel issues
   */
  static createTravelSlot(
    start: Date,
    end: Date,
    fromLocationId: string,
    toLocationId: string,
    associatedEventId: string,
    options?: {
      insufficientTravel?: boolean;
      requiredTravelMinutes?: number;
    }
  ): TimeSlot {
    return {
      start,
      end,
      durationMinutes: Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60)
      ),
      isAvailable: false,
      eventId: associatedEventId,
      eventType: "travel",
      prevLocationId: fromLocationId,
      nextLocationId: toLocationId,
      travelFromLocationId: fromLocationId,
      travelToLocationId: toLocationId,
      insufficientTravel: options?.insufficientTravel,
      requiredTravelMinutes: options?.requiredTravelMinutes,
    };
  }

  /**
   * Check if a slot is a travel slot that can be reclaimed
   */
  static isTravelSlot(slot: TimeSlot): boolean {
    return slot.eventType === "travel" && !slot.isAvailable;
  }

  /**
   * Convert a travel slot back to an available slot (for reclaiming)
   */
  static reclaimTravelSlot(travelSlot: TimeSlot): TimeSlot {
    return {
      start: travelSlot.start,
      end: travelSlot.end,
      durationMinutes: travelSlot.durationMinutes,
      isAvailable: true,
      prevLocationId: travelSlot.travelFromLocationId ?? travelSlot.prevLocationId,
      nextLocationId: travelSlot.travelToLocationId ?? travelSlot.nextLocationId,
    };
  }
}
