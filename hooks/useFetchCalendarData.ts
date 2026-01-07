"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import calendarSlice from "@/redux/slices/calendarSlice";
import { Planner, Category } from "@/types/prisma";
import { SimpleEvent } from "@/types/prisma";
import { EventTemplate } from "@/types/prisma";
import { fetchCalendarData } from "@/actions/calendar-actions/fetchCalendarData";

interface Data {
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
  categories: Category[];
}

export function useFetchCalendarData(
  userId: string | undefined,
  initializeState: (
    planner: Planner[],
    calendar: SimpleEvent[],
    template: EventTemplate[],
    categories: Category[]
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

        const { planner, calendar, template, categories } = response.data;
        const newData = { planner, calendar, template, categories };

        setData(newData);

        // Serialize categories to avoid non-serializable Date objects in Redux
        const serializedCategories = categories.map((cat) => ({
          ...cat,
          createdAt:
            cat.createdAt instanceof Date
              ? cat.createdAt.toISOString()
              : cat.createdAt,
          updatedAt:
            cat.updatedAt instanceof Date
              ? cat.updatedAt.toISOString()
              : cat.updatedAt,
          // Also serialize location dates if present
          location: cat.location
            ? {
                ...cat.location,
                createdAt:
                  cat.location.createdAt instanceof Date
                    ? cat.location.createdAt.toISOString()
                    : cat.location.createdAt,
                updatedAt:
                  cat.location.updatedAt instanceof Date
                    ? cat.location.updatedAt.toISOString()
                    : cat.location.updatedAt,
              }
            : null,
        }));

        const calendarData = {
          planner: newData.planner,
          calendar: newData.calendar,
          template: newData.template,
          categories: serializedCategories,
        };

        dispatch(calendarSlice.actions.updateCalendarArrayData(calendarData));
        initializeState(
          newData.planner,
          newData.calendar,
          newData.template,
          newData.categories
        );
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
