/**
 * Google Maps API Integration
 *
 * Utilities for Places API (autocomplete, place details) and
 * Distance Matrix API (travel time calculations).
 *
 * All functions are server-side only to protect API key.
 */

import { TransportMode } from "@/prisma/generated/client";

// Types for Google API responses
export interface PlacePrediction {
  placeId: string;
  description: string; // Full address description
  mainText: string; // Primary text (e.g., business name or street)
  secondaryText: string; // Secondary text (e.g., city, state)
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  name?: string;
}

export interface TravelTimeResult {
  durationMinutes: number;
  distanceMeters: number;
  status: "OK" | "ZERO_RESULTS" | "NOT_FOUND" | "ERROR";
}

export interface TravelTimeBatchResult {
  fromLocationId: string;
  toLocationId: string;
  rushHour: TravelTimeResult;
  regular: TravelTimeResult;
  night: TravelTimeResult;
}

// Google API response types
interface GoogleAutocompleteResponse {
  status: string;
  error_message?: string;
  predictions: Array<{
    place_id: string;
    description: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }>;
}

interface GooglePlaceDetailsResponse {
  status: string;
  error_message?: string;
  result: {
    place_id: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    name?: string;
  };
}

interface GoogleDistanceMatrixResponse {
  status: string;
  error_message?: string;
  rows: Array<{
    elements: Array<{
      status: string;
      duration?: { value: number };
      duration_in_traffic?: { value: number };
      distance?: { value: number };
    }>;
  }>;
}

// Map our TransportMode enum to Google's travel_mode
const TRANSPORT_MODE_MAP: Record<TransportMode, string> = {
  DRIVING: "driving",
  TRANSIT: "transit",
  BICYCLING: "bicycling",
  WALKING: "walking",
};

/**
 * Get the Google Maps API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Search for places using Google Places Autocomplete API
 *
 * @param query - Search query string
 * @param sessionToken - Optional session token for billing optimization
 * @returns Array of place predictions
 */
export async function searchPlaces(
  query: string,
  sessionToken?: string
): Promise<PlacePrediction[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const apiKey = getApiKey();
  const params = new URLSearchParams({
    input: query,
    key: apiKey,
    types: "address|establishment",
  });

  if (sessionToken) {
    params.append("sessiontoken", sessionToken);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Places API error: ${response.statusText}`);
  }

  const data = (await response.json()) as GoogleAutocompleteResponse;

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places API error: ${data.status} - ${data.error_message ?? "Unknown error"}`);
  }

  return (data.predictions || []).map((prediction) => ({
    placeId: prediction.place_id,
    description: prediction.description,
    mainText: prediction.structured_formatting?.main_text || "",
    secondaryText: prediction.structured_formatting?.secondary_text || "",
  }));
}

/**
 * Get detailed place information including coordinates
 *
 * @param placeId - Google Place ID
 * @param sessionToken - Optional session token (use same as autocomplete for billing)
 * @returns Place details with coordinates
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<PlaceDetails> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    fields: "place_id,formatted_address,geometry,name",
  });

  if (sessionToken) {
    params.append("sessiontoken", sessionToken);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Place Details API error: ${response.statusText}`);
  }

  const data = (await response.json()) as GooglePlaceDetailsResponse;

  if (data.status !== "OK") {
    throw new Error(
      `Place Details API error: ${data.status} - ${data.error_message ?? "Unknown error"}`
    );
  }

  const result = data.result;
  return {
    placeId: result.place_id,
    formattedAddress: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    name: result.name,
  };
}

/**
 * Calculate travel time between two points using Distance Matrix API
 *
 * @param origin - Origin coordinates
 * @param destination - Destination coordinates
 * @param mode - Transport mode
 * @param departureTime - Departure time for traffic estimation
 * @returns Travel time result
 */
