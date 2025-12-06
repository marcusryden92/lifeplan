import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { TravelTimeEntry } from "@/utils/calendar-generation/models/SchedulingModels";

export type SchedulingSettings = {
  bufferTimeMinutes: number;
  enableTravelEvents: boolean;
  travelTimeMatrix: Map<string, TravelTimeEntry> | null;
  isLoaded: boolean;
};

const initialState: SchedulingSettings = {
  bufferTimeMinutes: 10, // Default value
  enableTravelEvents: false, // Travel events disabled by default
  travelTimeMatrix: null,
  isLoaded: false,
};

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
      action: PayloadAction<Map<string, TravelTimeEntry> | null>
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
