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
 * TimeSlotManager - Orchestrator Class
 *
 * Lightweight orchestrator that delegates to specialized helper classes:
 * - TravelManager: Handles travel time calculations and lookups
 * - TravelConverter: Converts travel slots to SimpleEvents
 * - SlotBuilder: Builds available slots from events and templates
 * - SlotFinder: Finds slots that fit tasks with constraints
 * - SlotReserver: Reserves slots and manages travel placement
 */

import { SimpleEvent } from "@/types/prisma";
import { TimeSlot } from "../models/TimeSlot";
import { PerTemplateMask } from "../utils/intervalUtils";
import { dateTimeService } from "../utils/dateTimeService";
import { WeekDayIntegers } from "@/types/calendarTypes";
import {
  TravelTimeEntry,
  CategoryConstraint,
} from "../models/SchedulingModels";

// Import helper classes
import { TravelManager } from "./TimeSlotManager/travel/TravelManager";
import { TravelConverter } from "./TimeSlotManager/converter/TravelConverter";
import { SlotBuilder } from "./TimeSlotManager/builder/SlotBuilder";
import { SlotFinder } from "./TimeSlotManager/finder/SlotFinder";
import { SlotReserver } from "./TimeSlotManager/reserver/SlotReserver";

export class TimeSlotManager {
  // Core state
  private availableSlots: Map<string, TimeSlot[]> = new Map();
  private occupiedSlots: Map<string, TimeSlot[]> = new Map();
  private bufferTimeMinutes: number = 0;

  // Helper class instances
  private travelManager: TravelManager;
  private slotBuilder: SlotBuilder;
  private slotFinder: SlotFinder;
  private slotReserver: SlotReserver;

  constructor(
    private weekStartDay: WeekDayIntegers,
    private currentDate: Date = new Date(),
    bufferTimeMinutes: number = 0,
    travelTimeMatrix?: Map<string, TravelTimeEntry>,
  ) {
    this.bufferTimeMinutes = bufferTimeMinutes;

    this.travelManager = new TravelManager(
      this.availableSlots,
      this.occupiedSlots,
      bufferTimeMinutes,
      this.getDayKey.bind(this),
      travelTimeMatrix,
    );

    this.slotBuilder = new SlotBuilder(
      this.availableSlots,
      this.occupiedSlots,
      this.travelManager,
      this.getDayKey.bind(this),
      weekStartDay,
      bufferTimeMinutes,
    );

    this.slotFinder = new SlotFinder(
      this.availableSlots,
      this.getDayKey.bind(this),
      bufferTimeMinutes,
    );

    this.slotReserver = new SlotReserver(
      this.availableSlots,
      this.occupiedSlots,
      this.travelManager,
      this.getDayKey.bind(this),
      bufferTimeMinutes,
    );
  }

  // ===== Travel Time Matrix Management =====

  setTravelTimeMatrix(matrix: Map<string, TravelTimeEntry> | null): void {
    this.travelManager.setTravelTimeMatrix(matrix);
  }

  getTravelTime(
    fromLocationId: string | null,
    toLocationId: string | null,
    timeOfDay: Date,
  ): number {
    return this.travelManager.getTravelTime(fromLocationId, toLocationId, timeOfDay);
  }

  // ===== Category Period Management =====

  setCategoryPeriods(
    periods: Array<{ start: Date; end: Date; locationId: string | null; categoryId: string; isStrict: boolean }>,
  ): void {
    this.slotBuilder.setCategoryPeriods(periods);
  }

  // ===== Slot Building =====

  buildAvailableSlots(
    startDate: Date,
    endDate: Date,
    existingEvents: SimpleEvent[],
    templateMasks: PerTemplateMask[],
    plannerLocationMap?: Map<string, string | null>,
  ): TimeSlot[] {
    const slots = this.slotBuilder.buildAvailableSlots(
      startDate,
      endDate,
      existingEvents,
      templateMasks,
      plannerLocationMap,
    );

    // Update availableSlots map
    const dayKey = this.getDayKey(startDate);
    this.availableSlots.set(dayKey, slots);

    return slots;
  }

  buildDailySlots(
    startDate: Date,
    numDays: number,
    existingEvents: SimpleEvent[],
    templateMasks: PerTemplateMask[],
    plannerLocationMap?: Map<string, string | null>,
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
        plannerLocationMap,
      );

