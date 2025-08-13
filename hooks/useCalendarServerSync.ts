import { useRef, useEffect, useCallback, useState } from "react";
import { RootState } from "@/redux/store";
import { Planner, SimpleEvent, EventTemplate } from "@/prisma/generated/client";
import { handleServerTransaction } from "@/utils/server-handlers/compareCalendarData";

const useCalendarServerSync = (state: RootState) => {
  // Previous state refs to track what the server has
  const previousPlanner = useRef<Planner[]>([]);
  const previousCalendar = useRef<SimpleEvent[]>([]);
  const previousTemplate = useRef<EventTemplate[]>([]);

  const [isInitialized, setIsInitialized] = useState(false);

  const { planner, calendar, template } = state.calendar;
  const id = state.user.user?.id;

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
      if (!id) throw new Error("Id missing in processServerSync");

      try {
        const response = await handleServerTransaction(
          id,
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

    if (!isInitialized) return;

    const timeout = setTimeout(processServerSync, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [state.calendar]);

  return initializeState;
};

export default useCalendarServerSync;
