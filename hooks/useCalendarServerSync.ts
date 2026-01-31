"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Planner, SimpleEvent, EventTemplate, Category } from "@/types/prisma";
import { handleServerTransaction } from "@/utils/server-handlers/compareCalendarData";

const useCalendarServerSync = (
  userId: string | undefined,
  calendarState: {
    planner: Planner[];
    calendar: SimpleEvent[];
    template: EventTemplate[];
    categories: Category[];
  },
) => {
  // Previous state refs to track what the server has
  const previousPlanner = useRef<Planner[]>([]);
  const previousCalendar = useRef<SimpleEvent[]>([]);
  const previousTemplate = useRef<EventTemplate[]>([]);

  const [isInitialized, setIsInitialized] = useState(false);

  const { planner, calendar, template } = calendarState;

  const initializeState = useCallback(
    (
      planner: Planner[],
      calendar: SimpleEvent[],
      template: EventTemplate[],
      _categories: Category[],
    ) => {
      previousPlanner.current = planner;
      previousCalendar.current = calendar;
      previousTemplate.current = template;
      setIsInitialized(true);
    },
    [],
  );

  useEffect(() => {
    const processServerSync = async () => {
      if (!userId) throw new Error("Id missing in processServerSync");

      try {
        const response = await handleServerTransaction(
          userId,
          planner,
          previousPlanner,
          calendar,
          previousCalendar,
          template,
          previousTemplate,
        );

        if (response.success) {
          // Update the previous refs to the current state
          previousPlanner.current = planner;
          previousCalendar.current = calendar;
          previousTemplate.current = template;
        } else {
          console.warn("Server sync response not successful:", response);
        }
      } catch (error) {
        console.error("Error processing server sync:", error);
      }
    };

    // Skip sync if calendar isn't initialized or if data is identical
    if (!isInitialized) {
      console.log("⏭ Skipping sync: not initialized");
      return;
    }

    const plannerSame =
      JSON.stringify(previousPlanner.current) === JSON.stringify(planner);
    const calendarSame =
      JSON.stringify(previousCalendar.current) === JSON.stringify(calendar);
    const templateSame =
      JSON.stringify(previousTemplate.current) === JSON.stringify(template);

    if (plannerSame && calendarSame && templateSame) {
      console.log("⏭ Skipping sync: no changes detected");
      return;
    }

    const timeout = setTimeout(processServerSync, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [planner, calendar, template, isInitialized, userId]);

  return initializeState;
};

export default useCalendarServerSync;
