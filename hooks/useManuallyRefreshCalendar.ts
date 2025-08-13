import { useCallback } from "react";
import { floorMinutes } from "@/utils/calendarUtils";

import { RootState } from "@/redux/store";
import { WeekDayIntegers } from "@/types/calendarTypes";

import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import { taskIsCompleted } from "@/utils/taskHelpers";

import { SimpleEvent } from "@/prisma/generated/client";

const useManuallyRefreshCalendar = (
  state: RootState,
  weekStartDay: WeekDayIntegers,
  setCalendar: (calendar: SimpleEvent[]) => void
) => {
  const { planner, calendar, template } = state.calendar;
  const { user } = state.user;

  const manuallyRefreshCalendar = useCallback(() => {
    if (!user?.id || !weekStartDay) return;
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
        user.id,
        weekStartDay,
        template,
        planner,
        filteredCalendar
      );

      setCalendar(newCalendar);
    }
  }, []);

  return manuallyRefreshCalendar;
};

export default useManuallyRefreshCalendar;
