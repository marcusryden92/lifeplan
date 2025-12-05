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
  eventType?: "task" | "goal" | "plan" | "template";
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

      // If slots are adjacent and both available, merge them
      if (
        last.isAvailable &&
        current.isAvailable &&
        last.end.getTime() === current.start.getTime()
      ) {
        last.end = current.end;
        last.durationMinutes = TimeSlotUtils.getDurationMinutes(last);
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
    };

    return [before, after];
  }

  /**
   * Create an occupied slot from an existing available slot
   */
  static occupySlot(
    slot: TimeSlot,
    start: Date,
    end: Date,
    eventId: string,
    eventType: "task" | "goal" | "plan" | "template"
  ): TimeSlot[] {
    const result: TimeSlot[] = [];

    // Add slot before the occupied time
    if (start > slot.start) {
      result.push({
        start: slot.start,
        end: start,
        durationMinutes: Math.floor(
          (start.getTime() - slot.start.getTime()) / (1000 * 60)
        ),
        isAvailable: true,
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
    if (end < slot.end) {
      result.push({
        start: end,
        end: slot.end,
        durationMinutes: Math.floor(
          (slot.end.getTime() - end.getTime()) / (1000 * 60)
        ),
        isAvailable: true,
      });
    }

    return result;
  }
}
