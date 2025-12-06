"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  searchPlaces as googleSearchPlaces,
  getPlaceDetails,
  calculateTravelTimesForNewLocation,
  getTravelTimesAllPeriods,
  generateSessionToken,
} from "@/lib/google-maps-api";
import type { TransportMode } from "@/prisma/generated/client";
import type { Location, TravelTime } from "@/types/prisma";

const MAX_LOCATIONS = 10;

// ============================================================================
// Location CRUD Operations
// ============================================================================

/**
 * Fetch all locations for the current user
 */
export async function fetchLocations(): Promise<Location[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const locations = await db.location.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return locations;
}

/**
 * Search for places using Google Places Autocomplete
 * Returns place predictions for the autocomplete dropdown
 */
export async function searchPlaces(query: string, sessionToken?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return googleSearchPlaces(query, sessionToken);
}

/**
 * Create a new session token for Places API billing optimization
 */
export async function createSessionToken(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return generateSessionToken();
}

/**
 * Create a new location
 * Does NOT automatically fetch travel times - user must click "Fetch Travel Times"
 */
export async function createLocation(data: {
  name: string;
  placeId: string;
  sessionToken?: string;
}): Promise<Location> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Check location limit
  const existingCount = await db.location.count({
    where: { userId: session.user.id },
  });

  if (existingCount >= MAX_LOCATIONS) {
    throw new Error(`Maximum of ${MAX_LOCATIONS} locations allowed`);
  }

  // Check if location already exists for this user
  const existing = await db.location.findUnique({
    where: {
      userId_placeId: {
        userId: session.user.id,
        placeId: data.placeId,
      },
    },
  });

  if (existing) {
    throw new Error("This location has already been added");
  }

  // Get place details from Google
  const placeDetails = await getPlaceDetails(data.placeId, data.sessionToken);

  // Create the location
  const location = await db.location.create({
    data: {
      name: data.name,
      address: placeDetails.formattedAddress,
      placeId: data.placeId,
      lat: placeDetails.lat,
      lng: placeDetails.lng,
      userId: session.user.id,
    },
  });

  return location;
}

/**
 * Update a location's name
 */
