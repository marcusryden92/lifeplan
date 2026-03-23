import { TimeSlot } from "../models/TimeSlot";
import { CategoryConstraint } from "../models/SchedulingModels";
import { SCHEDULING_CONFIG } from "../constants";
import {
  findAllFittingSlots,
  getDaySlots,
  getDayAvailableMinutes,
} from "./SlotFinder/index";

/**
 * SlotFinder
 * Responsible for finding and querying available time slots with category filtering.
 */
export class SlotFinder {
  constructor(
    private availableSlots: Map<string, TimeSlot[]>,
    private bufferTimeMinutes: number,
  ) {}

  /**
   * Find all slots that could potentially fit a duration (plus buffer time)
   * Does NOT filter by travel time - caller should check capacity based on location match
   * Preserves location info (prevLocationId, nextLocationId) on returned slots
   */
  findAllFittingSlots(
    durationMinutes: number,
    afterDate: Date,
    maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH,
    categoryConstraint?: CategoryConstraint,
  ): TimeSlot[] {
    return findAllFittingSlots(
      this.availableSlots,
      this.bufferTimeMinutes,
      durationMinutes,
      afterDate,
      maxDaysToSearch,
      categoryConstraint,
    );
  }

  /**
   * Get available slots for a specific day
   */
  getDaySlots(date: Date): TimeSlot[] {
    return getDaySlots(this.availableSlots, date);
  }

  /**
   * Get total available minutes for a day
   */
  getDayAvailableMinutes(date: Date): number {
    return getDayAvailableMinutes(this.availableSlots, date);
  }
}
