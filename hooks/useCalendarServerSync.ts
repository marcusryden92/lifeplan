"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Planner, SimpleEvent, EventTemplate } from "@/prisma/generated/client";
import { handleServerTransaction } from "@/utils/server-handlers/compareCalendarData";

const useCalendarServerSync = (
  userId: string | undefined,
  calendarState: {
    planner: Planner[];
    calendar: SimpleEvent[];
    template: EventTemplate[];
  }
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
      template: EventTemplate[]
    ) => {
      previousPlanner.current = planner;
      previousCalendar.current = calendar;
      previousTemplate.current = template;
      setIsInitialized(true);
    },
    []
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
          previousTemplate
        );

        if (response.success) {
          console.log("Server sync success!");
          // Update the previous refs to the current state
          previousPlanner.current = planner;
          previousCalendar.current = calendar;
          previousTemplate.current = template;
        }
      } catch (error) {
        console.error("Error processing server sync:", error);
      }
    };

    // Skip sync if calendar isn't initialized or if data is identical
    if (
      !isInitialized ||
      (previousPlanner.current === planner &&
        previousCalendar.current === calendar &&
        previousTemplate.current === template)
    )
      return;

    const timeout = setTimeout(processServerSync, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [calendarState]);

  return initializeState;
};

export default useCalendarServerSync;
