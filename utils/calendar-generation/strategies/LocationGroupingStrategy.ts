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
import {
  TravelTimeEntry,
  LocationGroupingScoresConfig,
  LocationGroupingPenaltiesConfig,
} from "../models/SchedulingModels";
import { SchedulingStrategy } from "./SchedulingStrategy";
import { LOCATION_CONFIG } from "../constants";
import {
  DEFAULT_LOCATION_GROUPING_SCORES,
  DEFAULT_LOCATION_GROUPING_PENALTIES,
  type LocationGroupingScores,
  type LocationGroupingPenalties,
} from "./defaultStrategy";

/**
 * Strategy that scores slots based on location sandwich pattern
 */
export class LocationGroupingStrategy implements SchedulingStrategy {
  readonly name = "location_grouping";
  private scores: LocationGroupingScores;
  private penalties: LocationGroupingPenalties;

  constructor(
    private travelTimeMatrix: Map<string, TravelTimeEntry>,
    scoresConfig?: LocationGroupingScoresConfig,
    penaltiesConfig?: LocationGroupingPenaltiesConfig
  ) {
    this.scores = { ...DEFAULT_LOCATION_GROUPING_SCORES, ...scoresConfig };
    this.penalties = {
      ...DEFAULT_LOCATION_GROUPING_PENALTIES,
      ...penaltiesConfig,
    };
  }

  score(task: Planner, slot: TimeSlot): number {
    const scores = this.scores;
    const penalties = this.penalties;

    // If task has no location, return neutral score - doesn't affect grouping
    if (!task.locationId) {
      return scores.noLocation;
    }

    const taskLocation = task.locationId;
    const prevLocation = slot.prevLocationId;
    const nextLocation = slot.nextLocationId;

    // Check location matches
    const prevMatches = prevLocation === taskLocation;
    const nextMatches = nextLocation === taskLocation;
    const prevExists = prevLocation !== null && prevLocation !== undefined;
    const nextExists = nextLocation !== null && nextLocation !== undefined;

    // Calculate travel times for penalty calculation (not capacity check)
    // Note: Capacity check is handled by Scheduler which accounts for travel reuse
    const travelToPrev =
      prevExists && !prevMatches && prevLocation
        ? this.getTravelTimeMinutes(prevLocation, taskLocation, slot.start)
        : 0;
    const travelToNext =
      nextExists && !nextMatches && nextLocation
        ? this.getTravelTimeMinutes(taskLocation, nextLocation, slot.end)
        : 0;

    // Total travel time needed (for penalty calculation only)
    const totalTravelTime = travelToPrev + travelToNext;

    // Score based on sandwich pattern
    // HEAVILY FLATTENED SCORING: Minimize the gap between perfect sandwich and other scenarios
    // to avoid over-prioritizing weekends just because both neighbors match.
    // The urgency/earliest-slot strategies should take precedence for filling weekday gaps.
    //
    // The goal: location grouping should be a tie-breaker, not a dominant factor.

    if (prevMatches && nextMatches) {
      // Perfect sandwich - both ends match, no travel needed
      return scores.bothMatch;
    }

    if ((prevMatches && !nextExists) || (nextMatches && !prevExists)) {
      // One end matches, other end is open (start/end of day) - almost as good
      return scores.oneMatchOneOpen;
    }

    if (prevMatches || nextMatches) {
      // One end matches, other doesn't - need travel on one side
      const singleTravelPenalty = Math.min(
        penalties.maxSingleTravelPenalty,
        totalTravelTime / penalties.singleTravelPenaltyDivisor
      );
      return scores.oneMatch - singleTravelPenalty;
    }

    if (!prevExists && !nextExists) {
      // Both ends are open (empty day) - neutral baseline
      return scores.bothOpen;
    }

    if (!prevExists || !nextExists) {
      // One end is open, other doesn't match - travel on one side
      const singleTravelPenalty = Math.min(
        penalties.maxSingleTravelPenalty,
        totalTravelTime / penalties.singleTravelPenaltyDivisor
      );
      return scores.oneOpenNoMatch - singleTravelPenalty;
    }

    // Neither end matches and both exist - travel on both sides
    const doubleTravelPenalty = Math.min(
      penalties.maxDoubleTravelPenalty,
      totalTravelTime / penalties.doubleTravelPenaltyDivisor
    );
    return scores.neitherMatch - doubleTravelPenalty;
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
