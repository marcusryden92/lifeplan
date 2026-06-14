import { Location, TravelTime } from "../../lib/generated/db-client";

// Fixed IDs so we can reference them in other seed files
export const LOCATION_IDS = {
  HOME: "seed-location-home",
  WORK: "seed-location-work",
  GYM: "seed-location-gym",
  GAMLA_STAN: "seed-location-gamla-stan",
  VARMDO: "seed-location-varmdo",
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
      address: "GillevÃ¤gen 3, 131 33 Nacka, Sweden",
      placeId: "ChIJPUGkuDx5X0YRwDXn1hCYtSA",
      lat: 59.3107,
      lng: 18.1234,
    },
    {
      id: LOCATION_IDS.WORK,
      userId,
      name: "Uppsala",
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
    {
      id: LOCATION_IDS.GAMLA_STAN,
      userId,
      name: "Gamla Stan",
      address: "Munkbrohamnen, 111 28 Stockholm, Sweden",
      placeId: "ChIJqyKCOwB3X0YRXKldXP9fc5w",
      lat: 59.3233,
      lng: 18.0689,
    },
    {
      id: LOCATION_IDS.VARMDO,
      userId,
      name: "VÃ¤rmdÃ¶",
      address: "GustavsbergsvÃ¤gen, 134 39 Gustavsberg, Sweden",
      placeId: "ChIJ1w_BRrWBX0YRF_OeZRu1Gnk",
      lat: 59.3267,
      lng: 18.3950,
    },
  ];
};

/**
 * Generates travel time data for seeding
 */
