"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
  useRef,
} from "react";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { RootState } from "@/redux/store";

import {
  Planner,
  SimpleEvent,
  EventTemplate,
  Category,
  CategoryEvent,
  TravelEvent,
} from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { useFetchCalendarData } from "@/hooks/useFetchCalendarData";
import type { UserSettings } from "@/types/userTypes";

import useCalendarStateActions from "@/hooks/useCalendarStateActions";
import useManuallyRefreshCalendar from "@/hooks/useManuallyRefreshCalendar";
import useCalendarServerSync from "@/hooks/useCalendarServerSync";
import { buildInheritedLocationMap, InheritedLocationInfo } from "@/utils/goalPageHandlers";

type CalendarContextType = {
  userId: string;
  userSettings: UserSettings;
  weekStartDay: WeekDayIntegers;
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
  categories: Category[];
  categoryEvents: CategoryEvent[];
  travelEvents: TravelEvent[];
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  updateCalendarArray: React.Dispatch<React.SetStateAction<SimpleEvent[]>>;
  updateTemplateArray: React.Dispatch<React.SetStateAction<EventTemplate[]>>;
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[])
  ) => void;
  manuallyRefreshCalendar: () => void;
  inheritedLocationMap: Map<string, InheritedLocationInfo>;
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
  const isCalendarLoaded = useSelector(
    (state: RootState) => state.calendar.isLoaded,
  );

  const userId = user?.id;
  const userSettings = {
    styles: {
      events: {
        borderRadius: "0",
        completedColor: "#0ebf7e",
        errorColor: "#ef4444",
      },
      template: { event: { borderLeft: "4px solid black" } },
      calendar: { event: { borderLeft: "4px solid #ADD8E6" } },
      travel: { event: { borderLeft: "5px solid #70757F" } },
    },
  };

  const {
    planner,
    calendar,
    template,
    categories,
    categoryEvents,
    travelEvents,
  } = calendarState;

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
    dispatch
  );

  const bufferTimeMinutes = useSelector(
    (state: RootState) => state.schedulingSettings.bufferTimeMinutes
  );
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations
  );
  const travelTimes = useSelector(
    (state: RootState) => state.schedulingSettings.allTravelTimes,
  );
  const isInitialMount = useRef(true);

  // Regenerate calendar when bufferTimeMinutes changes (preserves current event positions)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!userId) return;
    updateAll();
  }, [bufferTimeMinutes, updateAll, userId]);

  // Empty-state autoregen, fired exactly once per cold load. Snapshots
  // isCalendarLoaded at mount: if redux retained the loaded state from a
  // prior navigation (we're remounting, not cold-loading), this branch is
  // permanently inert — preventing a perpetual re-fire when categories
  // exist but no engine output materializes (e.g. categories with no time
  // windows defined).
  const isInitialColdLoadRef = useRef(!isCalendarLoaded);
  const autoregenFired = useRef(false);
  useEffect(() => {
    if (!isInitialColdLoadRef.current) return;
    if (!isCalendarLoaded || autoregenFired.current || !userId) return;
    const hasNoChrome =
      calendarState.categoryEvents.length === 0 &&
      calendarState.travelEvents.length === 0;
    // Tighter than `categories.length > 0` — a category without time windows
    // produces nothing, so firing autoregen wouldn't change hasNoChrome and
    // the next render would re-evaluate as still-empty.
    const hasSomethingToMaterialize =
      calendarState.categories.some((c) => c.timeSlots.length > 0) ||
      calendarState.planner.some((p) => p.locationId);
    if (hasNoChrome && hasSomethingToMaterialize) {
      autoregenFired.current = true;
      updateAll();
    }
  }, [
    isCalendarLoaded,
    userId,
    updateAll,
    calendarState.categoryEvents.length,
    calendarState.travelEvents.length,
    calendarState.categories,
    calendarState.planner,
  ]);

  const syncState = useMemo(
    () => ({ ...calendarState, locations, travelTimes }),
    [calendarState, locations, travelTimes],
  );
  const { initializeState } = useCalendarServerSync(userId, syncState);

  useFetchCalendarData(userId, initializeState);

  const inheritedLocationMap = useMemo(
    () => buildInheritedLocationMap(planner, categories, locations),
    [planner, categories, locations]
  );

  if (!userId) return null;

  const value = {
    userId,
    userSettings,
    weekStartDay,
    planner,
    calendar,
    template,
    categories,
    categoryEvents,
    travelEvents,
    updatePlannerArray,
    updateCalendarArray,
    updateTemplateArray,
    updateAll,
    manuallyRefreshCalendar,
    inheritedLocationMap,
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
