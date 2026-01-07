import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Planner, SimpleEvent, EventTemplate, Category } from "@/types/prisma";

type CalendarData = {
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
  categories: Category[];
};

const initialState: CalendarData = {
  planner: [],
  calendar: [],
  template: [],
  categories: [],
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
        categories?: Category[];
      }>
    ) => {
      state.planner = action.payload.planner;
      state.template = action.payload.template;
      state.calendar = action.payload.calendar;
      if (action.payload.categories !== undefined) {
        state.categories = action.payload.categories;
      }
    },
  },
});

export const { updateCalendarArrayData } = calendarSlice.actions;
export default calendarSlice;
