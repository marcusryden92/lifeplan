/**
 * Initial Event Array Builder
 *
 * Builds the initial event array with memoized, plan, and completed items
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { EventAssembler } from "../../core/EventAssembler";

export function buildInitialEventArray(
  userId: string,
  planners: Planner[],
  previousCalendar: SimpleEvent[],
  currentDate: Date
): {
  eventArray: SimpleEvent[];
  memoizedEventIds: Set<string>;
} {
  const eventArray: SimpleEvent[] = [];

  // Step 1: Memoized events (past events from previous calendar)
  const { events: memoizedEvents, eventIds: memoizedEventIds } =
    EventAssembler.buildMemoizedEvents(previousCalendar, currentDate);
  eventArray.push(...memoizedEvents);

  // Step 2: Plan items (fixed-time appointments)
  const planEvents = EventAssembler.buildPlanEvents(
    userId,
    planners,
    memoizedEventIds
  );
  eventArray.push(...planEvents);

  // Step 3: Completed items
  const completedEvents = EventAssembler.buildCompletedEvents(
    userId,
    planners,
    memoizedEventIds
  );
  eventArray.push(...completedEvents);

  return { eventArray, memoizedEventIds };
}
