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
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    // Insert-or-replace by id. Used by optimistic updates so the caller doesn't
    // have to snapshot the whole array and replay it after the server confirms.
    upsertCategory: (state, action: PayloadAction<Category>) => {
      const idx = state.categories.findIndex((c) => c.id === action.payload.id);
      if (idx === -1) state.categories.push(action.payload);
      else state.categories[idx] = action.payload;
    },
    removeCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter((c) => c.id !== action.payload);
    },
  },
});

export const {
  updateCalendarArrayData,
  setCategories,
  upsertCategory,
  removeCategory,
} = calendarSlice.actions;
export default calendarSlice;