export const generateTravelTimes = (userId: string): Omit<TravelTime, "id" | "createdAt" | "updatedAt">[] => {
  return [
    // Home -> Uppsala
    {
      fromLocationId: LOCATION_IDS.HOME,
      toLocationId: LOCATION_IDS.WORK,
      transportMode: "DRIVING",
      googleRushHourMinutes: 97,
      googleRegularMinutes: 88,
      googleNightMinutes: 106,
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
      googleRushHourMinutes: 27,
      googleRegularMinutes: 27,
      googleNightMinutes: 26,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Home -> Gamla Stan
    {
      fromLocationId: LOCATION_IDS.HOME,
      toLocationId: LOCATION_IDS.GAMLA_STAN,
      transportMode: "DRIVING",
      googleRushHourMinutes: 29,
      googleRegularMinutes: 27,
      googleNightMinutes: 32,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Home -> VÃ¤rmdÃ¶
    {
      fromLocationId: LOCATION_IDS.HOME,
      toLocationId: LOCATION_IDS.VARMDO,
      transportMode: "DRIVING",
      googleRushHourMinutes: 42,
      googleRegularMinutes: 42,
      googleNightMinutes: 41,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Uppsala -> Home
    {
      fromLocationId: LOCATION_IDS.WORK,
      toLocationId: LOCATION_IDS.HOME,
      transportMode: "DRIVING",
      googleRushHourMinutes: 99,
      googleRegularMinutes: 102,
      googleNightMinutes: 123,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Uppsala -> Gym
    {
      fromLocationId: LOCATION_IDS.WORK,
      toLocationId: LOCATION_IDS.GYM,
      transportMode: "DRIVING",
      googleRushHourMinutes: 97,
      googleRegularMinutes: 98,
      googleNightMinutes: 122,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Uppsala -> Gamla Stan
    {
      fromLocationId: LOCATION_IDS.WORK,
      toLocationId: LOCATION_IDS.GAMLA_STAN,
      transportMode: "DRIVING",
      googleRushHourMinutes: 58,
      googleRegularMinutes: 58,
      googleNightMinutes: 81,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Uppsala -> VÃ¤rmdÃ¶
    {
      fromLocationId: LOCATION_IDS.WORK,
      toLocationId: LOCATION_IDS.VARMDO,
      transportMode: "DRIVING",
      googleRushHourMinutes: 104,
      googleRegularMinutes: 109,
      googleNightMinutes: 132,
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
      googleRushHourMinutes: 24,
      googleRegularMinutes: 24,
      googleNightMinutes: 23,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Gym -> Uppsala
    {
      fromLocationId: LOCATION_IDS.GYM,
      toLocationId: LOCATION_IDS.WORK,
      transportMode: "DRIVING",
      googleRushHourMinutes: 94,
      googleRegularMinutes: 96,
      googleNightMinutes: 96,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Gym -> Gamla Stan
    {
      fromLocationId: LOCATION_IDS.GYM,
      toLocationId: LOCATION_IDS.GAMLA_STAN,
      transportMode: "DRIVING",
      googleRushHourMinutes: 37,
      googleRegularMinutes: 37,
      googleNightMinutes: 30,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Gym -> VÃ¤rmdÃ¶
    {
      fromLocationId: LOCATION_IDS.GYM,
      toLocationId: LOCATION_IDS.VARMDO,
      transportMode: "DRIVING",
      googleRushHourMinutes: 44,
      googleRegularMinutes: 46,
      googleNightMinutes: 44,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Gamla Stan -> Home
    {
      fromLocationId: LOCATION_IDS.GAMLA_STAN,
      toLocationId: LOCATION_IDS.HOME,
      transportMode: "DRIVING",
      googleRushHourMinutes: 32,
      googleRegularMinutes: 33,
      googleNightMinutes: 27,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Gamla Stan -> Uppsala
    {
      fromLocationId: LOCATION_IDS.GAMLA_STAN,
      toLocationId: LOCATION_IDS.WORK,
      transportMode: "DRIVING",
      googleRushHourMinutes: 60,
      googleRegularMinutes: 60,
      googleNightMinutes: 76,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Gamla Stan -> Gym
    {
      fromLocationId: LOCATION_IDS.GAMLA_STAN,
      toLocationId: LOCATION_IDS.GYM,
      transportMode: "DRIVING",
      googleRushHourMinutes: 31,
      googleRegularMinutes: 32,
      googleNightMinutes: 29,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // Gamla Stan -> VÃ¤rmdÃ¶
    {
      fromLocationId: LOCATION_IDS.GAMLA_STAN,
      toLocationId: LOCATION_IDS.VARMDO,
      transportMode: "DRIVING",
      googleRushHourMinutes: 39,
      googleRegularMinutes: 39,
      googleNightMinutes: 37,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // VÃ¤rmdÃ¶ -> Home
    {
      fromLocationId: LOCATION_IDS.VARMDO,
      toLocationId: LOCATION_IDS.HOME,
      transportMode: "DRIVING",
      googleRushHourMinutes: 47,
      googleRegularMinutes: 43,
      googleNightMinutes: 43,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // VÃ¤rmdÃ¶ -> Uppsala
    {
      fromLocationId: LOCATION_IDS.VARMDO,
      toLocationId: LOCATION_IDS.WORK,
      transportMode: "DRIVING",
      googleRushHourMinutes: 100,
      googleRegularMinutes: 95,
      googleNightMinutes: 103,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // VÃ¤rmdÃ¶ -> Gym
    {
      fromLocationId: LOCATION_IDS.VARMDO,
      toLocationId: LOCATION_IDS.GYM,
      transportMode: "DRIVING",
      googleRushHourMinutes: 43,
      googleRegularMinutes: 41,
      googleNightMinutes: 48,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
    // VÃ¤rmdÃ¶ -> Gamla Stan
    {
      fromLocationId: LOCATION_IDS.VARMDO,
      toLocationId: LOCATION_IDS.GAMLA_STAN,
      transportMode: "DRIVING",
      googleRushHourMinutes: 43,
      googleRegularMinutes: 39,
      googleNightMinutes: 37,
      customRushHourMinutes: null,
      customRegularMinutes: null,
      customNightMinutes: null,
      userId,
    },
  ];
};
