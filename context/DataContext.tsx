import React, { createContext, useContext, useState, ReactNode } from "react";
import { Planner } from "@/lib/planner-class";
import { EventTemplate } from "@/utils/template-builder-utils";
import { generateCalendar, SimpleEvent } from "@/utils/calendar-generation";
import { templateSeed } from "@/data/template-seed";
import { WeekStartDay } from "@/types/calendar-types";

interface DataContextType {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  currentTemplate: EventTemplate[] | undefined;
  setCurrentTemplate: React.Dispatch<
    React.SetStateAction<EventTemplate[] | undefined>
  >;
  weekStartDay: WeekStartDay;
  setWeekStartDay: React.Dispatch<React.SetStateAction<WeekStartDay>>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
  // Database substitute:
  const userSettings: { weekStartDay: WeekStartDay } = {
    weekStartDay: 0,
  };

  const [taskArray, setTaskArray] = useState<Planner[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<
    EventTemplate[] | undefined
  >(templateSeed);
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(
    userSettings.weekStartDay
  );

  const value: DataContextType = {
    taskArray,
    setTaskArray,
    currentTemplate,
    setCurrentTemplate,
    weekStartDay,
    setWeekStartDay,
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
