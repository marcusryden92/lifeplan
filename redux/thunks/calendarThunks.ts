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

    if (!userId || weekStartDay === undefined) {
      console.warn("Missing userId or weekStartDay in state, aborting update");
      return;
    }

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

    const result = await runEngineCalculation({
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
    });

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
