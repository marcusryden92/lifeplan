import { Planner, SimpleEvent, EventTemplate } from "@/types/prisma";
import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { AppDispatch } from "../store";
import { RootState } from "../store";
import calendarSlice from "../slices/calendarSlice";

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

    const newPlanner = updates.planner
      ? processInput(updates.planner, currentPlanner)
      : currentPlanner;
    const newCalendarInput = updates.calendar
      ? processInput(updates.calendar, calendar)
      : calendar;
    const newTemplate = updates.template
      ? processInput(updates.template, template)
      : template;

    const newCalendar = generateCalendar(
      userId,
      weekStartDay,
      newTemplate,
      newPlanner,
      newCalendarInput
    );

    const calendarData = {
      planner: newPlanner,
      calendar: newCalendar,
      template: newTemplate,
    };

    dispatch(calendarSlice.actions.updateCalendarArrayData(calendarData));
  };
