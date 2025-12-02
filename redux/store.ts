import { configureStore } from "@reduxjs/toolkit";
import calendarSlice from "./slices/calendarSlice";
import userSlice from "./slices/userSlice";
import schedulingSettingsSlice from "./slices/schedulingSettingsSlice";

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

const store = configureStore({
  reducer: {
    user: userSlice,
    calendar: calendarSlice.reducer,
    schedulingSettings: schedulingSettingsSlice.reducer,
  },
});

export default store;
