import { useEffect, useState } from "react";
import { Planner } from "@prisma/client";
import { SimpleEvent } from "@prisma/client";
import { EventTemplate } from "@/utils/templateBuilderUtils";
import { fetchCalendarData } from "@/actions/calendar-actions/fetchCalendarData";

interface Data {
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
}

export function useFetchCalendarData(userId: string | undefined) {
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
        setData({ planner, calendar, template });
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  return { data, loading, error };
}
