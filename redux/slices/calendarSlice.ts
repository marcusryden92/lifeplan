import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Planner, SimpleEvent, EventTemplate } from "@/prisma/generated/client";

type CalendarData = {
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
};

type CalendarPayload = {
  planner: Planner[] | null;
  calendar: SimpleEvent[] | null;
  template: EventTemplate[] | null;
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
    setPlanner(state, action: PayloadAction<Planner[]>) {
      state.planner = action.payload;
    },
    setCalendar(state, action: PayloadAction<SimpleEvent[]>) {
      state.calendar = action.payload;
    },
    setTemplate(state, action: PayloadAction<EventTemplate[]>) {
      state.template = action.payload;
    },
    setAll(state, action: PayloadAction<CalendarPayload>) {
      if (action.payload.planner) state.planner = action.payload.planner;
      if (action.payload.calendar) state.calendar = action.payload.calendar;
      if (action.payload.template) state.template = action.payload.template;
    },
  },
});

export default calendarSlice.reducer;
