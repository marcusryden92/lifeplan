"use client";

import { useCallback, useRef } from "react";
import { floorMinutes } from "@/utils/calendarUtils";
import { WeekDayIntegers } from "@/types/calendarTypes";

import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import { taskIsCompleted } from "@/utils/taskHelpers";

import { Planner, SimpleEvent, EventTemplate } from "@/types/prisma";
import { AppDispatch, RootState } from "@/redux/store";
import calendarSlice from "@/redux/slices/calendarSlice";
import { useSelector } from "react-redux";

const useManuallyRefreshCalendar = (
  userId: string | undefined,
  calendarState: {
    planner: Planner[];
    calendar: SimpleEvent[];
    template: EventTemplate[];
  },
  weekStartDay: WeekDayIntegers,
  dispatch: AppDispatch
) => {
  const { planner, calendar, template } = calendarState;
  const bufferTimeMinutes = useSelector(
    (state: RootState) => state.schedulingSettings.bufferTimeMinutes
  );

  // Store latest values in refs so callback doesn't need to depend on them
  const stateRef = useRef({ userId, planner, calendar, template, weekStartDay, bufferTimeMinutes, dispatch });
  stateRef.current = { userId, planner, calendar, template, weekStartDay, bufferTimeMinutes, dispatch };

  const manuallyRefreshCalendar = useCallback(() => {
    const { userId, planner, calendar, template, weekStartDay, bufferTimeMinutes, dispatch } = stateRef.current;

    if (!userId) throw new Error("Id missing in manuallyRefreshCalendar");

    const now = floorMinutes(new Date());
    if (template && planner && calendar) {
      const overdueIds = new Set<string>(
        planner.filter((e) => !taskIsCompleted(e)).map((e) => e.id)
      );

      const filteredCalendar: SimpleEvent[] =
        calendar?.filter(
          (e: SimpleEvent) =>
            !overdueIds.has(e.id) && floorMinutes(new Date(e.start)) < now
        ) || [];

      const newCalendar = generateCalendar(
        userId,
        weekStartDay,
        template,
        planner,
        filteredCalendar,
        bufferTimeMinutes
      );

      // Use updateAll to bypass the thunk's regeneration
      // Pass the generated calendar directly without triggering another generation
      dispatch(
        calendarSlice.actions.updateCalendarArrayData({
          planner,
          calendar: newCalendar,
          template,
        })
      );
    }
  }, []);

  return manuallyRefreshCalendar;
};

export default useManuallyRefreshCalendar;
