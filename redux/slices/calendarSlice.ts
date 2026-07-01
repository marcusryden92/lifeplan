import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Planner,
  SimpleEvent,
  EventTemplate,
  Category,
  CategoryTimeWindow,
  CategoryEvent,
  TravelEvent,
  EngineMessage,
} from "@/types/prisma";

type CalendarData = {
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
  categories: Category[];
  // Materialized weekly category occurrences with trespass info. Written
  // wholesale by the engine each regen; renderer reads directly. Replaces the
  // per-occurrence wrapper SimpleEvent path that used random UUIDs.
  categoryEvents: CategoryEvent[];
  // Materialized travel events between scheduled items. Written wholesale by
  // the engine each regen; renderer reads directly. Replaces the per-regen
  // travel SimpleEvent path that was stripped from sync.
  travelEvents: TravelEvent[];
  // Engine messages surfaced in the calendar engine console. Written
  // wholesale by the engine each regen; the engine consults this slice's
  // prior contents at emit time to carry forward the user-owned `dismissed`
  // flag by id, so a dismissed row stays dismissed across regens as long as
  // the deterministic id keeps matching. Dismissal is a plain field flip
  // that flows to the DB through the standard diff sync.
  engineMessages: EngineMessage[];
  // Per-planner urgency scores from the engine's last regen. Ephemeral —
  // hydrated only when the engine runs (not from the server fetch), so a
  // cold load before the autoregen fires will see {}. Consumers (e.g. the
  // dashboard's priority-goals ranking) must handle the empty case.
  plannerScores: Record<string, number>;
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
  categoryEvents: [],
  travelEvents: [],
  engineMessages: [],
  plannerScores: {},
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
        categoryEvents?: CategoryEvent[];
        travelEvents?: TravelEvent[];
        engineMessages?: EngineMessage[];
        plannerScores?: Record<string, number>;
      }>
    ) => {
      state.planner = action.payload.planner;
      state.template = action.payload.template;
      state.calendar = action.payload.calendar;
      if (action.payload.categories !== undefined) {
        state.categories = action.payload.categories;
      }
      if (action.payload.categoryEvents !== undefined) {
        state.categoryEvents = action.payload.categoryEvents;
      }
      if (action.payload.travelEvents !== undefined) {
        state.travelEvents = action.payload.travelEvents;
      }
      if (action.payload.engineMessages !== undefined) {
        state.engineMessages = action.payload.engineMessages;
      }
      if (action.payload.plannerScores !== undefined) {
        state.plannerScores = action.payload.plannerScores;
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
    // Dismissal path: flip the row's `dismissed` flag. The row stays in
    // Redux (and eventually the DB via diff sync) so subsequent regens can
    // consult its dismissed state and carry it forward. The next regen's
    // emit sees the flag and keeps the row hidden as long as the
    // deterministic id keeps matching; cycling falls out naturally when the
    // engine stops emitting the row (diff destroys it) and any later
    // re-emit is a fresh, undismissed row.
    dismissEngineMessage: (state, action: PayloadAction<string>) => {
      const target = state.engineMessages.find((m) => m.id === action.payload);
      if (target) target.dismissed = true;
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
  dismissEngineMessage,
} = calendarSlice.actions;
export default calendarSlice;
