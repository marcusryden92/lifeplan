"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Planner } from "@/lib/planner-class";
import { EventTemplate } from "@/utils/template-builder-utils";
import { generateCalendar, SimpleEvent } from "@/utils/calendar-generation";
import { templateSeed } from "@/data/template-seed";
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
}

const DataContext = createContext<DataContextType | null>(null);

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
  // Database substitute:
  const userSettings: { weekStartDay: WeekDayIntegers } = {
    weekStartDay: 0,
  };

  const [taskArray, setTaskArray] = useState<Planner[]>([]);
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
