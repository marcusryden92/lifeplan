import { Location, TravelTime } from "../generated/client";

// Fixed IDs so we can reference them in other seed files
export const LOCATION_IDS = {
  HOME: "seed-location-home",
  WORK: "seed-location-work",
  GYM: "seed-location-gym",
} as const;

/**
 * Generates location data for seeding
 */
export const generateLocations = (userId: string): Omit<Location, "createdAt" | "updatedAt">[] => {
  return [
    {
      id: LOCATION_IDS.HOME,
      userId,
      name: "Home",
      address: "Gillevägen 3, 131 33 Nacka, Sweden",
      placeId: "ChIJPUGkuDx5X0YRwDXn1hCYtSA",
      lat: 59.3107,
      lng: 18.1234,
    },
    {
      id: LOCATION_IDS.WORK,
      userId,
      name: "Work",
      address: "Grafikgatan 26b, 754 54 Uppsala, Sweden",
      placeId: "ChIJqZn5NCvJX0YRX-v5wTFNqDw",
      lat: 59.8586,
      lng: 17.6389,
    },
    {
      id: LOCATION_IDS.GYM,
      userId,
      name: "Gym",
      address: "Smedjegatan 14, 131 54 Nacka, Sweden",
      placeId: "ChIJ4ZnQW214X0YRGZckLga3iIw",
      lat: 59.3067,
      lng: 18.1567,
    },
  ];
};

/**
 * Generates travel time data for seeding
 */
export const generateTravelTimes = (userId: string): Omit<TravelTime, "id" | "createdAt" | "updatedAt">[] => {
  return [
    // Home -> Work
    {
      fromLocationId: LOCATION_IDS.HOME,
      toLocationId: LOCATION_IDS.WORK,
      transportMode: "DRIVING",
      googleRushHourMinutes: 130,
      googleRegularMinutes: 123,
      googleNightMinutes: 159,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Home -> Gym
    {
      fromLocationId: LOCATION_IDS.HOME,
      toLocationId: LOCATION_IDS.GYM,
      transportMode: "DRIVING",
      googleRushHourMinutes: 10,
      googleRegularMinutes: 10,
      googleNightMinutes: 10,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Work -> Home
    {
      fromLocationId: LOCATION_IDS.WORK,
      toLocationId: LOCATION_IDS.HOME,
      transportMode: "DRIVING",
      googleRushHourMinutes: 127,
      googleRegularMinutes: 120,
      googleNightMinutes: 149,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Work -> Gym
    {
      fromLocationId: LOCATION_IDS.WORK,
      toLocationId: LOCATION_IDS.GYM,
      transportMode: "DRIVING",
      googleRushHourMinutes: 122,
      googleRegularMinutes: 123,
      googleNightMinutes: 155,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Gym -> Home
    {
      fromLocationId: LOCATION_IDS.GYM,
      toLocationId: LOCATION_IDS.HOME,
      transportMode: "DRIVING",
      googleRushHourMinutes: 10,
      googleRegularMinutes: 10,
      googleNightMinutes: 10,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Gym -> Work
    {
      fromLocationId: LOCATION_IDS.GYM,
      toLocationId: LOCATION_IDS.WORK,
      transportMode: "DRIVING",
      googleRushHourMinutes: 134,
      googleRegularMinutes: 126,
      googleNightMinutes: 162,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
  ];
};
