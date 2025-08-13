import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import calendarSlice from "@/redux/slices/calendarSlice";
import { Planner } from "@/prisma/generated/client";
import { SimpleEvent } from "@/prisma/generated/client";
import { EventTemplate } from "@/prisma/generated/client";
import { fetchCalendarData } from "@/actions/calendar-actions/fetchCalendarData";

interface Data {
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
}

export function useFetchCalendarData(
  userId: string | undefined,
  initializeState: (
    planner: Planner[],
    calendar: SimpleEvent[],
    template: EventTemplate[]
  ) => void
) {
  const dispatch = useDispatch<AppDispatch>();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetchCalendarData(userId);

        if (!response.data) return null;

        const { planner, calendar, template } = response.data;
        const newData = { planner, calendar, template };

        setData(newData);

        const calendarData = {
          planner: newData.planner,
          calendar: newData.calendar,
          template: newData.template,
        };

        dispatch(calendarSlice.actions.updateCalendarArrayData(calendarData));
        initializeState(newData.planner, newData.calendar, newData.template);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, dispatch, initializeState]);

  return { data, loading, error };
}
