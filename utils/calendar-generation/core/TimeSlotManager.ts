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

import { Planner, SimpleEvent } from "@/types/prisma";
import { weeksNeededForPlans } from "../helpers/TimeSlotManager/weeksNeededForPlans";
import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlot } from "../models/TimeSlot";
import { PerTemplateMask } from "../models/TemplateModels";
import { dateTimeService } from "../utils/dateTimeService";
import { logInitialSlotContext } from "../utils/loggingUtils";
import {
  TravelTimeEntry,
  CategoryConstraint,
} from "../models/SchedulingModels";

import { TravelManager } from "./TravelManager";
import { TravelConverter } from "./TravelConverter";
import { SlotBuilder } from "./SlotBuilder";
import { SlotFinder } from "./SlotFinder";
import { SlotReserver } from "./SlotReserver";

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
    private currentDate: Date = new Date(),
    bufferTimeMinutes: number = 0,
    travelTimeMatrix?: Map<string, TravelTimeEntry>,
  ) {
    this.bufferTimeMinutes = bufferTimeMinutes;

    this.travelManager = new TravelManager(
      this.availableSlots,
      this.occupiedSlots,
      bufferTimeMinutes,
      travelTimeMatrix,
    );

    this.slotBuilder = new SlotBuilder(
      this.occupiedSlots,
      this.travelManager,
      bufferTimeMinutes,
    );

    this.slotFinder = new SlotFinder(
      this.availableSlots,
      bufferTimeMinutes,
    );

    this.slotReserver = new SlotReserver(
      this.availableSlots,
      this.occupiedSlots,
      this.travelManager,
      bufferTimeMinutes,
    );
  }

  // Travel time matrix management

  setTravelTimeMatrix(matrix: Map<string, TravelTimeEntry> | null): void {
    this.travelManager.setTravelTimeMatrix(matrix);
  }

  getTravelTime(
    fromLocationId: string | null,
    toLocationId: string | null,
    timeOfDay: Date,
  ): number {
    return this.travelManager.getTravelTime(
      fromLocationId,
      toLocationId,
      timeOfDay,
    );
  }

  // Slot building

  buildDailySlots(
    startDate: Date,
    planners: Planner[],
    existingEvents: SimpleEvent[],
    templateMasks: PerTemplateMask[],
    categoryPeriods: CategoryPeriod[],
    plannerLocationMap?: Map<string, string | null>,
    enableLogging?: boolean,
  ): void {
    this.clear();
    if (enableLogging) logInitialSlotContext(existingEvents);
    const numDays = Math.max(2, weeksNeededForPlans(planners, startDate)) * 7;
    this.buildSlots(startDate, numDays, existingEvents, templateMasks, categoryPeriods, plannerLocationMap);
  }

  buildWeekSlots(
    weekStart: Date,
    existingEvents: SimpleEvent[],
    templateMasks: PerTemplateMask[],
    categoryPeriods: CategoryPeriod[],
    plannerLocationMap?: Map<string, string | null>,
  ): void {
    this.buildSlots(weekStart, 7, existingEvents, templateMasks, categoryPeriods, plannerLocationMap);
  }

  private buildSlots(
    startDate: Date,
    numDays: number,
    existingEvents: SimpleEvent[],
    templateMasks: PerTemplateMask[],
    categoryPeriods: CategoryPeriod[],
    plannerLocationMap?: Map<string, string | null>,
  ): void {
    for (let i = 0; i < numDays; i++) {
      const date = dateTimeService.shiftDays(startDate, i);
      const dayStart = dateTimeService.startOfDay(date);
      const dayEnd = dateTimeService.endOfDay(date);

      const slots = this.slotBuilder.buildAvailableSlots(
        dayStart,
        dayEnd,
        existingEvents,
        templateMasks,
        categoryPeriods,
        plannerLocationMap,
      );

      this.availableSlots.set(dateTimeService.getDayKey(date), slots);
    }
  }

  // Slot finding

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

  findAdjacentTravelFrom(
    nearTime: Date,
    fromLocationId: string,
  ): TimeSlot | null {
    return this.travelManager.findAdjacentTravelFrom(nearTime, fromLocationId);
  }

  findPrecedingGapTravel(slotStart: Date): TimeSlot | null {
    return this.travelManager.findPrecedingGapTravel(slotStart);
  }

  // Slot reservation

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

  // Standalone travel reservation

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
    force: boolean = false,
  ): { success: boolean } {
    return this.travelManager.reserveStandaloneTravelBefore(
      travelEnd,
      travelMinutes,
      fromLocationId,
      toLocationId,
      force,
    );
  }

  reserveStandaloneTravelAfter(
    travelStart: Date,
    travelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
    force: boolean = false,
  ): { success: boolean } {
    return this.travelManager.reserveStandaloneTravelAfter(
      travelStart,
      travelMinutes,
      fromLocationId,
      toLocationId,
      force,
    );
  }

  reserveInsufficientTravelBefore(
    travelEnd: Date,
    requiredTravelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
  ): { success: boolean } {
    return this.travelManager.reserveInsufficientTravelBefore(
      travelEnd,
      requiredTravelMinutes,
      fromLocationId,
      toLocationId,
    );
  }

  reserveInsufficientTravelAfter(
    travelStart: Date,
    requiredTravelMinutes: number,
    fromLocationId: string,
    toLocationId: string,
  ): { success: boolean } {
    return this.travelManager.reserveInsufficientTravelAfter(
      travelStart,
      requiredTravelMinutes,
      fromLocationId,
      toLocationId,
    );
  }

  // Travel event generation

  getAllTravelSlots(): TimeSlot[] {
    return TravelConverter.getAllTravelSlots(this.occupiedSlots);
  }

  generateTravelEvents(userId: string): SimpleEvent[] {
    return TravelConverter.generateTravelEvents(this.occupiedSlots, userId);
  }

  // Slot queries

  getDaySlots(date: Date): TimeSlot[] {
    const dayKey = dateTimeService.getDayKey(date);
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

  // Utility methods

  clear(): void {
    this.availableSlots.clear();
    this.occupiedSlots.clear();
  }

  getBufferTimeMinutes(): number {
    return this.bufferTimeMinutes;
  }

}
