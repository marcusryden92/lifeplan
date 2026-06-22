import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { TransportMode } from "@/prisma/client";
import type { TravelTimeEntry } from "@/utils/calendar-generation/models/SchedulingModels";
import {
  DEFAULT_STRATEGY_WEIGHTS,
  DEFAULT_LOCATION_GROUPING_SCORES,
  DEFAULT_LOCATION_GROUPING_PENALTIES,
} from "@/utils/calendar-generation/strategies/defaultStrategy";

// Serializable format for Redux storage
export type SerializedTravelTimeEntry = {
  key: string;
  fromLocationId: string;
  toLocationId: string;
  rushHourMinutes: number;
  regularMinutes: number;
  nightMinutes: number;
};

export type SerializedLocation = {
  id: string;
  name: string;
  address: string;
  placeId: string;
};

// Full row shape the Locations UI needs (every mode, with custom overrides).
// Distinct from SerializedTravelTimeEntry, which is the engine-shaped subset
// derived from the user's default mode only.
export type SerializedTravelTime = {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  transportMode: TransportMode;
  googleRushHourMinutes: number;
  googleRegularMinutes: number;
  googleNightMinutes: number;
  customRushHourMinutes: number | null;
  customRegularMinutes: number | null;
  customNightMinutes: number | null;
};

// Strategy configuration types (mutable versions of the readonly defaults)
export type StrategyWeights = {
  earliestSlot: number;
  locationGrouping: number;
};

export type LocationGroupingScores = {
  bothMatch: number;
  oneMatchOneOpen: number;
  oneMatch: number;
  bothOpen: number;
  oneOpenNoMatch: number;
  neitherMatch: number;
  noLocation: number;
};

export type LocationGroupingPenalties = {
  maxSingleTravelPenalty: number;
  maxDoubleTravelPenalty: number;
  singleTravelPenaltyDivisor: number;
  doubleTravelPenaltyDivisor: number;
};

export type DebugStrategyConfig = {
  weights: StrategyWeights;
  locationGrouping: {
    scores: LocationGroupingScores;
    penalties: LocationGroupingPenalties;
  };
};

export type SchedulingSettings = {
  bufferTimeMinutes: number;
  enableTravelEvents: boolean;
  // Store as array for Redux serialization - convert to Map when needed
  travelTimeMatrix: SerializedTravelTimeEntry[] | null;
  // Full TravelTime rows, every transport mode. The Locations UI reads/writes
  // through this; the engine-shaped travelTimeMatrix above is the derived
  // single-mode subset.
  allTravelTimes: SerializedTravelTime[];
  defaultTransportMode: TransportMode;
  locations: SerializedLocation[];
  isLoaded: boolean;
  // Debug strategy configuration
  debugStrategyConfig: DebugStrategyConfig;
  debugDashboardEnabled: boolean;
};

const initialState: SchedulingSettings = {
  bufferTimeMinutes: 10, // Default value
  enableTravelEvents: false, // Travel events disabled by default
  travelTimeMatrix: null,
  allTravelTimes: [],
  defaultTransportMode: "DRIVING",
  locations: [],
  isLoaded: false,
  // Initialize with defaults from defaultStrategy.ts
  debugStrategyConfig: {
    weights: { ...DEFAULT_STRATEGY_WEIGHTS },
    locationGrouping: {
      scores: { ...DEFAULT_LOCATION_GROUPING_SCORES },
      penalties: { ...DEFAULT_LOCATION_GROUPING_PENALTIES },
    },
  },
  debugDashboardEnabled: false,
};

/**
 * Helper to convert serialized array to Map for use in scheduling
 */
export function travelTimeArrayToMap(
  array: SerializedTravelTimeEntry[] | null
): Map<string, TravelTimeEntry> | null {
  if (!array || array.length === 0) return null;

  const map = new Map<string, TravelTimeEntry>();
  for (const entry of array) {
    map.set(entry.key, {
      fromLocationId: entry.fromLocationId,
      toLocationId: entry.toLocationId,
      rushHourMinutes: entry.rushHourMinutes,
      regularMinutes: entry.regularMinutes,
      nightMinutes: entry.nightMinutes,
    });
  }
  return map;
}

