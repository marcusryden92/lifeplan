/**
 * EventAssembler
 *
 * Handles final event list assembly including:
 * - Memoized (past) events
 * - Plan items
 * - Completed items
 * - Category wrapper events
 * - Travel events
 * - Trespassing detection
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { RuntimeEventExtendedProps } from "@/types/ui";
import { v4 as uuidv4 } from "uuid";
import { LocationEntry } from "@/utils/calendar-generation/models/SchedulingModels";
import { taskIsCompleted } from "../../../taskHelpers";
import {
  detectTrespassingEvents,
  IntervalWithId,
} from "../../utils/intervalUtils";

interface CategoryPeriod {
  start: Date;
  end: Date;
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  isStrict: boolean;
}

export class EventAssembler {
  /**
   * Build memoized events from previous calendar
   * Returns past events (excluding templates/travel)
   */
  static buildMemoizedEvents(
    previousCalendar: SimpleEvent[],
    currentDate: Date
  ): { events: SimpleEvent[]; eventIds: Set<string> } {
    const memoizedEventIds = new Set<string>();
    const events: SimpleEvent[] = [];

    if (previousCalendar.length > 0) {
      const pastEvents = previousCalendar.filter(
        (e) =>
          currentDate > new Date(e.end) &&
          e.extendedProps?.itemType !== "template" &&
          e.extendedProps?.itemType !== "travel"
      );
      pastEvents.forEach((e) => memoizedEventIds.add(e.id));
      events.push(...pastEvents);
    }

    return { events, eventIds: memoizedEventIds };
  }

  /**
   * Build plan item events (fixed time appointments)
   */
  static buildPlanEvents(
    userId: string,
    planners: Planner[],
    memoizedEventIds: Set<string>
  ): SimpleEvent[] {
    const planItems = planners.filter(
      (task) => task.itemType === "plan" && !memoizedEventIds.has(task.id)
    );

    const now = new Date();
    const events: SimpleEvent[] = [];

    for (const plan of planItems) {
      if (plan.starts && plan.duration) {
        const end = new Date(
          new Date(plan.starts).getTime() + plan.duration * 60000
        );

        events.push({
          userId,
          title: plan.title,
          id: plan.id,
          start: plan.starts,
          end: end.toISOString(),
          extendedProps: {
            id: uuidv4(),
            eventId: plan.id,
            itemType: "plan",
            parentId: null,
            completedEndTime: null,
            completedStartTime: null,
          },
          backgroundColor: "black",
          borderColor: "black",
          duration: null,
          rrule: null,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
      }
    }

    return events;
  }

  /**
   * Build completed item events
   */
  static buildCompletedEvents(
    userId: string,
    planners: Planner[],
    memoizedEventIds: Set<string>
  ): SimpleEvent[] {
    const completedItems = planners.filter(
      (task) => taskIsCompleted(task) && !memoizedEventIds.has(task.id)
    );

    const now = new Date();
    const events: SimpleEvent[] = [];

    for (const item of completedItems) {
      if (item.completedStartTime && item.completedEndTime) {
        events.push({
          userId,
          title: item.title,
          id: item.id,
          start: item.completedStartTime,
          end: item.completedEndTime,
          backgroundColor: item.color as string,
          borderColor: "",
          duration: null,
          rrule: null,
          extendedProps: {
            id: uuidv4(),
            eventId: item.id,
            itemType: item.itemType,
            completedStartTime: item.completedStartTime,
            completedEndTime: item.completedEndTime,
            parentId: item.parentId ?? null,
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
      }
    }

    return events;
  }

  /**
   * Build category wrapper events for visualization
   */
  static buildCategoryWrapperEvents(
    userId: string,
    categoryPeriods: CategoryPeriod[]
  ): SimpleEvent[] {
    const events: SimpleEvent[] = [];

    for (const period of categoryPeriods) {
      const startHours = String(period.start.getHours()).padStart(2, "0");
      const startMinutes = String(period.start.getMinutes()).padStart(2, "0");
      const endHours = String(period.end.getHours()).padStart(2, "0");
      const endMinutes = String(period.end.getMinutes()).padStart(2, "0");
      const startTimeStr = `${startHours}:${startMinutes}`;
      const endTimeStr = `${endHours}:${endMinutes}`;

      const wrapperId = `${period.categoryId}-${period.start.getDay()}-${startTimeStr}-${endTimeStr}`;

      const extendedProps: RuntimeEventExtendedProps = {
        id: uuidv4(),
        itemType: "category" as const,
        eventId: "",
        parentId: null,
        completedStartTime: null,
        completedEndTime: null,
        categoryId: period.categoryId,
        isStrict: period.isStrict,
        wrapperId: wrapperId,
      };

      events.push({
        id: uuidv4(),
        title: `${period.categoryName} Time Slot`,
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        duration: Math.floor(
          (period.end.getTime() - period.start.getTime()) / 60000
        ),
        userId: userId,
        rrule: null,
        backgroundColor: period.categoryColor || "#3b82f6",
        borderColor: period.categoryColor || "#3b82f6",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        extendedProps: extendedProps,
      });
    }

    return events;
  }

  /**
   * Mark events that are trespassing (overlapping with different locations)
   * Modifies events in place to add trespassingStart/trespassingEnd to extendedProps
   */
  static markTrespassingEvents(
    events: SimpleEvent[],
    plannerLocationMap: Map<string, LocationEntry>
  ): void {
    // Convert events to intervals with IDs and locations
    const intervals: IntervalWithId[] = events
      .filter((e) => e.extendedProps?.itemType !== "travel")
      .map((e) => {
        const plannerId =
          (e.extendedProps as { eventId?: string })?.eventId || e.id;
        const locationId = plannerLocationMap.get(plannerId)?.locationId ?? null;

        return {
          start: new Date(e.start),
          end: new Date(e.end),
          locationId,
          eventId: e.id,
        };
      });

    // Detect trespassing
    const trespassingMap = detectTrespassingEvents(intervals);

    // Mark events with trespassing info
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const info = trespassingMap.get(event.id);

      if (info && event.extendedProps) {
        const updatedProps: RuntimeEventExtendedProps = {
          ...(event.extendedProps || {}),
          trespassingStart: info.trespassingStart,
          trespassingEnd: info.trespassingEnd,
        };

        events[i] = {
          ...event,
          extendedProps: updatedProps,
        };
      }
    }
  }

  /**
   * Assemble final event list with proper filtering
   */
  static assembleFinalEvents(
    scheduledEvents: SimpleEvent[],
    travelEvents: SimpleEvent[],
    categoryWrapperEvents: SimpleEvent[]
  ): SimpleEvent[] {
    // Filter out template events from scheduled events
    // (templates are re-generated and included separately)
    const scheduledNonTemplateEvents = scheduledEvents.filter(
      (e) => e.extendedProps?.itemType !== "template"
    );

    // Get template events for UI (with rrule for FullCalendar)
    const templateEventsForUI = scheduledEvents.filter(
      (e) => e.extendedProps?.itemType === "template"
    );

    return [
      ...scheduledNonTemplateEvents,
      ...templateEventsForUI,
      ...travelEvents,
      ...categoryWrapperEvents,
    ];
  }
}
