/**
 * LocationGroupingStrategy
 *
 * Scores time slots based on location "sandwich" pattern to minimize travel time.
 * Uses slot's prevLocationId/nextLocationId for efficient scoring.
 *
 * Scoring priority (highest to lowest):
 * 1. Both ends match task location (sandwich) - no travel needed
 * 2. One end matches task location - travel needed on one side
 * 3. Neither end matches - travel needed on both sides
 *
 * When one or both ends don't match, also checks if slot has enough room
 * for the task PLUS required travel time.
 */

import { Planner } from "@/types/prisma";
import { TimeSlot } from "../models/TimeSlot";
import { SchedulingContext, TravelTimeEntry } from "../models/SchedulingModels";
import { SchedulingStrategy } from "./SchedulingStrategy";
import { LOCATION_CONFIG } from "../constants";

/**
 * Strategy that scores slots based on location sandwich pattern
 */
export class LocationGroupingStrategy implements SchedulingStrategy {
  readonly name = "location_grouping";

  constructor(
    private travelTimeMatrix: Map<string, TravelTimeEntry>
  ) {}

  score(task: Planner, slot: TimeSlot, context: SchedulingContext): number {
    // If task has no location, return neutral score - doesn't affect grouping
    if (!task.locationId) {
      return 0.5;
    }

    const taskLocation = task.locationId;
    const prevLocation = slot.prevLocationId;
    const nextLocation = slot.nextLocationId;

    // Check location matches
    const prevMatches = prevLocation === taskLocation;
    const nextMatches = nextLocation === taskLocation;
    const prevExists = prevLocation !== null && prevLocation !== undefined;
    const nextExists = nextLocation !== null && nextLocation !== undefined;

    // Calculate travel times if needed
    const travelToPrev = prevExists && !prevMatches && prevLocation
      ? this.getTravelTimeMinutes(prevLocation, taskLocation, slot.start)
      : 0;
    const travelToNext = nextExists && !nextMatches && nextLocation
      ? this.getTravelTimeMinutes(taskLocation, nextLocation, slot.end)
      : 0;

    // Total travel time needed
    const totalTravelTime = travelToPrev + travelToNext;

    // Check if slot has enough room for task + travel
    const bufferTime = context.metrics ? 0 : 0; // Buffer handled elsewhere
    const requiredDuration = task.duration + totalTravelTime + bufferTime;

    if (slot.durationMinutes < requiredDuration) {
      // Slot doesn't have room for travel - heavily penalize
      return 0.1;
    }

    // Score based on sandwich pattern
    // HEAVILY FLATTENED SCORING: Minimize the gap between perfect sandwich and other scenarios
    // to avoid over-prioritizing weekends just because both neighbors match.
    // The urgency/earliest-slot strategies should take precedence for filling weekday gaps.
    //
    // The goal: location grouping should be a tie-breaker, not a dominant factor.
    // Max spread: 0.55 to 0.45 = 0.10 range (was 0.75 to 0.40 = 0.35 range)

    if (prevMatches && nextMatches) {
      // Perfect sandwich - both ends match, no travel needed
      // Only a slight bonus over other scenarios
      return 0.55;
    }

    if ((prevMatches && !nextExists) || (nextMatches && !prevExists)) {
      // One end matches, other end is open (start/end of day) - almost as good
      return 0.53;
    }

    if (prevMatches || nextMatches) {
      // One end matches, other doesn't - need travel on one side
      // Tiny penalty based on travel time
      const singleTravelPenalty = Math.min(0.02, totalTravelTime / 600);
      return 0.52 - singleTravelPenalty;
    }

    if (!prevExists && !nextExists) {
      // Both ends are open (empty day) - neutral baseline
      return 0.50;
    }

    if (!prevExists || !nextExists) {
      // One end is open, other doesn't match - travel on one side
      const singleTravelPenalty = Math.min(0.02, totalTravelTime / 600);
      return 0.48 - singleTravelPenalty;
    }

    // Neither end matches and both exist - travel on both sides
    // Small penalty but not severe - still acceptable
    const doubleTravelPenalty = Math.min(0.03, totalTravelTime / 400);
    return 0.45 - doubleTravelPenalty;
  }

  /**
   * Get travel time between two locations based on time of day
   */
  private getTravelTimeMinutes(
    fromLocationId: string,
    toLocationId: string,
    atTime: Date
  ): number {
    const key = `${fromLocationId}->${toLocationId}`;
    const entry = this.travelTimeMatrix.get(key);

    if (!entry) return 0;

    const hour = atTime.getHours();
    const dayOfWeek = atTime.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Determine time period
    const isRushHour =
      !isWeekend &&
      ((hour >= LOCATION_CONFIG.RUSH_HOUR_MORNING_START &&
        hour < LOCATION_CONFIG.RUSH_HOUR_MORNING_END) ||
        (hour >= LOCATION_CONFIG.RUSH_HOUR_EVENING_START &&
          hour < LOCATION_CONFIG.RUSH_HOUR_EVENING_END));

    const isNight =
      hour >= LOCATION_CONFIG.NIGHT_START || hour < LOCATION_CONFIG.NIGHT_END;

    if (isRushHour) {
      return entry.rushHourMinutes;
    } else if (isNight) {
      return entry.nightMinutes;
    } else {
      return entry.regularMinutes;
    }
  }
}

/**
 * Helper to build travel time matrix from database records
 */
export function buildTravelTimeMatrix(
  travelTimes: Array<{
    fromLocationId: string;
    toLocationId: string;
    googleRushHourMinutes: number;
    googleRegularMinutes: number;
    googleNightMinutes: number;
    customRushHourMinutes: number | null;
    customRegularMinutes: number | null;
    customNightMinutes: number | null;
  }>
): Map<string, TravelTimeEntry> {
  const matrix = new Map<string, TravelTimeEntry>();

  for (const tt of travelTimes) {
    const key = `${tt.fromLocationId}->${tt.toLocationId}`;
    matrix.set(key, {
      fromLocationId: tt.fromLocationId,
      toLocationId: tt.toLocationId,
      rushHourMinutes: tt.customRushHourMinutes ?? tt.googleRushHourMinutes,
      regularMinutes: tt.customRegularMinutes ?? tt.googleRegularMinutes,
      nightMinutes: tt.customNightMinutes ?? tt.googleNightMinutes,
    });
  }

  return matrix;
}
