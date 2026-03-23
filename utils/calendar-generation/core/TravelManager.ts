/**
 * TravelManager
 *
 * Manages travel time calculations and travel slot reservations.
 * Handles normal travel, insufficient travel, and location transitions.
 */

import { TimeSlot } from "../models/TimeSlot";
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
} from "./TravelManager/index";

export class TravelManager {
  private travelTimeMatrix: Map<string, TravelTimeEntry> | null = null;

  constructor(
    private availableSlots: Map<string, TimeSlot[]>,
    private occupiedSlots: Map<string, TimeSlot[]>,
    private bufferTimeMinutes: number,
    travelTimeMatrix?: Map<string, TravelTimeEntry>,
  ) {
    this.travelTimeMatrix = travelTimeMatrix ?? null;
  }

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
   * Non-mutating: scans available slots on the day to see if [travelStart, travelEnd] fits.
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
   *
   * @param nearTime - The time to search near (typically the end of an available slot)
   * @param toLocationId - The destination location to check for
   * @returns The travel slot's start time if found, null otherwise
   */
  findAdjacentTravelTo(nearTime: Date, toLocationId: string): Date | null {
    return findAdjacentTravelTo(this.occupiedSlots, this.bufferTimeMinutes, nearTime, toLocationId);
  }

  /**
   * Find a gap-travel slot that ends just before a given slot start.
   * Used to detect when a pre-carved return trip (e.g. Gamla Stan → Home) precedes a
   * free slot, so that a task placed in that slot can bypass the intermediate stop and
   * travel direct from the real origin (e.g. Gamla Stan → Gym).
   *
   * @param slotStart - The start of the available slot (gap travel ends at slotStart - buffer)
   * @returns The travel-gap slot if found, null otherwise
   */
  findPrecedingGapTravel(slotStart: Date): TimeSlot | null {
    return findPrecedingGapTravel(this.occupiedSlots, this.bufferTimeMinutes, slotStart);
  }

  /**
   * Find an existing travel slot originating FROM a given location near a given time.
   * Used to detect when a previous task at the same location already created a travel-after
   * that can be absorbed by a new same-location task placed after it.
   *
   * @param nearTime - The time to search near (typically the start of an available slot)
   * @param fromLocationId - The origin location to check for
   * @returns The travel slot if found, null otherwise
   */
  findAdjacentTravelFrom(
    nearTime: Date,
    fromLocationId: string,
  ): TimeSlot | null {
    return findAdjacentTravelFrom(this.occupiedSlots, this.bufferTimeMinutes, nearTime, fromLocationId);
  }
}
