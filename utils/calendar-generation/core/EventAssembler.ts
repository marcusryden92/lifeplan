import { Planner, SimpleEvent, Category } from "@/types/prisma";
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
    constraints: Category[],
    startDate: Date,
    endDate: Date,
  ): SimpleEvent[] {
    return buildCategoryWrapperEvents(userId, constraints, startDate, endDate);
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
