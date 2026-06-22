"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Planner, SimpleEvent, EventTemplate, Category } from "@/types/prisma";
import type {
  SerializedLocation,
  SerializedTravelTime,
} from "@/redux/slices/schedulingSettingsSlice";
import { handleServerTransaction } from "@/utils/server-handlers/compareCalendarData";

const useCalendarServerSync = (
  userId: string | undefined,
  calendarState: {
    planner: Planner[];
    calendar: SimpleEvent[];
    template: EventTemplate[];
    categories: Category[];
    locations: SerializedLocation[];
    travelTimes: SerializedTravelTime[];
  },
) => {
  // Previous state refs to track what the server has
  const previousPlanner = useRef<Planner[]>([]);
  const previousCalendar = useRef<SimpleEvent[]>([]);
  const previousTemplate = useRef<EventTemplate[]>([]);
  const previousCategories = useRef<Category[]>([]);
  const previousLocations = useRef<SerializedLocation[]>([]);
  const previousTravelTimes = useRef<SerializedTravelTime[]>([]);

  const [isInitialized, setIsInitialized] = useState(false);

  const { planner, calendar, template, categories, locations, travelTimes } =
    calendarState;

  const initializeState = useCallback(
    (
      planner: Planner[],
      calendar: SimpleEvent[],
      template: EventTemplate[],
      categories: Category[],
    ) => {
      previousPlanner.current = planner;
      previousCalendar.current = calendar;
      previousTemplate.current = template;
      previousCategories.current = categories;
      // Locations are loaded asynchronously by UserProvider, which may race
      // with the calendar fetch. We seed previousLocations from the current
      // value; the diff's create-branch is a no-op for locations (Google
      // Places lookup must happen server-side via a direct action), so a
      // late-arriving setLocations(loaded) will be absorbed without sending
      // spurious create operations on the next sync pass.
      previousLocations.current = locationsAtInitRef.current;
      previousTravelTimes.current = travelTimesAtInitRef.current;
      setIsInitialized(true);
    },
    [],
  );

  // Mirrors locations + travel times into refs so initializeState can read the
  // latest values at the moment of init without taking them as parameters
  // (which would re-trigger useFetchCalendarData on every change).
  const locationsAtInitRef = useRef<SerializedLocation[]>(locations);
  locationsAtInitRef.current = locations;
  const travelTimesAtInitRef = useRef<SerializedTravelTime[]>(travelTimes);
  travelTimesAtInitRef.current = travelTimes;

  // Direct server actions that bypass the diff (createLocation needs Google
  // Places; refreshAllTravelTimes / fetchMissingTravelTimes need Google
  // distance) should call this after their dispatch so the next sync pass
  // doesn't see them as missing-on-server.
  const markSynced = useCallback(
    (
      kind: "categories" | "locations" | "travelTimes",
      current: Category[] | SerializedLocation[] | SerializedTravelTime[],
    ) => {
      if (kind === "categories") {
        previousCategories.current = current as Category[];
      } else if (kind === "locations") {
        previousLocations.current = current as SerializedLocation[];
      } else {
        previousTravelTimes.current = current as SerializedTravelTime[];
      }
    },
    [],
  );

  useEffect(() => {
    const processServerSync = async () => {
      if (!userId) throw new Error("Id missing in processServerSync");

      try {
        const response = await handleServerTransaction(
          userId,
          planner,
          previousPlanner,
          calendar,
          previousCalendar,
          template,
          previousTemplate,
          categories,
          previousCategories,
          locations,
          previousLocations,
          travelTimes,
          previousTravelTimes,
        );

        if (response.success) {
          previousPlanner.current = planner;
          previousCalendar.current = calendar;
          previousTemplate.current = template;
          previousCategories.current = categories;
          previousLocations.current = locations;
          previousTravelTimes.current = travelTimes;
        } else {
          console.warn("Server sync response not successful:", response);
        }
      } catch (error) {
        console.error("Error processing server sync:", error);
      }
    };

    if (!isInitialized) {
      console.log("⏭ Skipping sync: not initialized");
      return;
    }

    const plannerSame =
      JSON.stringify(previousPlanner.current) === JSON.stringify(planner);
    const calendarSame =
      JSON.stringify(previousCalendar.current) === JSON.stringify(calendar);
    const templateSame =
      JSON.stringify(previousTemplate.current) === JSON.stringify(template);
    const categoriesSame =
      JSON.stringify(previousCategories.current) === JSON.stringify(categories);
    const locationsSame =
      JSON.stringify(previousLocations.current) === JSON.stringify(locations);
    const travelTimesSame =
      JSON.stringify(previousTravelTimes.current) ===
      JSON.stringify(travelTimes);

    if (
      plannerSame &&
      calendarSame &&
      templateSame &&
      categoriesSame &&
      locationsSame &&
      travelTimesSame
    ) {
      console.log("⏭ Skipping sync: no changes detected");
      return;
    }

    const timeout = setTimeout(processServerSync, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    planner,
    calendar,
    template,
    categories,
    locations,
    travelTimes,
    isInitialized,
    userId,
  ]);

  return { initializeState, markSynced };
};

export default useCalendarServerSync;
