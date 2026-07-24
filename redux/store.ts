import { configureStore } from "@reduxjs/toolkit";
import calendarSourceSlice from "./slices/calendarSourceSlice";
import engineOutputSlice from "./slices/engineOutputSlice";
import userSlice from "./slices/userSlice";
import schedulingSettingsSlice from "./slices/schedulingSettingsSlice";
import externalCalendarSlice from "./slices/externalCalendarSlice";

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

const store = configureStore({
  reducer: {
    user: userSlice,
    calendarSource: calendarSourceSlice.reducer,
    engineOutput: engineOutputSlice.reducer,
    schedulingSettings: schedulingSettingsSlice.reducer,
    externalCalendar: externalCalendarSlice.reducer,
  },
});

export default store;
