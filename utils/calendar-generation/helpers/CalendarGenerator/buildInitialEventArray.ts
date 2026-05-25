/**
 * Initial Event Array Builder
 *
 * Builds the initial event array with memoized, plan, and completed items
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import {
  buildMemoizedEvents,
  buildPlanEvents,
  buildCompletedEvents,
} from "../EventAssembler";

export function buildInitialEventArray(
  userId: string,
  planners: Planner[],
  previousCalendar: SimpleEvent[],
  currentDate: Date,
): {
  eventArray: SimpleEvent[];
  memoizedEventIds: Set<string>;
} {
  const eventArray: SimpleEvent[] = [];

  const { events: memoizedEvents, eventIds: memoizedEventIds } =
    buildMemoizedEvents(previousCalendar, currentDate);

  eventArray.push(...memoizedEvents);

  const planEvents = buildPlanEvents(userId, planners, memoizedEventIds);
  eventArray.push(...planEvents);

  const completedEvents = buildCompletedEvents(
    userId,
    planners,
    memoizedEventIds,
  );
  eventArray.push(...completedEvents);

  return { eventArray, memoizedEventIds };
}
