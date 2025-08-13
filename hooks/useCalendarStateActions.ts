import { useCallback } from "react";
import { AppDispatch } from "@/redux/store";

import { Planner, SimpleEvent, EventTemplate } from "@/prisma/generated/client";
import { updateAllCalendarStates } from "@/redux/thunks/calendarThunks";

export default function useCalendarStateActions(dispatch: AppDispatch) {
  const setMainPlanner = useCallback(
    (planner: Planner[] | ((prev: Planner[]) => Planner[])) => {
      dispatch(
        updateAllCalendarStates({
          planner,
        })
      );
    },
    []
  );

  const setCalendar = useCallback(
    (calendar: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[])) => {
      dispatch(
        updateAllCalendarStates({
          calendar,
        })
      );
    },
    []
  );

  const setTemplate = useCallback(
    (
      template: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[])
    ) => {
      dispatch(
        updateAllCalendarStates({
          template,
        })
      );
    },
    []
  );

  return { setMainPlanner, setCalendar, setTemplate };
}
