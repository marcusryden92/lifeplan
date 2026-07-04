import { Planner, SimpleEvent, EventTemplate, Category } from "@/types/prisma";
import { runEngineCalculation } from "@/utils/calendar-generation/engineWorkerClient";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { AppDispatch } from "../store";
import { RootState } from "../store";
import {
  setCategories,
  setPlannerAndTemplate,
} from "../slices/calendarSourceSlice";
import { applyEngineRun } from "../slices/engineOutputSlice";
import { travelTimeArrayToMap } from "../slices/schedulingSettingsSlice";

type CalendarPayload = {
  planner?: Planner[] | ((prev: Planner[]) => Planner[]);
  calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]);
  template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[]);
  categories?: Category[] | ((prev: Category[]) => Category[]);
  /**
   * "inline" runs the engine synchronously on the main thread so the source
   * update and the engine output commit before the next paint — no
   * intermediate frame. Used by calendar drag/resize, where FullCalendar has
   * already moved the tile internally and an async regen would briefly render
   * it overlapping stale placements. Everything else defaults to the worker.
   */
  engineMode?: "inline" | "worker";
};

// Helper function that processes optional update parameters
const processInput = <T>(
  update: T | ((prev: T) => T) | undefined,
  currentValue: T
): T => {
  if (update === undefined) return currentValue;
  return typeof update === "function"
    ? (update as (prev: T) => T)(currentValue)
    : update;
};

export const updateAllCalendarStates =
  (updates: CalendarPayload) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const userId: string | undefined = state.user?.user?.id;
    const weekStartDay: WeekDayIntegers = 1;

    const currentPlanner: Planner[] = state.calendarSource.planner;
    const calendar: SimpleEvent[] = state.engineOutput.calendar;
    const template: EventTemplate[] = state.calendarSource.template;
    const categories: Category[] = state.calendarSource.categories;
    const previousEngineMessages = state.engineOutput.engineMessages;
    const bufferTimeMinutes: number =
      state.schedulingSettings.bufferTimeMinutes;
    const enableTravelEvents: boolean =
      state.schedulingSettings.enableTravelEvents;
    const travelTimeMatrix = state.schedulingSettings.travelTimeMatrix;

    const newPlanner = updates.planner
      ? processInput(updates.planner, currentPlanner)
      : currentPlanner;
    const newCalendarInput = updates.calendar
      ? processInput(updates.calendar, calendar)
      : calendar;
    const newTemplate = updates.template
      ? processInput(updates.template, template)
      : template;
    const newCategories = updates.categories
      ? processInput(updates.categories, categories)
      : categories;

    // Convert serialized array to Map for calendar generation
    const travelTimeMap = travelTimeArrayToMap(travelTimeMatrix);

    // Source state lands immediately (optimistic UI); engine output follows
    // when the worker replies. These dispatches must stay BEFORE the await so
    // functional updates from rapid consecutive calls chain off fresh state.
    if (updates.categories) {
      dispatch(setCategories(newCategories));
    }
    dispatch(
      setPlannerAndTemplate({ planner: newPlanner, template: newTemplate }),
    );

    // Only the engine run needs userId (it stamps generated events). The
    // source dispatches above must never be gated on it: userId hydrates a
    // beat after page load, and dropping the whole update here silently
    // swallowed edits made in that window — the dragged tile stayed put
    // visually while nothing was saved. The diff sync authenticates
    // server-side via the session, so the planner change still persists;
    // the next regen from any trigger re-derives the calendar.
    if (!userId) {
      console.warn("No userId in state yet; source updated, engine run skipped");
      return;
    }

    const result = await runEngineCalculation(
      {
        userId,
        weekStartDay,
        template: newTemplate,
        planner: newPlanner,
        prevCalendar: newCalendarInput,
        options: {
          bufferTimeMinutes,
          travelTimeMatrix: travelTimeMap ?? undefined,
          injectTravelEvents: enableTravelEvents,
          categories: newCategories,
          previousEngineMessages,
        },
      },
      updates.engineMode ?? "worker",
    );

    // Null means a newer regen superseded this one mid-flight; its result
    // will land instead.
    if (!result) return;

    dispatch(
      applyEngineRun({
        calendar: result.events,
        categoryEvents: result.categoryEvents,
        travelEvents: result.travelEvents,
        engineMessages: result.messages,
        plannerScores: result.plannerScores,
        ranAt: new Date().toISOString(),
      }),
    );
  };
