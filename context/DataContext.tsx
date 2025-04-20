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
import { templateSeed, taskArraySeed } from "@/data/seedData";
import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";

interface DataContextType {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  currentTemplate: EventTemplate[] | undefined;
  setCurrentTemplate: React.Dispatch<
    React.SetStateAction<EventTemplate[] | undefined>
  >;
  weekStartDay: WeekDayIntegers;
  setWeekDayIntegers: React.Dispatch<React.SetStateAction<WeekDayIntegers>>;
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
  currentCalendar: SimpleEvent[] | undefined;
  updateCalendar: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
  // User settings with default values
  const userSettings: { weekStartDay: WeekDayIntegers } = {
    weekStartDay: 1,
  };

  // State definitions
  const [focusedTask, setFocusedTask] = useState<string | null>(null);
  const [taskArray, setTaskArray] = useState<Planner[]>(taskArraySeed);
  const [currentTemplate, setCurrentTemplate] = useState<
    EventTemplate[] | undefined
  >([]);
  const [weekStartDay, setWeekDayIntegers] = useState<WeekDayIntegers>(
    userSettings.weekStartDay
  );
  const [currentCalendar, setCurrentCalendar] = useState<
    SimpleEvent[] | undefined
  >([]);

  // Calendar generation function
  const updateCalendar = useCallback(() => {
    if (currentTemplate && taskArray) {
      const newCalendar = generateCalendar(
        weekStartDay,
        currentTemplate,
        taskArray
      );
      setCurrentCalendar(newCalendar);
    }
  }, [currentTemplate, weekStartDay, taskArray]);

  // Initialize calendar on first render if we have the necessary data
  /*  useEffect(() => {
    if (
      currentTemplate &&
      taskArray &&
      (!currentCalendar || currentCalendar.length === 0)
    ) {
      updateCalendar();
    }
  }, [currentTemplate, taskArray, currentCalendar, updateCalendar]); */

  const value: DataContextType = {
    taskArray,
    setTaskArray,
    currentTemplate,
    setCurrentTemplate,
    weekStartDay,
    setWeekDayIntegers,
    focusedTask,
    setFocusedTask,
    currentCalendar,
    updateCalendar,
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
