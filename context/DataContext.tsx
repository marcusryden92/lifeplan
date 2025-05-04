"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { Planner } from "@/lib/plannerClass";
import { SimpleEvent, WeekDayIntegers } from "@/types/calendarTypes";
import { EventTemplate } from "@/utils/templateBuilderUtils";
/* import {
  templateSeed,
  mainPlannerSeed,
  previousCalendarSeed,
} from "@/data/seedData"; */
import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import { taskIsCompleted } from "@/utils/taskHelpers";
import { floorMinutes } from "@/utils/calendarUtils";
import { handleServerTransaction } from "@/utils/server-handlers/compareCalendarData";
import { useSession } from "next-auth/react";
import { useFetchCalendarData } from "@/hooks/useFetchCalendarData";

interface DataContextType {
  mainPlanner: Planner[];
  mainPlannerDispatch: React.Dispatch<React.SetStateAction<Planner[]>>;
  setMainPlanner: (
    updatedPlanner?: Planner[] | ((prev: Planner[]) => Planner[]),
    updatedCalendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    updatedTemplate?:
      | EventTemplate[]
      | ((prev: EventTemplate[]) => EventTemplate[])
  ) => void;
  currentTemplate: EventTemplate[];
  setCurrentTemplate: React.Dispatch<React.SetStateAction<EventTemplate[]>>;
  weekStartDay: WeekDayIntegers;
  setWeekDayIntegers: React.Dispatch<React.SetStateAction<WeekDayIntegers>>;
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
  currentCalendar: SimpleEvent[] | undefined;
  setCurrentCalendar: React.Dispatch<React.SetStateAction<SimpleEvent[]>>;

  manuallyUpdateCalendar: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
  // User settings with default values
  const userSettings: { weekStartDay: WeekDayIntegers } = {
    weekStartDay: 1,
  };

  const user = useSession().data?.user;
  const userId = user?.id;

  // Flags
  const LOG_MAIN_PLANNER = false;
  const LOG_CALENDAR = false;
  const LOG_TEMPLATE = false;

  // State definitions
  const [focusedTask, setFocusedTask] = useState<string | null>(null);
  const [weekStartDay, setWeekDayIntegers] = useState<WeekDayIntegers>(
    userSettings.weekStartDay
  );

  const [mainPlanner, mainPlannerDispatch] = useState<Planner[]>([]);
  const [currentCalendar, setCurrentCalendar] = useState<SimpleEvent[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<EventTemplate[]>([]);

  const previousPlanner = useRef<Planner[]>([]);
  const previousCalendar = useRef<SimpleEvent[]>([]);
  const previousTemplate = useRef<EventTemplate[]>([]);

  const { data /* loading, error */ } = useFetchCalendarData(userId);

  useEffect(() => {
    if (data) {
      mainPlannerDispatch(data.planner);
      setCurrentCalendar(data.calendar);
      setCurrentTemplate(data.template);

      // Set "previous" refs to initial state
      previousPlanner.current = data.planner;
      previousCalendar.current = data.calendar;
      previousTemplate.current = data.template;
    }
  }, [data]);

  // Function changing the mainPlanner, updating the calendar
  // and template, and pushing the changes to the database
  const setMainPlanner = async (
    updatedPlanner?: Planner[] | ((prev: Planner[]) => Planner[]),
    updatedCalendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    updatedTemplate?:
      | EventTemplate[]
      | ((prev: EventTemplate[]) => EventTemplate[])
  ) => {
    // Helper function that processes optional update parameters:
    // - Returns the current value if update is undefined
    // - Applies the update function if update is a function
    // - Returns the update value directly if it's a new value
    const processInput = <T,>(
      update: T | ((prev: T) => T) | undefined,
      currentValue: T
    ): T => {
      if (update === undefined) return currentValue;
      return typeof update === "function"
        ? (update as (prev: T) => T)(currentValue)
        : update;
    };

    // Apply the pattern to each input
    const newPlanner = processInput(updatedPlanner, mainPlanner);
    const newTemplate = processInput(updatedTemplate, currentTemplate);
    const processedCalendar = processInput(updatedCalendar, currentCalendar);

    const newCalendar = generateCalendar(
      weekStartDay,
      newTemplate,
      newPlanner,
      processedCalendar
    );

    mainPlannerDispatch(newPlanner);
    setCurrentCalendar(newCalendar);
    setCurrentTemplate(newTemplate);

    if (
      userId &&
      newPlanner &&
      previousPlanner &&
      newCalendar &&
      previousCalendar &&
      newTemplate &&
      previousTemplate
    ) {
      const response = await handleServerTransaction(
        userId,
        newPlanner,
        previousPlanner,
        newCalendar,
        previousCalendar,
        newTemplate,
        previousTemplate
      );

      if (response.success) {
        console.log("Server success!");
        previousCalendar.current = newCalendar;
        previousPlanner.current = newPlanner;
        previousTemplate.current = newTemplate;
      } else {
        mainPlannerDispatch(previousPlanner.current);
        setCurrentCalendar(previousCalendar.current);
        setCurrentTemplate(previousTemplate.current);
        console.log("Server failure!");
      }
    }
  };

  // Manually update the calendar, for instance with the
  // 'Refresh Calendar' button
  const manuallyUpdateCalendar = useCallback(() => {
    const now = floorMinutes(new Date());
    if (currentTemplate && mainPlanner && currentCalendar) {
      const overdueIds = new Set(
        mainPlanner.filter((e) => !taskIsCompleted(e)).map((e) => e.id)
      );

      const filteredCalendar =
        currentCalendar?.filter(
          (e) => !overdueIds.has(e.id) && floorMinutes(new Date(e.start)) < now
        ) || [];

      const newCalendar = generateCalendar(
        weekStartDay,
        currentTemplate,
        mainPlanner,
        filteredCalendar
      );

      setMainPlanner((prev) => prev, newCalendar);
    }
  }, [setCurrentCalendar, currentTemplate, mainPlanner, weekStartDay]);

  useEffect(() => {
    if (LOG_MAIN_PLANNER) {
      console.log("mainPlanner:");
      console.log(mainPlanner);
    }
    if (LOG_CALENDAR) {
      console.log("currentCalendar:");
      console.log(currentCalendar);
    }
    if (LOG_TEMPLATE) {
      console.log("currentTemplate:");
      console.log(currentTemplate);
    }
  }, [currentCalendar, mainPlanner, currentTemplate]);

  const value: DataContextType = {
    mainPlanner,
    mainPlannerDispatch,
    setMainPlanner,
    currentTemplate,
    setCurrentTemplate,
    weekStartDay,
    setWeekDayIntegers,
    focusedTask,
    setFocusedTask,
    currentCalendar,
    setCurrentCalendar,
    manuallyUpdateCalendar,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within a DataContextProvider");
  }
  return context;
};
