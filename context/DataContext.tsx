"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { Planner } from "@/lib/plannerClass";
import { SimpleEvent, WeekDayIntegers } from "@/types/calendarTypes";
import { EventTemplate } from "@/utils/templateBuilderUtils";
import {
  templateSeed,
  mainPlannerSeed,
  previousCalendarSeed,
} from "@/data/seedData";
import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import { taskIsCompleted } from "@/utils/taskHelpers";
import { floorMinutes } from "@/utils/calendarUtils";

interface DataContextType {
  mainPlanner: Planner[];
  mainPlannerDispatch: React.Dispatch<React.SetStateAction<Planner[]>>;
  setMainPlanner: (arg: any, manuallyUpdatedCalendar?: SimpleEvent[]) => void;
  currentTemplate: EventTemplate[] | undefined;
  setCurrentTemplate: React.Dispatch<
    React.SetStateAction<EventTemplate[] | undefined>
  >;
  weekStartDay: WeekDayIntegers;
  setWeekDayIntegers: React.Dispatch<React.SetStateAction<WeekDayIntegers>>;
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
  currentCalendar: SimpleEvent[] | undefined;
  setCurrentCalendar: React.Dispatch<
    React.SetStateAction<SimpleEvent[] | undefined>
  >;
  updateCalendar: (
    manuallyUpdatedTaskArray?: Planner[],
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => Planner[] | undefined;
  manuallyUpdateCalendar: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
  // User settings with default values
  const userSettings: { weekStartDay: WeekDayIntegers } = {
    weekStartDay: 1,
  };

  // State definitions
  const [focusedTask, setFocusedTask] = useState<string | null>(null);
  const [mainPlanner, mainPlannerDispatch] =
    useState<Planner[]>(mainPlannerSeed);
  const [currentTemplate, setCurrentTemplate] = useState<
    EventTemplate[] | undefined
  >([]);
  const [weekStartDay, setWeekDayIntegers] = useState<WeekDayIntegers>(
    userSettings.weekStartDay
  );
  const [currentCalendar, setCurrentCalendar] = useState<
    SimpleEvent[] | undefined
  >(previousCalendarSeed);

  // Function for both changing the mainPlanner
  // and updating the calendar at the same time
  const setMainPlanner = (
    mainPlannerArg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => {
    mainPlannerDispatch((prev) => {
      return typeof mainPlannerArg === "function"
        ? updateCalendar(mainPlannerArg(prev), manuallyUpdatedCalendar) || prev
        : updateCalendar(mainPlannerArg, manuallyUpdatedCalendar) || prev;
    });
  };

  // Calendar generation function
  const updateCalendar = useCallback(
    (
      manuallyUpdatedTaskArray?: Planner[],
      manuallyUpdatedCalendar?: SimpleEvent[]
    ) => {
      if (currentTemplate && mainPlanner) {
        setCurrentCalendar((prevCalendar) => {
          return generateCalendar(
            weekStartDay,
            currentTemplate,
            manuallyUpdatedTaskArray || mainPlanner,
            manuallyUpdatedCalendar || prevCalendar || []
          );
        });
      }

      // If we need to update the calendar with a custom mainPlanner
      // and setMainPlanner at the same time (i.e run updateCalendar inside
      // setMainPlanner)
      return manuallyUpdatedTaskArray;
    },
    [currentTemplate, weekStartDay, mainPlanner]
  );

  const manuallyUpdateCalendar = useCallback(() => {
    const now = floorMinutes(new Date());
    if (currentTemplate && mainPlanner) {
      setCurrentCalendar((prevCalendar) => {
        const overdueIds = new Set(
          mainPlanner.filter((e) => !taskIsCompleted(e)).map((e) => e.id)
        );

        const filteredCalendar =
          prevCalendar?.filter(
            (e) =>
              !overdueIds.has(e.id) && floorMinutes(new Date(e.start)) < now
          ) || [];

        return generateCalendar(
          weekStartDay,
          currentTemplate,
          mainPlanner,
          filteredCalendar
        );
      });
    }
  }, [setCurrentCalendar, currentTemplate, mainPlanner, weekStartDay]);

  useEffect(() => {
    console.log(currentCalendar);
  }, [currentCalendar]);

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
    updateCalendar,
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
