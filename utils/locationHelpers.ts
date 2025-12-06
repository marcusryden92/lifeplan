/**
 * Location utility functions
 * These are client-safe helper functions for working with location/travel time data
 */

import type { TravelTime } from "@/types/prisma";

/**
 * Get effective travel time (custom override or Google value)
 */
export function getEffectiveTravelTime(
  travelTime: TravelTime,
  period: "rush" | "regular" | "night"
): number {
  switch (period) {
    case "rush":
      return (
        travelTime.customRushHourMinutes ?? travelTime.googleRushHourMinutes
      );
    case "regular":
      return travelTime.customRegularMinutes ?? travelTime.googleRegularMinutes;
    case "night":
      return travelTime.customNightMinutes ?? travelTime.googleNightMinutes;
  }
}

/**
 * Check if a travel time has any custom overrides
 */
export function hasCustomOverride(travelTime: TravelTime): boolean {
  return (
    travelTime.customRushHourMinutes !== null ||
    travelTime.customRegularMinutes !== null ||
    travelTime.customNightMinutes !== null
  );
}