export async function updateLocationName(
  locationId: string,
  name: string
): Promise<Location> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const location = await db.location.findFirst({
    where: { id: locationId, userId: session.user.id },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  const updated = await db.location.update({
    where: { id: locationId },
    data: { name },
  });

  return updated;
}

/**
 * Delete a location and all associated travel times
 */
export async function deleteLocation(locationId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const location = await db.location.findFirst({
    where: { id: locationId, userId: session.user.id },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  // Cascade delete will handle travel times due to onDelete: Cascade
  await db.location.delete({
    where: { id: locationId },
  });
}

// ============================================================================
// Travel Time Operations
// ============================================================================

/**
 * Fetch all travel times for the current user
 */
export async function fetchTravelTimes(): Promise<TravelTime[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const travelTimes = await db.travelTime.findMany({
    where: { userId: session.user.id },
    include: {
      fromLocation: true,
      toLocation: true,
    },
  });

  return travelTimes;
}

/**
 * Fetch travel times for a specific transport mode
 */
export async function fetchTravelTimesByMode(
  transportMode: TransportMode
): Promise<TravelTime[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const travelTimes = await db.travelTime.findMany({
    where: {
      userId: session.user.id,
      transportMode,
    },
    include: {
      fromLocation: true,
      toLocation: true,
    },
  });

  return travelTimes;
}

/**
 * Fetch travel times from Google API for all location pairs that don't have times yet
 * Only fetches missing pairs - incremental update
 */
export async function fetchMissingTravelTimes(
  transportMode: TransportMode
): Promise<{ fetched: number; skipped: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const locations = await db.location.findMany({
    where: { userId: session.user.id },
  });

  if (locations.length < 2) {
    return { fetched: 0, skipped: 0 };
  }

  // Get existing travel times for this mode
  const existingTimes = await db.travelTime.findMany({
    where: {
      userId: session.user.id,
      transportMode,
    },
    select: {
      fromLocationId: true,
      toLocationId: true,
    },
  });

  const existingPairs = new Set(
    existingTimes.map((t) => `${t.fromLocationId}-${t.toLocationId}`)
  );

  // Find missing pairs (excluding self-referential)
  const missingPairs: Array<{
    from: (typeof locations)[0];
    to: (typeof locations)[0];
  }> = [];

  for (const from of locations) {
    for (const to of locations) {
      if (from.id === to.id) continue; // Skip self-referential
      const pairKey = `${from.id}-${to.id}`;
      if (!existingPairs.has(pairKey)) {
        missingPairs.push({ from, to });
      }
    }
  }

  if (missingPairs.length === 0) {
    return { fetched: 0, skipped: existingPairs.size };
  }

  // Fetch travel times for missing pairs
  let fetched = 0;
  for (const pair of missingPairs) {
    const times = await getTravelTimesAllPeriods(
      { lat: pair.from.lat, lng: pair.from.lng },
      { lat: pair.to.lat, lng: pair.to.lng },
      transportMode
    );

    await db.travelTime.create({
      data: {
        fromLocationId: pair.from.id,
        toLocationId: pair.to.id,
        transportMode,
        googleRushHourMinutes: times.rushHour.durationMinutes,
        googleRegularMinutes: times.regular.durationMinutes,
        googleNightMinutes: times.night.durationMinutes,
        userId: session.user.id,
      },
    });

    fetched++;
  }

  return { fetched, skipped: existingPairs.size };
}

/**
 * Fetch travel times for a newly added location
 * Only fetches times between the new location and existing locations
 */
export async function fetchTravelTimesForLocation(
  locationId: string,
  transportMode: TransportMode
): Promise<{ fetched: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const newLocation = await db.location.findFirst({
    where: { id: locationId, userId: session.user.id },
  });

  if (!newLocation) {
    throw new Error("Location not found");
  }

  const otherLocations = await db.location.findMany({
    where: {
      userId: session.user.id,
      id: { not: locationId },
    },
  });

  if (otherLocations.length === 0) {
    return { fetched: 0 };
  }

  // Calculate travel times using the Google API
  const results = await calculateTravelTimesForNewLocation(
    { id: newLocation.id, lat: newLocation.lat, lng: newLocation.lng },
    otherLocations.map((loc) => ({ id: loc.id, lat: loc.lat, lng: loc.lng })),
    transportMode
  );

  // Store results in database
  for (const result of results) {
    await db.travelTime.upsert({
      where: {
        fromLocationId_toLocationId_transportMode: {
          fromLocationId: result.fromLocationId,
          toLocationId: result.toLocationId,
          transportMode,
        },
      },
      update: {
        googleRushHourMinutes: result.rushHour.durationMinutes,
        googleRegularMinutes: result.regular.durationMinutes,
        googleNightMinutes: result.night.durationMinutes,
      },
      create: {
        fromLocationId: result.fromLocationId,
        toLocationId: result.toLocationId,
        transportMode,
        googleRushHourMinutes: result.rushHour.durationMinutes,
        googleRegularMinutes: result.regular.durationMinutes,
        googleNightMinutes: result.night.durationMinutes,
        userId: session.user.id,
      },
    });
  }

  return { fetched: results.length };
}

/**
 * Refresh all travel times from Google API
 * Preserves custom overrides - only updates Google values
 */
export async function refreshAllTravelTimes(
  transportMode: TransportMode
): Promise<{ updated: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const locations = await db.location.findMany({
    where: { userId: session.user.id },
  });

  if (locations.length < 2) {
    return { updated: 0 };
  }

  let updated = 0;

  // Fetch fresh times for all pairs
  for (const from of locations) {
    for (const to of locations) {
      if (from.id === to.id) continue;

      const times = await getTravelTimesAllPeriods(
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng },
        transportMode
      );

      await db.travelTime.upsert({
        where: {
          fromLocationId_toLocationId_transportMode: {
            fromLocationId: from.id,
            toLocationId: to.id,
            transportMode,
          },
        },
        update: {
          // Only update Google values, preserve custom overrides
          googleRushHourMinutes: times.rushHour.durationMinutes,
          googleRegularMinutes: times.regular.durationMinutes,
          googleNightMinutes: times.night.durationMinutes,
        },
        create: {
          fromLocationId: from.id,
          toLocationId: to.id,
          transportMode,
          googleRushHourMinutes: times.rushHour.durationMinutes,
          googleRegularMinutes: times.regular.durationMinutes,
          googleNightMinutes: times.night.durationMinutes,
          userId: session.user.id,
        },
      });

      updated++;
    }
  }

  return { updated };
}

/**
 * Update custom travel time override
 * Set to null to revert to Google value
 */
export async function updateTravelTimeOverride(
  travelTimeId: string,
  overrides: {
    customRushHourMinutes?: number | null;
    customRegularMinutes?: number | null;
    customNightMinutes?: number | null;
  }
): Promise<TravelTime> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const travelTime = await db.travelTime.findFirst({
    where: { id: travelTimeId, userId: session.user.id },
  });

  if (!travelTime) {
    throw new Error("Travel time not found");
  }

  const updated = await db.travelTime.update({
    where: { id: travelTimeId },
    data: {
      customRushHourMinutes: overrides.customRushHourMinutes,
      customRegularMinutes: overrides.customRegularMinutes,
      customNightMinutes: overrides.customNightMinutes,
    },
  });

  return updated;
}

/**
 * Clear all custom overrides for a travel time (revert to Google values)
 */
export async function clearTravelTimeOverrides(
  travelTimeId: string
): Promise<TravelTime> {
  return updateTravelTimeOverride(travelTimeId, {
    customRushHourMinutes: null,
    customRegularMinutes: null,
    customNightMinutes: null,
  });
}

// ============================================================================
// Planner Location Assignment
// ============================================================================

/**
 * Assign a location to a planner item
 * Set locationId to null for "Everywhere" (no specific location)
 */
export async function assignLocationToPlanner(
  plannerId: string,
  locationId: string | null
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const planner = await db.planner.findFirst({
    where: { id: plannerId, userId: session.user.id },
  });

  if (!planner) {
    throw new Error("Planner item not found");
  }

  // If locationId is provided, verify it belongs to the user
  if (locationId) {
    const location = await db.location.findFirst({
      where: { id: locationId, userId: session.user.id },
    });

    if (!location) {
      throw new Error("Location not found");
    }
  }

  await db.planner.update({
    where: { id: plannerId },
    data: { locationId },
  });
}

// ============================================================================
// User Preferences
// ============================================================================

/**
 * Get user's default transport mode
 */
export async function getDefaultTransportMode(): Promise<TransportMode> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const prefs = await db.userSchedulingPreferences.findUnique({
    where: { userId: session.user.id },
  });

  return prefs?.defaultTransportMode ?? "DRIVING";
}

/**
 * Update user's default transport mode
 */
export async function updateDefaultTransportMode(
  transportMode: TransportMode
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.userSchedulingPreferences.upsert({
    where: { userId: session.user.id },
    update: { defaultTransportMode: transportMode },
    create: {
      userId: session.user.id,
      defaultTransportMode: transportMode,
    },
  });
}

// NOTE: Utility functions getEffectiveTravelTime and hasCustomOverride
// have been moved to @/utils/locationHelpers.ts
