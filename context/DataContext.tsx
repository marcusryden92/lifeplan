"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Planner } from "@/lib/planner-class";
import { EventTemplate } from "@/utils/template-builder-utils";
import { templateSeed, taskArraySeed, taskArraySeed2 } from "@/data/seed-data";
import { WeekDayIntegers } from "@/types/calendar-types";

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
}

const DataContext = createContext<DataContextType | null>(null);

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
  // Database substitute:
  const userSettings: { weekStartDay: WeekDayIntegers } = {
    weekStartDay: 1,
  };

  const [focusedTask, setFocusedTask] = useState<string | null>(null);

  // const [taskArray, setTaskArray] = useState<Planner[]>([]);
  const [taskArray, setTaskArray] = useState<Planner[]>(taskArraySeed);
  // const [taskArray, setTaskArray] = useState<Planner[]>(taskArraySeed2);

  const [debugArray, setDebugArray] = useState<Planner[]>([]);

  useEffect(() => {
    console.log("Previous:");
    console.log(debugArray);
    setDebugArray(taskArray);
  }, [taskArray]);

  const [logEvent, setLogEvent] = useState<number>(0);

  useEffect(() => {
    function logTaskArray() {
      /*  console.log("TASKARRAY:");
      console.log("____________________________________________");

      taskArray.forEach((t) => {
        console.log(`Title: ${t.title}`);
        console.log(`DEP: ${t.dependency}`);
        console.log(`ID: ${t.id}`);
        console.log(`%cPARENT: ${t.parentId}`, "color: skyblue");

        console.log("");
      }); */
      console.log("Current:");
      console.log(taskArray);
    }

    if (logEvent > 0) logTaskArray();

    setLogEvent(logEvent + 1);
  }, [taskArray]);

  const [currentTemplate, setCurrentTemplate] = useState<
    EventTemplate[] | undefined
  >(templateSeed);
  const [weekStartDay, setWeekDayIntegers] = useState<WeekDayIntegers>(
    userSettings.weekStartDay
  );

  const value: DataContextType = {
    taskArray,
    setTaskArray,
    currentTemplate,
    setCurrentTemplate,
    weekStartDay,
    setWeekDayIntegers,
    focusedTask,
    setFocusedTask,
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
