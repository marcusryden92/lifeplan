import { Planner, SimpleEvent, EventTemplate, Category } from "@/types/prisma";
import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { AppDispatch } from "../store";
import { RootState } from "../store";
import calendarSlice from "../slices/calendarSlice";
import { travelTimeArrayToMap } from "../slices/schedulingSettingsSlice";

type CalendarPayload = {
  planner?: Planner[] | ((prev: Planner[]) => Planner[]);
  calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]);
  template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[]);
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
  (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const userId: string | undefined = state.user?.user?.id;
    const weekStartDay: WeekDayIntegers = 1;

    if (!userId || weekStartDay === undefined) {
      console.warn("Missing userId or weekStartDay in state, aborting update");
      return;
    }

    const currentPlanner: Planner[] = state.calendar.planner;
    const calendar: SimpleEvent[] = state.calendar.calendar;
    const template: EventTemplate[] = state.calendar.template;
    const categories: Category[] = state.calendar.categories;
    const previousEngineMessages = state.calendar.engineMessages;
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

    // Convert serialized array to Map for calendar generation
    const travelTimeMap = travelTimeArrayToMap(travelTimeMatrix);

    const {
      events: newCalendar,
      categoryEvents: newCategoryEvents,
      travelEvents: newTravelEvents,
      plannerScores: newPlannerScores,
      messages: newEngineMessages,
    } = generateCalendar(
      userId,
      weekStartDay,
      newTemplate,
      newPlanner,
      newCalendarInput,
      {
        bufferTimeMinutes,
        travelTimeMatrix: travelTimeMap ?? undefined,
        injectTravelEvents: enableTravelEvents,
        categories,
        previousEngineMessages,
      },
    );

    const calendarData = {
      planner: newPlanner,
      calendar: newCalendar,
      template: newTemplate,
      categories,
      categoryEvents: newCategoryEvents,
      travelEvents: newTravelEvents,
      engineMessages: newEngineMessages,
      plannerScores: newPlannerScores,
    };

    dispatch(calendarSlice.actions.updateCalendarArrayData(calendarData));
    dispatch(calendarSlice.actions.markEngineRun(new Date().toISOString()));
  };
