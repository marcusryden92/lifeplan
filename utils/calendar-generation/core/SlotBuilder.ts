/**
 * SlotBuilder
 *
 * Responsible for building available time slots from existing events and templates.
 * Handles gap detection, buffer application, and travel transition processing.
 */

import { SimpleEvent } from "@/types/prisma";
import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlot } from "../models/TimeSlot";
import { TravelManager } from "./TravelManager";
import { PerTemplateMask } from "../utils/intervalUtils";
import { buildAvailableSlots } from "./SlotBuilder/index";

export class SlotBuilder {
  private categoryPeriods: CategoryPeriod[] = [];

  constructor(
    private occupiedSlots: Map<string, TimeSlot[]>,
    private travelManager: TravelManager,
    private bufferTimeMinutes: number,
  ) {}

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
    categoryPeriods: CategoryPeriod[],
    plannerLocationMap?: Map<string, string | null>,
  ): TimeSlot[] {
    this.categoryPeriods = categoryPeriods;
    return buildAvailableSlots(
      this.occupiedSlots,
      this.travelManager,
      this.bufferTimeMinutes,
      this.categoryPeriods,
      startDate,
      endDate,
      existingEvents,
      templateMasks,
      categoryPeriods,
      plannerLocationMap,
    );
  }
}
