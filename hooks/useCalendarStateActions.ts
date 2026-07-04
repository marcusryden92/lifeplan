"use client";

import { useCallback } from "react";
import { AppDispatch } from "@/redux/store";

import { Planner, SimpleEvent, EventTemplate, Category } from "@/types/prisma";
import { updateAllCalendarStates } from "@/redux/thunks/calendarThunks";

export type CalendarUpdateOptions = {
  engineMode?: "inline" | "worker";
};

export default function useCalendarStateActions(dispatch: AppDispatch) {
  const updatePlannerArray = useCallback(
    (
      planner: Planner[] | ((prev: Planner[]) => Planner[]),
      options?: CalendarUpdateOptions,
    ) => {
      dispatch(
        updateAllCalendarStates({
          planner,
          engineMode: options?.engineMode,
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
      template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[]),
      categories?: Category[] | ((prev: Category[]) => Category[]),
      options?: CalendarUpdateOptions
    ) => {
      dispatch(
        updateAllCalendarStates({
          planner,
          calendar,
          template,
          categories,
          engineMode: options?.engineMode,
        })
      );
    },
    []
  );

  return {
    updatePlannerArray,
    updateTemplateArray,
    updateAll,
  };
}
