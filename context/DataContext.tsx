"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Planner } from "@/lib/planner-class";

import { EventTemplate } from "@/utils/template-builder-functions";
import { SimpleEvent } from "@/utils/calendar-generation";

interface DataContextType {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  currentTemplate: EventTemplate[] | undefined;
  setCurrentTemplate: React.Dispatch<
    React.SetStateAction<EventTemplate[] | undefined>
  >;
  templateEvents: SimpleEvent[] | undefined;
  setTemplateEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
  const [taskArray, setTaskArray] = useState<Planner[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<
    EventTemplate[] | undefined
  >([]);
  const [templateEvents, setTemplateEvents] = useState<SimpleEvent[]>([]); // State to manage events

  const value: DataContextType = {
    taskArray,
    setTaskArray,
    currentTemplate,
    setCurrentTemplate,
    templateEvents,
    setTemplateEvents,
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
