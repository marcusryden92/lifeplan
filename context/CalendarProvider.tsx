import React, { createContext, useContext, ReactNode, useMemo } from "react";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { RootState } from "@/redux/store";

import { Planner, SimpleEvent, EventTemplate } from "@/prisma/generated/client";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { transformEventsForFullCalendar } from "@/utils/calendarUtils";
import { useFetchCalendarData } from "@/hooks/useFetchCalendarData";

import { EventInput } from "@fullcalendar/core/index.js";
import useCalendarStateActions from "@/hooks/useCalendarStateActions";
import useManuallyRefreshCalendar from "@/hooks/useManuallyRefreshCalendar";
import useCalendarServerSync from "@/hooks/useCalendarServerSync";

type CalendarContextType = {
  userId: string;
  weekStartDay: WeekDayIntegers;
  fullCalendarEvents: EventInput[];
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  updateCalendarArray: React.Dispatch<React.SetStateAction<SimpleEvent[]>>;
  updateTemplateArray: React.Dispatch<React.SetStateAction<EventTemplate[]>>;
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[])
  ) => void;
  manuallyRefreshCalendar: () => void;
};

const CalendarContext = createContext<CalendarContextType | null>(null);

export default function CalendarProvider({
  children,
}: {
  children: ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((state: RootState) => state);

  const { planner, calendar, template } = useMemo(
    () => state.calendar,
    [state.calendar]
  );

  const userId = state.user.user?.id;
  if (!userId) return;

  const weekStartDay: WeekDayIntegers = 1;

  const {
    updatePlannerArray,
    updateCalendarArray,
    updateTemplateArray,
    updateAll,
  } = useCalendarStateActions(dispatch);

  const manuallyRefreshCalendar = useManuallyRefreshCalendar(
    state,
    weekStartDay,
    updateCalendarArray
  );

  const initializeState = useCalendarServerSync(state);

  useFetchCalendarData(userId, initializeState);

  /* Transform SimpleEvent calendar to EventInput for FullCalendar */
  const fullCalendarEvents: EventInput[] = useMemo(() => {
    const newCal: EventInput[] = calendar
      ? transformEventsForFullCalendar(calendar)
      : [];
    return newCal;
  }, [calendar]);

  const value = {
    userId,
    weekStartDay,
    fullCalendarEvents,
    planner,
    calendar,
    template,
    updatePlannerArray,
    updateCalendarArray,
    updateTemplateArray,
    updateAll,
    manuallyRefreshCalendar,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarProvider() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error(
      "useCalendarProvider must be used within a CalendarProvider"
    );
  }
  return context;
}
