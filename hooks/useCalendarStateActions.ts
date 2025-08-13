import { useCallback } from "react";
import { AppDispatch } from "@/redux/store";

import { Planner, SimpleEvent, EventTemplate } from "@/prisma/generated/client";
import { updateAllCalendarStates } from "@/redux/thunks/calendarThunks";

export default function useCalendarStateActions(dispatch: AppDispatch) {
  const updatePlannerArray = useCallback(
    (planner: Planner[] | ((prev: Planner[]) => Planner[])) => {
      dispatch(
        updateAllCalendarStates({
          planner,
        })
      );
    },
    []
  );

  const updateCalendarArray = useCallback(
    (calendar: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[])) => {
      dispatch(
        updateAllCalendarStates({
          calendar,
        })
      );
    },
    []
  );

  const updateTemplateArray = useCallback(
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

  const updateAll = useCallback(
    (
      planner?: Planner[] | ((prev: Planner[]) => Planner[]),
      calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
      template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[])
    ) => {
      dispatch(
        updateAllCalendarStates({
          planner,
          calendar,
          template,
        })
      );
    },
    []
  );

  return {
    updatePlannerArray,
    updateCalendarArray,
    updateTemplateArray,
    updateAll,
  };
}
