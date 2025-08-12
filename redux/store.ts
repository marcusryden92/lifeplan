import { configureStore } from "@reduxjs/toolkit";
import calendarSlice from "./slices/calendarSlice";
import userSlice from "./slices/userSlice";

const store = configureStore({
  reducer: {
    user: userSlice,
    calendar: calendarSlice,
  },
});

export default store;
