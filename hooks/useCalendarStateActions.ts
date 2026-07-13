"use client";

import { useCallback } from "react";
import { AppDispatch } from "@/redux/store";

import {
  Planner,
  SimpleEvent,
  EventTemplate,
  Category,
  Queue,
  PlannerDependency,
} from "@/types/prisma";
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
      template: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[]),
      options?: CalendarUpdateOptions,
    ) => {
      dispatch(
        updateAllCalendarStates({
          template,
          engineMode: options?.engineMode,
        })
      );
    },
    []
  );

  const updateQueueArray = useCallback(
    (
      queues: Queue[] | ((prev: Queue[]) => Queue[]),
      options?: CalendarUpdateOptions,
    ) => {
      dispatch(
        updateAllCalendarStates({
          queues,
          engineMode: options?.engineMode,
        })
      );
    },
    []
  );

  const updateDependencyArray = useCallback(
    (
      dependencies:
        | PlannerDependency[]
        | ((prev: PlannerDependency[]) => PlannerDependency[]),
      options?: CalendarUpdateOptions,
    ) => {
      dispatch(
        updateAllCalendarStates({
          dependencies,
          engineMode: options?.engineMode,
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
      queues?: Queue[] | ((prev: Queue[]) => Queue[]),
      dependencies?:
        | PlannerDependency[]
        | ((prev: PlannerDependency[]) => PlannerDependency[]),
      options?: CalendarUpdateOptions
    ) => {
      dispatch(
        updateAllCalendarStates({
          planner,
          calendar,
          template,
          categories,
          queues,
          dependencies,
          engineMode: options?.engineMode,
        })
      );
    },
    []
  );

  return {
    updatePlannerArray,
    updateTemplateArray,
    updateQueueArray,
    updateDependencyArray,
    updateAll,
  };
}
