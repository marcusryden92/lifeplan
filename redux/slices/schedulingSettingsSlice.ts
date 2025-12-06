import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { TravelTimeEntry } from "@/utils/calendar-generation/models/SchedulingModels";

// Serializable format for Redux storage
export type SerializedTravelTimeEntry = {
  key: string;
  fromLocationId: string;
  toLocationId: string;
  rushHourMinutes: number;
  regularMinutes: number;
  nightMinutes: number;
};

export type SchedulingSettings = {
  bufferTimeMinutes: number;
  enableTravelEvents: boolean;
  // Store as array for Redux serialization - convert to Map when needed
  travelTimeMatrix: SerializedTravelTimeEntry[] | null;
  isLoaded: boolean;
};

const initialState: SchedulingSettings = {
  bufferTimeMinutes: 10, // Default value
  enableTravelEvents: false, // Travel events disabled by default
  travelTimeMatrix: null,
  isLoaded: false,
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
  },
});

export const {
  setSchedulingSettings,
  setBufferTimeMinutes,
  setEnableTravelEvents,
  setTravelTimeMatrix,
} = schedulingSettingsSlice.actions;
export default schedulingSettingsSlice;
