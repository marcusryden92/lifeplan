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
import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import { taskIsCompleted } from "@/utils/taskHelpers";
import { floorMinutes } from "@/utils/calendarUtils";
import { useSession } from "next-auth/react";
import { useFetchCalendarData } from "@/hooks/useFetchCalendarData";
import { useServerSyncQueue } from "@/hooks/useServerSyncQueue";

interface DataContextType {
  mainPlanner: Planner[];
  mainPlannerDispatch: React.Dispatch<React.SetStateAction<Planner[]>>;
  setMainPlanner: (
    updatedPlanner?: Planner[] | ((prev: Planner[]) => Planner[]),
    updatedCalendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    updatedTemplate?:
      | EventTemplate[]
      | ((prev: EventTemplate[]) => EventTemplate[])
  ) => Promise<void>; // Changed to return Promise<void>
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

  // Import our server sync queue hook
  const { processInput, queueServerSync, initializeState } =
    useServerSyncQueue(userId);

  const { data /* loading, error */ } = useFetchCalendarData(userId);

  useEffect(() => {
    if (data) {
      mainPlannerDispatch(data.planner);
      setCurrentCalendar(data.calendar);
      setCurrentTemplate(data.template);

      // Initialize the "previous" state in our queue hook
      initializeState(data.planner, data.calendar, data.template);
    }
  }, [data, initializeState]);

  // Updated setMainPlanner function that applies optimistic updates immediately but queues server sync
  const setMainPlanner = useCallback(
    (
      updatedPlanner?: Planner[] | ((prev: Planner[]) => Planner[]),
      updatedCalendar?:
        | SimpleEvent[]
        | ((prev: SimpleEvent[]) => SimpleEvent[]),
      updatedTemplate?:
        | EventTemplate[]
        | ((prev: EventTemplate[]) => EventTemplate[])
    ): Promise<void> => {
      // Immediately apply optimistic updates
      const newPlanner = processInput(updatedPlanner, mainPlanner);
      const newTemplate = processInput(updatedTemplate, currentTemplate);
      const processedCalendar = processInput(updatedCalendar, currentCalendar);

      const newCalendar = generateCalendar(
        weekStartDay,
        newTemplate,
        newPlanner,
        processedCalendar
      );

      // Apply optimistic updates immediately
      mainPlannerDispatch(newPlanner);
      setCurrentCalendar(newCalendar);
      setCurrentTemplate(newTemplate);

      // Queue the server sync operation
      return queueServerSync(
        newPlanner,
        newCalendar,
        newTemplate,
        mainPlannerDispatch,
        setCurrentCalendar,
        setCurrentTemplate
      );
    },
    [
      weekStartDay,
      mainPlanner,
      currentCalendar,
      currentTemplate,
      processInput,
      queueServerSync,
    ]
  );

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

      setMainPlanner(undefined, newCalendar);
    }
  }, [
    setMainPlanner,
    currentTemplate,
    mainPlanner,
    weekStartDay,
    currentCalendar,
  ]);

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
