import { useEffect, useState } from "react";
import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "@/utils/eventUtils";
import { EventTemplate } from "@/utils/templateBuilderUtils";
import { transformFetchedData } from "@/utils/server-handlers/fetchAndTransformData";

interface TransformedData {
  planner: Planner[];
  calendar: SimpleEvent[];
  template: EventTemplate[];
}

export function useFetchCalendarData(userId: string | undefined) {
  const [data, setData] = useState<TransformedData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const transformedData = await transformFetchedData(userId);
        setData(transformedData);
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