export async function getTravelTime(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TransportMode,
  departureTime?: Date
): Promise<TravelTimeResult> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${destination.lat},${destination.lng}`,
    mode: TRANSPORT_MODE_MAP[mode],
    key: apiKey,
  });

  // Add departure time for traffic-based estimates (driving/transit only)
  if (departureTime && (mode === "DRIVING" || mode === "TRANSIT")) {
    params.append("departure_time", Math.floor(departureTime.getTime() / 1000).toString());
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Distance Matrix API error: ${response.statusText}`);
  }

  const data = (await response.json()) as GoogleDistanceMatrixResponse;

  if (data.status !== "OK") {
    throw new Error(
      `Distance Matrix API error: ${data.status} - ${data.error_message ?? "Unknown error"}`
    );
  }

  const element = data.rows[0]?.elements[0];
  if (!element || element.status !== "OK") {
    return {
      durationMinutes: 0,
      distanceMeters: 0,
      status: (element?.status as TravelTimeResult["status"]) || "ERROR",
    };
  }

  // Use duration_in_traffic if available (more accurate for driving)
  const duration = element.duration_in_traffic || element.duration;

  return {
    durationMinutes: Math.ceil((duration?.value ?? 0) / 60),
    distanceMeters: element.distance?.value ?? 0,
    status: "OK",
  };
}

/**
 * Get representative departure times for different time periods
 */
function getDepartureTimes(): {
  rushHour: Date;
  regular: Date;
  night: Date;
} {
  const now = new Date();

  // Find next Monday for consistent results
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));

  // Rush hour: Monday 8:00 AM
  const rushHour = new Date(nextMonday);
  rushHour.setHours(8, 0, 0, 0);

  // Regular: Monday 2:00 PM
  const regular = new Date(nextMonday);
  regular.setHours(14, 0, 0, 0);

  // Night: Monday 11:00 PM
  const night = new Date(nextMonday);
  night.setHours(23, 0, 0, 0);

  return { rushHour, regular, night };
}

/**
 * Calculate travel times for all time periods between two locations
 *
 * @param origin - Origin coordinates
 * @param destination - Destination coordinates
 * @param mode - Transport mode
 * @returns Travel times for rush hour, regular, and night periods
 */
export async function getTravelTimesAllPeriods(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TransportMode
): Promise<{
  rushHour: TravelTimeResult;
  regular: TravelTimeResult;
  night: TravelTimeResult;
}> {
  const departureTimes = getDepartureTimes();

  // Fetch all three periods in parallel
  const [rushHour, regular, night] = await Promise.all([
    getTravelTime(origin, destination, mode, departureTimes.rushHour),
    getTravelTime(origin, destination, mode, departureTimes.regular),
    getTravelTime(origin, destination, mode, departureTimes.night),
  ]);

  return { rushHour, regular, night };
}

/**
 * Calculate travel times between a new location and all existing locations
 * Skips self-referential pairs (A → A)
 *
 * @param newLocation - The newly added location
 * @param existingLocations - Array of existing locations
 * @param mode - Transport mode
 * @returns Array of travel time results for all pairs
 */
export async function calculateTravelTimesForNewLocation(
  newLocation: { id: string; lat: number; lng: number },
  existingLocations: Array<{ id: string; lat: number; lng: number }>,
  mode: TransportMode
): Promise<TravelTimeBatchResult[]> {
  const results: TravelTimeBatchResult[] = [];

  // Calculate travel times between new location and each existing location
  // Need both directions: new → existing AND existing → new
  for (const existing of existingLocations) {
    // Skip if same location (shouldn't happen, but safety check)
    if (existing.id === newLocation.id) continue;

    // New → Existing
    const toExisting = await getTravelTimesAllPeriods(
      { lat: newLocation.lat, lng: newLocation.lng },
      { lat: existing.lat, lng: existing.lng },
      mode
    );

    results.push({
      fromLocationId: newLocation.id,
      toLocationId: existing.id,
      ...toExisting,
    });

    // Existing → New
    const fromExisting = await getTravelTimesAllPeriods(
      { lat: existing.lat, lng: existing.lng },
      { lat: newLocation.lat, lng: newLocation.lng },
      mode
    );

    results.push({
      fromLocationId: existing.id,
      toLocationId: newLocation.id,
      ...fromExisting,
    });
  }

  return results;
}

/**
 * Generate a session token for Places API billing optimization
 * Use the same token for autocomplete and subsequent place details request
 */
export function generateSessionToken(): string {
  return crypto.randomUUID();
}
