/**
 * LocationGroupingStrategy
 *
 * Scores time slots based on location proximity to minimize travel time.
 * Prefers scheduling tasks at the same location consecutively.
 */

import { Planner } from "@/types/prisma";
import { TimeSlot } from "../models/TimeSlot";
import { SchedulingContext, TravelTimeEntry } from "../models/SchedulingModels";
import { SchedulingStrategy } from "./SchedulingStrategy";
import { LOCATION_CONFIG } from "../constants";

/**
 * Strategy that scores slots higher when tasks with the same location
 * are grouped together, reducing travel time.
 */
export class LocationGroupingStrategy implements SchedulingStrategy {
  readonly name = "location_grouping";

  constructor(
    private travelTimeMatrix: Map<string, TravelTimeEntry>,
    private defaultLocationId?: string // e.g., "home" location for first/last events
  ) {}

  score(task: Planner, slot: TimeSlot, context: SchedulingContext): number {
    // If task has no location, return neutral score - doesn't affect grouping
    if (!task.locationId) {
      return 0.5;
    }

    let score = 0.5; // Neutral base

    // Find the previous scheduled event (ends before this slot starts)
    const prevEvent = this.findPreviousEvent(slot.start, context);

    // Find the next scheduled event (starts after this slot ends)
    const nextEvent = this.findNextEvent(slot.end, context);

    // Bonus for same location as previous event
    if (prevEvent?.locationId) {
      if (prevEvent.locationId === task.locationId) {
        // Same location - big bonus
        score += 0.3;
      } else {
        // Different location - penalty based on travel time
        const travelTime = this.getTravelTimeMinutes(
          prevEvent.locationId,
          task.locationId,
          slot.start
        );
        if (travelTime > 0) {
          // Penalty scales with travel time (max 0.25 penalty for 60+ min travel)
          const penalty = Math.min(0.25, travelTime / 240);
          score -= penalty;
        }
      }
    }

    // Bonus for same location as next event
    if (nextEvent?.locationId) {
      if (nextEvent.locationId === task.locationId) {
        // Same location - bonus
        score += 0.2;
      } else {
        // Different location - smaller penalty (next event is less certain)
        const travelTime = this.getTravelTimeMinutes(
          task.locationId,
          nextEvent.locationId,
          slot.end
        );
        if (travelTime > 0) {
          const penalty = Math.min(0.15, travelTime / 240);
          score -= penalty;
        }
      }
    }

    // Ensure score stays within bounds
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Find the most recent event that ends before the given time
   */
  private findPreviousEvent(
    beforeTime: Date,
    context: SchedulingContext
  ): { locationId: string | null } | null {
    const events = context.scheduledEvents;
    if (!events || events.length === 0) return null;

    // Sort by end time descending and find first that ends before slot start
    const sortedEvents = [...events]
      .filter((e) => new Date(e.end) <= beforeTime)
      .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());

    if (sortedEvents.length === 0) return null;

    const prevEvent = sortedEvents[0];

    // Get location from planner if available
    const planner = context.allPlanners.find((p) => p.id === prevEvent.id);
    return { locationId: planner?.locationId ?? null };
  }

  /**
   * Find the next event that starts after the given time
   */
  private findNextEvent(
    afterTime: Date,
    context: SchedulingContext
  ): { locationId: string | null } | null {
    const events = context.scheduledEvents;
    if (!events || events.length === 0) return null;

    // Sort by start time ascending and find first that starts after slot end
    const sortedEvents = [...events]
      .filter((e) => new Date(e.start) >= afterTime)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    if (sortedEvents.length === 0) return null;

    const nextEvent = sortedEvents[0];

    // Get location from planner if available
    const planner = context.allPlanners.find((p) => p.id === nextEvent.id);
    return { locationId: planner?.locationId ?? null };
  }

  /**
   * Get travel time between two locations based on time of day
   */
  private getTravelTimeMinutes(
    fromLocationId: string,
    toLocationId: string,
    atTime: Date
  ): number {
    const key = `${fromLocationId}-${toLocationId}`;
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
    const key = `${tt.fromLocationId}-${tt.toLocationId}`;
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
