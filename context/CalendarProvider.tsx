"use client";

import React, { createContext, useContext, ReactNode, useMemo } from "react";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { RootState } from "@/redux/store";

import { Planner, SimpleEvent, EventTemplate } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { useFetchCalendarData } from "@/hooks/useFetchCalendarData";
import type { UserSettings } from "@/types/userTypes";

import useCalendarStateActions from "@/hooks/useCalendarStateActions";
import useManuallyRefreshCalendar from "@/hooks/useManuallyRefreshCalendar";
import useCalendarServerSync from "@/hooks/useCalendarServerSync";

type CalendarContextType = {
  userId: string;
  userSettings: UserSettings;
  weekStartDay: WeekDayIntegers;
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
  const user = useSelector((state: RootState) => state.user.user);
  const calendarState = useSelector((state: RootState) => state.calendar);

  const userId = user?.id;
  const userSettings = {
    styles: {
      events: {
        borderRadius: "8px",
        completedColor: "#0ebf7e",
        errorColor: "#ef4444",
      },
      template: { event: { borderLeft: "4px solid black" } },
      calendar: { event: { borderLeft: "4px solid #ADD8E6" } },
    },
  };

  const { planner, calendar, template } = useMemo(
    () => calendarState,
    [calendarState]
  );

  const weekStartDay: WeekDayIntegers = 1;

  const {
    updatePlannerArray,
    updateCalendarArray,
    updateTemplateArray,
    updateAll,
  } = useCalendarStateActions(dispatch);

  const manuallyRefreshCalendar = useManuallyRefreshCalendar(
    userId,
    calendarState,
    weekStartDay,
    updateCalendarArray
  );

  const initializeState = useCalendarServerSync(userId, calendarState);

  useFetchCalendarData(userId, initializeState);

  if (!userId) return null;

  const value = {
    userId,
    userSettings,
    weekStartDay,
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
