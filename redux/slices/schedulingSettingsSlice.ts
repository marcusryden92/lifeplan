import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SchedulingSettings = {
  bufferTimeMinutes: number;
  isLoaded: boolean;
};

const initialState: SchedulingSettings = {
  bufferTimeMinutes: 10, // Default value
  isLoaded: false,
};

const schedulingSettingsSlice = createSlice({
  name: "schedulingSettings",
  initialState,
  reducers: {
    setSchedulingSettings: (
      state,
      action: PayloadAction<{ bufferTimeMinutes: number }>
    ) => {
      state.bufferTimeMinutes = action.payload.bufferTimeMinutes;
      state.isLoaded = true;
    },
    setBufferTimeMinutes: (state, action: PayloadAction<number>) => {
      state.bufferTimeMinutes = action.payload;
    },
  },
});

export const { setSchedulingSettings, setBufferTimeMinutes } =
  schedulingSettingsSlice.actions;
export default schedulingSettingsSlice;
