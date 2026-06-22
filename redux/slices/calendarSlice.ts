import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Planner,
  SimpleEvent,
  EventTemplate,
  Category,
  CategoryTimeWindow,
} from "@/types/prisma";

type CalendarData = {
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
  categories: Category[];
  // Flipped to true once useFetchCalendarData seeds the slice. Pages gate
  // their empty-state UI on this so a fresh load doesn't briefly read as
  // "no items" / "no categories" before the fetch returns.
  isLoaded: boolean;
};

const initialState: CalendarData = {
  planner: [],
  calendar: [],
  template: [],
  categories: [],
  isLoaded: false,
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
    // Dedicated flag-flip — kept out of updateCalendarArrayData because that
    // reducer also fires from updateAllCalendarStates (which runs from a
    // bufferTimeMinutes useEffect with empty arrays before the initial fetch
    // resolves). Only useFetchCalendarData should call this.
    markCalendarLoaded: (state) => {
      state.isLoaded = true;
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
    upsertTemplate: (state, action: PayloadAction<EventTemplate>) => {
      const idx = state.template.findIndex((t) => t.id === action.payload.id);
      if (idx === -1) state.template.push(action.payload);
      else state.template[idx] = action.payload;
    },
    removeTemplate: (state, action: PayloadAction<string>) => {
      state.template = state.template.filter((t) => t.id !== action.payload);
    },
    // Windows live nested in categories[].timeSlots. The upsert moves a window
    // to its target category if categoryId changes, and refuses unassigned
    // (categoryId === null) payloads — those are UI-only drafts and shouldn't
    // hit Redux until they've been assigned a category.
    upsertTimeWindow: (state, action: PayloadAction<CategoryTimeWindow>) => {
      const window = action.payload;
      if (!window.categoryId) return;
      for (const c of state.categories) {
        if (c.id === window.categoryId) continue;
        c.timeSlots = c.timeSlots.filter((ts) => ts.id !== window.id);
      }
      const target = state.categories.find((c) => c.id === window.categoryId);
      if (!target) return;
      const idx = target.timeSlots.findIndex((ts) => ts.id === window.id);
      if (idx === -1) target.timeSlots.push(window);
      else target.timeSlots[idx] = window;
    },
    removeTimeWindow: (state, action: PayloadAction<string>) => {
      for (const c of state.categories) {
        c.timeSlots = c.timeSlots.filter((ts) => ts.id !== action.payload);
      }
    },
  },
});

export const {
  updateCalendarArrayData,
  markCalendarLoaded,
  setCategories,
  upsertCategory,
  removeCategory,
  upsertTemplate,
  removeTemplate,
  upsertTimeWindow,
  removeTimeWindow,
} = calendarSlice.actions;
export default calendarSlice;