const schedulingSettingsSlice = createSlice({
  name: "schedulingSettings",
  initialState,
  reducers: {
    setSchedulingSettings: (
      state,
      action: PayloadAction<{ bufferTimeMinutes: number; enableTravelEvents?: boolean }>
    ) => {
      state.bufferTimeMinutes = action.payload.bufferTimeMinutes;
      if (action.payload.enableTravelEvents !== undefined) {
        state.enableTravelEvents = action.payload.enableTravelEvents;
      }
      state.isLoaded = true;
    },
    setBufferTimeMinutes: (state, action: PayloadAction<number>) => {
      state.bufferTimeMinutes = action.payload;
    },
    setEnableTravelEvents: (state, action: PayloadAction<boolean>) => {
      state.enableTravelEvents = action.payload;
    },
    setTravelTimeMatrix: (
      state,
      action: PayloadAction<SerializedTravelTimeEntry[] | null>
    ) => {
      state.travelTimeMatrix = action.payload;
    },
    setLocations: (state, action: PayloadAction<SerializedLocation[]>) => {
      state.locations = action.payload;
    },
    upsertLocation: (state, action: PayloadAction<SerializedLocation>) => {
      const idx = state.locations.findIndex((l) => l.id === action.payload.id);
      if (idx === -1) {
        state.locations.push(action.payload);
      } else {
        state.locations[idx] = action.payload;
      }
    },
    removeLocation: (state, action: PayloadAction<string>) => {
      state.locations = state.locations.filter((l) => l.id !== action.payload);
    },
    setAllTravelTimes: (
      state,
      action: PayloadAction<SerializedTravelTime[]>,
    ) => {
      state.allTravelTimes = action.payload;
    },
    upsertTravelTime: (state, action: PayloadAction<SerializedTravelTime>) => {
      const idx = state.allTravelTimes.findIndex(
        (tt) => tt.id === action.payload.id,
      );
      if (idx === -1) state.allTravelTimes.push(action.payload);
      else state.allTravelTimes[idx] = action.payload;
    },
    removeTravelTimesByLocationId: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.allTravelTimes = state.allTravelTimes.filter(
        (tt) =>
          tt.fromLocationId !== action.payload &&
          tt.toLocationId !== action.payload,
      );
    },
    setDefaultTransportMode: (
      state,
      action: PayloadAction<TransportMode>,
    ) => {
      state.defaultTransportMode = action.payload;
    },
    // Debug strategy config reducers
    setDebugDashboardEnabled: (state, action: PayloadAction<boolean>) => {
      state.debugDashboardEnabled = action.payload;
    },
    setStrategyWeights: (state, action: PayloadAction<Partial<StrategyWeights>>) => {
      state.debugStrategyConfig.weights = {
        ...state.debugStrategyConfig.weights,
        ...action.payload,
      };
    },
    setLocationGroupingScores: (state, action: PayloadAction<Partial<LocationGroupingScores>>) => {
      state.debugStrategyConfig.locationGrouping.scores = {
        ...state.debugStrategyConfig.locationGrouping.scores,
        ...action.payload,
      };
    },
    setLocationGroupingPenalties: (state, action: PayloadAction<Partial<LocationGroupingPenalties>>) => {
      state.debugStrategyConfig.locationGrouping.penalties = {
        ...state.debugStrategyConfig.locationGrouping.penalties,
        ...action.payload,
      };
    },
    resetStrategyConfig: (state) => {
      state.debugStrategyConfig = {
        weights: { ...DEFAULT_STRATEGY_WEIGHTS },
        locationGrouping: {
          scores: { ...DEFAULT_LOCATION_GROUPING_SCORES },
          penalties: { ...DEFAULT_LOCATION_GROUPING_PENALTIES },
        },
      };
    },
  },
});

export const {
  setSchedulingSettings,
  setBufferTimeMinutes,
  setEnableTravelEvents,
  setTravelTimeMatrix,
  setLocations,
  upsertLocation,
  removeLocation,
  setAllTravelTimes,
  upsertTravelTime,
  removeTravelTimesByLocationId,
  setDefaultTransportMode,
  setDebugDashboardEnabled,
  setStrategyWeights,
  setLocationGroupingScores,
  setLocationGroupingPenalties,
  resetStrategyConfig,
} = schedulingSettingsSlice.actions;
export default schedulingSettingsSlice;
