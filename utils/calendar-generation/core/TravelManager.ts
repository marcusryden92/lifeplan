/**
 * TravelManager
 *
 * Manages travel time calculations and travel slot reservations.
 * Handles normal travel, insufficient travel, and location transitions.
 */

import { SimpleEvent } from "@/types/prisma";
import { AvailableSlot, OccupiedSlot, TravelSlot } from "../models/TimeSlot";
import { TimeSlotManager } from "./TimeSlotManager";
import { TravelTimeEntry } from "../models/SchedulingModels";
import {
  setTravelTimeMatrix,
  getTravelTime,
  canPlaceStandaloneTravelBefore,
  reserveStandaloneTravelBefore,
  reserveStandaloneTravelAfter,
  reserveInsufficientTravelBefore,
  reserveInsufficientTravelAfter,
  findAdjacentTravelTo,
  findAdjacentTravelFrom,
  findPrecedingGapTravel,
  getAllTravelSlots,
  generateTravelEvents,
} from "../helpers/TravelManager";

export class TravelManager {
  private travelTimeMatrix: Map<string, TravelTimeEntry> | null = null;

  constructor(
    private slotManager: TimeSlotManager,
    private bufferTimeMinutes: number,
    travelTimeMatrix?: Map<string, TravelTimeEntry>,
  ) {
    this.travelTimeMatrix = travelTimeMatrix ?? null;
  }

  private get availableSlots(): AvailableSlot[] { return this.slotManager.availableSlots; }
  private get occupiedSlots(): (OccupiedSlot | TravelSlot)[] { return this.slotManager.occupiedSlots; }

  /**
   * Set the travel time matrix for location-aware scheduling
   */
  setTravelTimeMatrix(matrix: Map<string, TravelTimeEntry> | null): void {
    this.travelTimeMatrix = setTravelTimeMatrix(this.travelTimeMatrix, matrix);
  }

  /**
   * Get travel time between two locations based on time of day
   * Returns 0 if either location is null (meaning "Anywhere") or if no travel entry exists
   */
  getTravelTime(
    fromLocationId: string | null,
    toLocationId: string | null,
    timeOfDay: Date,
  ): number {
    return getTravelTime(this.travelTimeMatrix, fromLocationId, toLocationId, timeOfDay);
  }

  /**
   * Check if we can place a standalone travel-before that ends at a given time.
   * Non-mutating: scans available slots to see if [travelStart, travelEnd] fits.
   */
  canPlaceStandaloneTravelBefore(
    travelEnd: Date,
    travelMinutes: number,
  ): boolean {
    return canPlaceStandaloneTravelBefore(
      this.availableSlots,
      this.bufferTimeMinutes,
      travelEnd,
      travelMinutes,
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
    force: boolean = false,
  ): { success: boolean } {
    return reserveStandaloneTravelBefore(
      this.availableSlots,
      this.occupiedSlots,
      this.bufferTimeMinutes,
      travelEnd,
      travelMinutes,
      fromLocationId,
      toLocationId,
      force,
    );
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
    force: boolean = false,
  ): { success: boolean } {
    return reserveStandaloneTravelAfter(
      this.availableSlots,
      this.occupiedSlots,
      this.bufferTimeMinutes,
      travelStart,
      travelMinutes,
      fromLocationId,
      toLocationId,
      force,
    );
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
  ): { success: boolean } {
    return reserveInsufficientTravelBefore(
      this.availableSlots,
      this.occupiedSlots,
      this.bufferTimeMinutes,
      travelEnd,
      requiredTravelMinutes,
      fromLocationId,
      toLocationId,
    );
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
  ): { success: boolean } {
    return reserveInsufficientTravelAfter(
      this.availableSlots,
      this.occupiedSlots,
      this.bufferTimeMinutes,
      travelStart,
      requiredTravelMinutes,
      fromLocationId,
      toLocationId,
    );
  }

  /**
   * Find an existing travel slot going to a destination near a given time.
   * Used to determine if travel-after can be reused instead of reserving new space.
   */
  findAdjacentTravelTo(nearTime: Date, toLocationId: string): Date | null {
    return findAdjacentTravelTo(this.occupiedSlots, this.bufferTimeMinutes, nearTime, toLocationId);
  }

  /**
   * Find a gap-travel slot that ends just before a given slot start.
   * Used to detect when a pre-carved return trip precedes a free slot.
   */
  findPrecedingGapTravel(slotStart: Date): TravelSlot | null {
    return findPrecedingGapTravel(this.occupiedSlots, this.bufferTimeMinutes, slotStart);
  }

  /**
   * Find an existing travel slot originating FROM a given location near a given time.
   * Used to detect when a previous task already created a travel-after that can be absorbed.
   */
  findAdjacentTravelFrom(nearTime: Date, fromLocationId: string): TravelSlot | null {
    return findAdjacentTravelFrom(this.occupiedSlots, this.bufferTimeMinutes, nearTime, fromLocationId);
  }

  getAllTravelSlots(): TravelSlot[] {
    return getAllTravelSlots(this.occupiedSlots);
  }

  generateTravelEvents(userId: string): SimpleEvent[] {
    return generateTravelEvents(this.occupiedSlots, userId);
  }
}
