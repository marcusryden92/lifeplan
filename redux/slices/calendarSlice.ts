import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Planner, SimpleEvent, EventTemplate } from "@/prisma/generated/client";

type CalendarData = {
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
};

const initialState: CalendarData = {
  planner: [],
  calendar: [],
  template: [],
};

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    updateCalendarArrayData: (
      state,
      action: PayloadAction<{
        planner: Planner[];
        calendar: SimpleEvent[];
        template: EventTemplate[];
      }>
    ) => {
      state.planner = action.payload.planner;
      state.template = action.payload.template;
      state.calendar = action.payload.calendar;
    },
  },
});

export const { updateCalendarArrayData } = calendarSlice.actions;
export default calendarSlice;
