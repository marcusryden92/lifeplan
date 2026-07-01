"use client";

import { useCallback, useRef } from "react";
import { floorMinutes } from "@/utils/calendarUtils";
import { WeekDayIntegers } from "@/types/calendarTypes";

import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import { taskIsCompleted } from "@/utils/taskHelpers";

import {
  Planner,
  SimpleEvent,
  EventTemplate,
  Category,
  EngineMessage,
} from "@/types/prisma";
import { AppDispatch, RootState } from "@/redux/store";
import calendarSlice from "@/redux/slices/calendarSlice";
import { useSelector } from "react-redux";
import {
  travelTimeArrayToMap,
  type SerializedTravelTimeEntry,
  type DebugStrategyConfig,
} from "@/redux/slices/schedulingSettingsSlice";

const useManuallyRefreshCalendar = (
  userId: string | undefined,
  calendarState: {
    planner: Planner[];
    calendar: SimpleEvent[];
    template: EventTemplate[];
    categories: Category[];
  },
  weekStartDay: WeekDayIntegers,
  dispatch: AppDispatch
) => {
  const { planner, calendar, template, categories } = calendarState;
  const bufferTimeMinutes = useSelector(
    (state: RootState) => state.schedulingSettings.bufferTimeMinutes
  );
  const enableTravelEvents = useSelector(
    (state: RootState) => state.schedulingSettings.enableTravelEvents
  );
  const travelTimeMatrix = useSelector(
    (state: RootState) => state.schedulingSettings.travelTimeMatrix
  );
  const debugStrategyConfig = useSelector(
    (state: RootState) => state.schedulingSettings.debugStrategyConfig
  );
  const previousEngineMessages = useSelector(
    (state: RootState) => state.calendar.engineMessages
  );

  // Store latest values in refs so callback doesn't need to depend on them
  const stateRef = useRef<{
    userId: string | undefined;
    planner: Planner[];
    calendar: SimpleEvent[];
    template: EventTemplate[];
    categories: Category[];
    weekStartDay: WeekDayIntegers;
    bufferTimeMinutes: number;
    enableTravelEvents: boolean;
    travelTimeMatrix: SerializedTravelTimeEntry[] | null;
    debugStrategyConfig: DebugStrategyConfig;
    previousEngineMessages: EngineMessage[];
    dispatch: AppDispatch;
  }>({
    userId,
    planner,
    calendar,
    template,
    categories,
    weekStartDay,
    bufferTimeMinutes,
    enableTravelEvents,
    travelTimeMatrix,
    debugStrategyConfig,
    previousEngineMessages,
    dispatch,
  });
  stateRef.current = {
    userId,
    planner,
    calendar,
    template,
    categories,
    weekStartDay,
    bufferTimeMinutes,
    enableTravelEvents,
    travelTimeMatrix,
    debugStrategyConfig,
    previousEngineMessages,
    dispatch,
  };

  const manuallyRefreshCalendar = useCallback(() => {
    const {
      userId,
      planner,
      calendar,
      template,
      categories,
      weekStartDay,
      bufferTimeMinutes,
      enableTravelEvents,
      travelTimeMatrix,
      debugStrategyConfig,
      previousEngineMessages,
      dispatch,
    } = stateRef.current;

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

      // Convert serialized array to Map for calendar generation
      const travelTimeMap = travelTimeArrayToMap(travelTimeMatrix);

      const {
        events: newCalendar,
        categoryEvents: newCategoryEvents,
        travelEvents: newTravelEvents,
        messages: newEngineMessages,
      } = generateCalendar(
        userId,
        weekStartDay,
        template,
        planner,
        filteredCalendar,
        {
          bufferTimeMinutes,
          travelTimeMatrix: travelTimeMap ?? undefined,
          injectTravelEvents: enableTravelEvents,
          strategyWeights: debugStrategyConfig.weights,
          locationGroupingScores: debugStrategyConfig.locationGrouping.scores,
          locationGroupingPenalties:
            debugStrategyConfig.locationGrouping.penalties,
          categories,
          previousEngineMessages,
        },
      );

      // Use updateAll to bypass the thunk's regeneration
      // Pass the generated calendar directly without triggering another generation
      dispatch(
        calendarSlice.actions.updateCalendarArrayData({
          planner,
          calendar: newCalendar,
          template,
          categories,
          categoryEvents: newCategoryEvents,
          travelEvents: newTravelEvents,
          engineMessages: newEngineMessages,
        })
      );
    }
  }, []);

  return manuallyRefreshCalendar;
};

export default useManuallyRefreshCalendar;