      dailySlots.set(dayKey, daySlots);
      this.availableSlots.set(dayKey, daySlots);
    }

    return dailySlots;
  }

  // ===== Slot Finding =====

  findAllFittingSlots(
    durationMinutes: number,
    afterDate: Date = this.currentDate,
    maxDaysToSearch: number = 30,
    categoryConstraint?: CategoryConstraint,
  ): TimeSlot[] {
    return this.slotFinder.findAllFittingSlots(
      durationMinutes,
      afterDate,
      maxDaysToSearch,
      categoryConstraint,
    );
  }

  findAdjacentTravelTo(nearTime: Date, toLocationId: string): Date | null {
    return this.travelManager.findAdjacentTravelTo(nearTime, toLocationId);
  }

  findAdjacentTravelFrom(nearTime: Date, fromLocationId: string): TimeSlot | null {
    return this.travelManager.findAdjacentTravelFrom(nearTime, fromLocationId);
  }

  findPrecedingGapTravel(slotStart: Date): TimeSlot | null {
    return this.travelManager.findPrecedingGapTravel(slotStart);
  }

  // ===== Slot Reservation =====

  reserveSlot(
    start: Date,
    end: Date,
    eventId: string,
    eventType: "task" | "goal" | "plan" | "template" | "travel",
    locationId?: string | null,
  ): boolean {
    return this.slotReserver.reserveSlot(
      start,
      end,
      eventId,
      eventType,
      locationId,
    );
  }

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
    reusableTravelStart?: Date | null,
    absorbPrevTravelAfter?: boolean,
    reclaimPrecedingGapTravel?: TimeSlot | null,
  ): { success: boolean } {
    return this.slotReserver.reserveSlotWithTravel(
      start,
      end,
      eventId,
      eventType,
      taskLocationId,
      travelBefore,
      travelAfter,
      prevLocationId,
      nextLocationId,
      reusableTravelStart,
      absorbPrevTravelAfter,
      reclaimPrecedingGapTravel,
    );
  }

  // ===== Standalone Travel Reservation =====

  canPlaceStandaloneTravelBefore(
    travelEnd: Date,
    travelMinutes: number,
  ): boolean {
    return this.travelManager.canPlaceStandaloneTravelBefore(
      travelEnd,
      travelMinutes,
    );
  }

  reserveStandaloneTravelBefore(
    travelEnd: Date,
    travelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
    eventId: string,
    force: boolean = false,
  ): { success: boolean } {
    return this.travelManager.reserveStandaloneTravelBefore(
      travelEnd,
      travelMinutes,
      fromLocationId,
      toLocationId,
      eventId,
      force,
    );
  }

  reserveStandaloneTravelAfter(
    travelStart: Date,
    travelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
    eventId: string,
    force: boolean = false,
  ): { success: boolean } {
    return this.travelManager.reserveStandaloneTravelAfter(
      travelStart,
      travelMinutes,
      fromLocationId,
      toLocationId,
      eventId,
      force,
    );
  }

  reserveInsufficientTravelBefore(
    travelEnd: Date,
    requiredTravelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
    eventId: string,
  ): { success: boolean } {
    return this.travelManager.reserveInsufficientTravelBefore(
      travelEnd,
      requiredTravelMinutes,
      fromLocationId,
      toLocationId,
      eventId,
    );
  }

  reserveInsufficientTravelAfter(
    travelStart: Date,
    requiredTravelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
    eventId: string,
  ): { success: boolean } {
    return this.travelManager.reserveInsufficientTravelAfter(
      travelStart,
      requiredTravelMinutes,
      fromLocationId,
      toLocationId,
      eventId,
    );
  }

  // ===== Travel Event Generation =====

  getAllTravelSlots(): TimeSlot[] {
    return TravelConverter.getAllTravelSlots(this.occupiedSlots);
  }

  generateTravelEvents(userId: string): SimpleEvent[] {
    return TravelConverter.generateTravelEvents(
      this.occupiedSlots,
      userId,
    );
  }

  // ===== Slot Queries =====

  getDaySlots(date: Date): TimeSlot[] {
    const dayKey = this.getDayKey(date);
    return this.availableSlots.get(dayKey) || [];
  }

  getDayAvailableMinutes(date: Date): number {
    const slots = this.getDaySlots(date);
    return slots.reduce((total, slot) => total + slot.durationMinutes, 0);
  }

  getWeekAvailableMinutes(weekStartDate: Date): number {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const date = dateTimeService.shiftDays(weekStartDate, i);
      total += this.getDayAvailableMinutes(date);
    }
    return total;
  }

  // ===== Utility Methods =====

  clear(): void {
    this.availableSlots.clear();
    this.occupiedSlots.clear();
  }

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
