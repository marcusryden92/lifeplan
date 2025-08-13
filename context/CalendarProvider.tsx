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
  fullCalendarEvents: EventInput[];
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
  setMainPlanner: (planner: Planner[]) => void;
  setCalendar: (calendar: SimpleEvent[]) => void;
  setTemplate: (template: EventTemplate[]) => void;
  manuallyRefreshCalendar: () => void;
};

const CalendarContext = createContext<CalendarContextType | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((state: RootState) => state);

  const { planner, calendar, template } = useMemo(
    () => state.calendar,
    [state.calendar]
  );
  const id = state.user.user?.id;

  const weekStartDay: WeekDayIntegers = 1;

  const { setMainPlanner, setCalendar, setTemplate } =
    useCalendarStateActions(dispatch);

  const manuallyRefreshCalendar = useManuallyRefreshCalendar(
    state,
    weekStartDay,
    setCalendar
  );

  const initializeState = useCalendarServerSync(state);

  useFetchCalendarData(id, initializeState);

  /* Transform SimpleEvent calendar to EventInput for FullCalendar */
  const fullCalendarEvents: EventInput[] = useMemo(() => {
    const newCal: EventInput[] = calendar
      ? transformEventsForFullCalendar(calendar)
      : [];
    return newCal;
  }, [calendar]);

  const value = {
    fullCalendarEvents,
    planner,
    calendar,
    template,
    setMainPlanner,
    setCalendar,
    setTemplate,
    manuallyRefreshCalendar,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export default function useCalendarProvider() {
  const context = useContext(CalendarContext);
  return context;
}
