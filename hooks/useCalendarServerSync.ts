"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import {
  Planner,
  SimpleEvent,
  EventTemplate,
  Category,
  CategoryEvent,
  TravelEvent,
  EngineMessage,
} from "@/types/prisma";
import type {
  SerializedLocation,
  SerializedTravelTime,
} from "@/redux/slices/schedulingSettingsSlice";
import schedulingSettingsSlice from "@/redux/slices/schedulingSettingsSlice";
import calendarSlice from "@/redux/slices/calendarSlice";
import { handleServerTransaction } from "@/utils/server-handlers/compareCalendarData";
import type { FreshState } from "@/actions/calendar-actions/fetchFreshState";

const useCalendarServerSync = (
  userId: string | undefined,
  calendarState: {
    planner: Planner[];
    calendar: SimpleEvent[];
    template: EventTemplate[];
    categories: Category[];
    categoryEvents: CategoryEvent[];
    travelEvents: TravelEvent[];
    engineMessages: EngineMessage[];
    locations: SerializedLocation[];
    travelTimes: SerializedTravelTime[];
  },
) => {
  // Previous state refs to track what the server has
  const previousPlanner = useRef<Planner[]>([]);
  const previousCalendar = useRef<SimpleEvent[]>([]);
  const previousTemplate = useRef<EventTemplate[]>([]);
  const previousCategories = useRef<Category[]>([]);
  const previousCategoryEvents = useRef<CategoryEvent[]>([]);
  const previousTravelEvents = useRef<TravelEvent[]>([]);
  const previousEngineMessages = useRef<EngineMessage[]>([]);
  const previousLocations = useRef<SerializedLocation[]>([]);
  const previousTravelTimes = useRef<SerializedTravelTime[]>([]);
  // OCC token. Every successful sync bumps the server-side User.dataVersion
  // by 1; we send the version we think is current and the server rejects the
  // sync if it has moved on. Seeded by initializeState from fetchCalendarData.
  const knownDataVersion = useRef<number>(0);

  const [isInitialized, setIsInitialized] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  const {
    planner,
    calendar,
    template,
    categories,
    categoryEvents,
    travelEvents,
    engineMessages,
    locations,
    travelTimes,
  } = calendarState;

  const initializeState = useCallback(
    (
      planner: Planner[],
      calendar: SimpleEvent[],
      template: EventTemplate[],
      categories: Category[],
      categoryEvents: CategoryEvent[],
      travelEvents: TravelEvent[],
      engineMessages: EngineMessage[],
      dataVersion: number,
    ) => {
      previousPlanner.current = planner;
      previousCalendar.current = calendar;
      previousTemplate.current = template;
      previousCategories.current = categories;
      previousCategoryEvents.current = categoryEvents;
      previousTravelEvents.current = travelEvents;
      previousEngineMessages.current = engineMessages;
      // Locations are loaded asynchronously by UserProvider, which may race
      // with the calendar fetch. We seed previousLocations from the current
      // value; the diff's create-branch is a no-op for locations (Google
      // Places lookup must happen server-side via a direct action), so a
      // late-arriving setLocations(loaded) will be absorbed without sending
      // spurious create operations on the next sync pass.
      previousLocations.current = locationsAtInitRef.current;
      previousTravelTimes.current = travelTimesAtInitRef.current;
      knownDataVersion.current = dataVersion;
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

  // Snap Redux back to the last server-confirmed state stored in the refs.
  // Called when a sync transaction fails so the client doesn't keep diverging
  // optimistically from the DB. Without this, the same failing diff would
  // re-fire indefinitely against stale refs.
  const rollbackToLastConfirmedState = useCallback(() => {
    dispatch(
      calendarSlice.actions.updateCalendarArrayData({
        planner: previousPlanner.current,
        calendar: previousCalendar.current,
        template: previousTemplate.current,
        categories: previousCategories.current,
        categoryEvents: previousCategoryEvents.current,
        travelEvents: previousTravelEvents.current,
        engineMessages: previousEngineMessages.current,
      }),
    );
    dispatch(
      schedulingSettingsSlice.actions.setLocations(previousLocations.current),
    );
    dispatch(
      schedulingSettingsSlice.actions.setAllTravelTimes(
        previousTravelTimes.current,
      ),
    );
  }, [dispatch]);

  // Replace Redux + every ref with the server's fresh snapshot. Used when the
  // sync is rejected as stale (OCC mismatch) — the client's in-flight edit is
  // discarded because applying it on top of a divergent DAG would corrupt
  // state. Refs advance to the new dataVersion so the next sync starts clean.
  const adoptFreshServerState = useCallback(
    (fresh: FreshState) => {
      previousPlanner.current = fresh.planner;
      previousCalendar.current = fresh.calendar;
      previousTemplate.current = fresh.template;
      previousCategories.current = fresh.categories;
      previousCategoryEvents.current = fresh.categoryEvents;
      previousTravelEvents.current = fresh.travelEvents;
      previousEngineMessages.current = fresh.engineMessages;
      previousLocations.current = fresh.locations;
      previousTravelTimes.current = fresh.travelTimes;
      knownDataVersion.current = fresh.dataVersion;

      dispatch(
        calendarSlice.actions.updateCalendarArrayData({
          planner: fresh.planner,
          calendar: fresh.calendar,
          template: fresh.template,
          categories: fresh.categories,
          categoryEvents: fresh.categoryEvents,
          travelEvents: fresh.travelEvents,
          engineMessages: fresh.engineMessages,
        }),
      );
      dispatch(schedulingSettingsSlice.actions.setLocations(fresh.locations));
      dispatch(
        schedulingSettingsSlice.actions.setAllTravelTimes(fresh.travelTimes),
      );
    },
    [dispatch],
  );

  useEffect(() => {
    const processServerSync = async () => {
      if (!userId) throw new Error("Id missing in processServerSync");

      try {
        const response = await handleServerTransaction(
          userId,
          knownDataVersion.current,
          planner,
          previousPlanner,
          calendar,
          previousCalendar,
          template,
          previousTemplate,
          categories,
          previousCategories,
          categoryEvents,
          previousCategoryEvents,
          travelEvents,
          previousTravelEvents,
          engineMessages,
          previousEngineMessages,
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
          previousCategoryEvents.current = categoryEvents;
          previousTravelEvents.current = travelEvents;
          previousEngineMessages.current = engineMessages;
          previousLocations.current = locations;
          previousTravelTimes.current = travelTimes;
          knownDataVersion.current = response.newDataVersion;
        } else if (response.reason === "stale") {
          // Server rejected this sync because another writer moved the
          // dataVersion forward. Discard the in-flight edit and adopt the
          // server's current snapshot wholesale — partial application across
          // a DAG-shaped dataset can't be done safely.
          console.warn(
            "Sync rejected as stale; adopting fresh server state",
          );
          adoptFreshServerState(response.freshState);
        } else {
          console.warn("Server sync response not successful:", response);
          rollbackToLastConfirmedState();
        }
      } catch (error) {
        console.error("Error processing server sync:", error);
        rollbackToLastConfirmedState();
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
    const categoryEventsSame =
      JSON.stringify(previousCategoryEvents.current) ===
      JSON.stringify(categoryEvents);
    const travelEventsSame =
      JSON.stringify(previousTravelEvents.current) ===
      JSON.stringify(travelEvents);
    const engineMessagesSame =
      JSON.stringify(previousEngineMessages.current) ===
      JSON.stringify(engineMessages);
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
      categoryEventsSame &&
      travelEventsSame &&
      engineMessagesSame &&
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
    categoryEvents,
    travelEvents,
    engineMessages,
    locations,
    travelTimes,
    isInitialized,
    userId,
  ]);

  return { initializeState, markSynced };
};

export default useCalendarServerSync;
