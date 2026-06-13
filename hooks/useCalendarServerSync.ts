"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Planner, SimpleEvent, EventTemplate, Category } from "@/types/prisma";
import type { SerializedLocation } from "@/redux/slices/schedulingSettingsSlice";
import { handleServerTransaction } from "@/utils/server-handlers/compareCalendarData";

const useCalendarServerSync = (
  userId: string | undefined,
  calendarState: {
    planner: Planner[];
    calendar: SimpleEvent[];
    template: EventTemplate[];
    categories: Category[];
    locations: SerializedLocation[];
  },
) => {
  // Previous state refs to track what the server has
  const previousPlanner = useRef<Planner[]>([]);
  const previousCalendar = useRef<SimpleEvent[]>([]);
  const previousTemplate = useRef<EventTemplate[]>([]);
  const previousCategories = useRef<Category[]>([]);
  const previousLocations = useRef<SerializedLocation[]>([]);

  const [isInitialized, setIsInitialized] = useState(false);

  const { planner, calendar, template, categories, locations } = calendarState;

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
      setIsInitialized(true);
    },
    [],
  );

  // Mirrors locations into a ref so initializeState can read the latest value
  // at the moment of init without taking it as a parameter (which would
  // re-trigger useFetchCalendarData on every locations change).
  const locationsAtInitRef = useRef<SerializedLocation[]>(locations);
  locationsAtInitRef.current = locations;

  // Direct server actions that bypass the diff (e.g. createLocation, which
  // needs a Google Places lookup) should call this after their dispatch so the
  // next sync pass doesn't re-create the row.
  const markSynced = useCallback(
    (kind: "categories" | "locations", current: Category[] | SerializedLocation[]) => {
      if (kind === "categories") {
        previousCategories.current = current as Category[];
      } else {
        previousLocations.current = current as SerializedLocation[];
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
        );

        if (response.success) {
          previousPlanner.current = planner;
          previousCalendar.current = calendar;
          previousTemplate.current = template;
          previousCategories.current = categories;
          previousLocations.current = locations;
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

    if (
      plannerSame &&
      calendarSame &&
      templateSame &&
      categoriesSame &&
      locationsSame
    ) {
      console.log("⏭ Skipping sync: no changes detected");
      return;
    }

    const timeout = setTimeout(processServerSync, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [planner, calendar, template, categories, locations, isInitialized, userId]);

  return { initializeState, markSynced };
};

export default useCalendarServerSync;
