import { configureStore } from "@reduxjs/toolkit";
import calendarSlice from "./slices/calendarSlice";
import userSlice from "./slices/userSlice";

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

const store = configureStore({
  reducer: {
    user: userSlice,
    calendar: calendarSlice.reducer,
  },
});

export default store;
