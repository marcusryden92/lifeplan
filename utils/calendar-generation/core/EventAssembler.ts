import { Planner, SimpleEvent } from "@/types/prisma";
import { CategoryPeriod } from "../models/SchedulingModels";
import {
  buildMemoizedEvents,
  buildPlanEvents,
  buildCompletedEvents,
  buildCategoryWrapperEvents,
  markTrespassingEvents,
  assembleFinalEventList,
} from "../helpers/EventAssembler";

export class EventAssembler {
  static buildMemoizedEvents(
    previousCalendar: SimpleEvent[],
    currentDate: Date
  ): { events: SimpleEvent[]; eventIds: Set<string> } {
    return buildMemoizedEvents(previousCalendar, currentDate);
  }

  static buildPlanEvents(
    userId: string,
    planners: Planner[],
    memoizedEventIds: Set<string>
  ): SimpleEvent[] {
    return buildPlanEvents(userId, planners, memoizedEventIds);
  }

  static buildCompletedEvents(
    userId: string,
    planners: Planner[],
    memoizedEventIds: Set<string>
  ): SimpleEvent[] {
    return buildCompletedEvents(userId, planners, memoizedEventIds);
  }

  static buildCategoryWrapperEvents(
    userId: string,
    categoryPeriods: CategoryPeriod[]
  ): SimpleEvent[] {
    return buildCategoryWrapperEvents(userId, categoryPeriods);
  }

  static markTrespassingEvents(
    events: SimpleEvent[],
    plannerLocationMap: Map<string, string | null>
  ): void {
    return markTrespassingEvents(events, plannerLocationMap);
  }

  static assembleFinalEvents(
    scheduledEvents: SimpleEvent[],
    travelEvents: SimpleEvent[],
    categoryWrapperEvents: SimpleEvent[]
  ): SimpleEvent[] {
    return assembleFinalEventList(scheduledEvents, travelEvents, categoryWrapperEvents);
  }
}
