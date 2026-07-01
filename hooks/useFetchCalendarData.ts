"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import calendarSlice from "@/redux/slices/calendarSlice";
import {
  Planner,
  Category,
  CategoryEvent,
  TravelEvent,
  EngineMessage,
} from "@/types/prisma";
import { SimpleEvent } from "@/types/prisma";
import { EventTemplate } from "@/types/prisma";
import { fetchCalendarData } from "@/actions/calendar-actions/fetchCalendarData";

interface Data {
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
  categories: Category[];
  categoryEvents: CategoryEvent[];
  travelEvents: TravelEvent[];
  engineMessages: EngineMessage[];
}

export function useFetchCalendarData(
  userId: string | undefined,
  initializeState: (
    planner: Planner[],
    calendar: SimpleEvent[],
    template: EventTemplate[],
    categories: Category[],
    categoryEvents: CategoryEvent[],
    travelEvents: TravelEvent[],
    engineMessages: EngineMessage[],
    dataVersion: number,
  ) => void,
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

        const {
          planner,
          calendar,
          template,
          categories,
          categoryEvents,
          travelEvents,
          engineMessages,
          dataVersion,
        } = response.data;
        const newData = {
          planner,
          calendar,
          template,
          categories,
          categoryEvents,
          travelEvents,
          engineMessages,
        };

        setData(newData);

        // Dispatch to Redux
        dispatch(calendarSlice.actions.updateCalendarArrayData(newData));
        dispatch(calendarSlice.actions.markCalendarLoaded());
        initializeState(
          newData.planner,
          newData.calendar,
          newData.template,
          newData.categories,
          newData.categoryEvents,
          newData.travelEvents,
          newData.engineMessages,
          dataVersion,
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
