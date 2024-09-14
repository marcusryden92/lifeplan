"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Planner } from "@/lib/planner-class";

import { EventTemplate } from "@/utils/template-builder-functions";
import { generateCalendar, SimpleEvent } from "@/utils/calendar-generation";
import { templateSeed } from "@/data/template-seed";

interface DataContextType {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  currentTemplate: EventTemplate[] | undefined;
  setCurrentTemplate: React.Dispatch<
    React.SetStateAction<EventTemplate[] | undefined>
  >;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
  const [taskArray, setTaskArray] = useState<Planner[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<
    EventTemplate[] | undefined
  >(templateSeed);

  const value: DataContextType = {
    taskArray,
    setTaskArray,
    currentTemplate,
    setCurrentTemplate,
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
