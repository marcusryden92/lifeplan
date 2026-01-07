"use client";

import {
  Planner,
  SimpleEvent,
  EventTemplate,
  EventExtendedProps,
} from "@/types/prisma";
import { objectsAreEqual } from "../generalUtils";
import { syncCalendarData } from "@/actions/calendar-actions/syncCalendarData";

type ChangeGroup<T> = {
  create: T[];
  update: T[];
  destroy: T[];
};

type PlannerChange = Planner;
type CalendarChange = Omit<SimpleEvent, "extendedProps">;
type TemplateChange = EventTemplate;
type ExtendedPropsChange = EventExtendedProps;

export type DatabaseChanges = {
  planner: ChangeGroup<PlannerChange>;
  calendar: ChangeGroup<CalendarChange>;
  template: ChangeGroup<TemplateChange>;
  extendedProps: ChangeGroup<ExtendedPropsChange>;
};

export async function handleServerTransaction(
  userId: string,
  planner: Planner[],
  previousPlanner: { current: Planner[] },
  calendar: SimpleEvent[],
  previousCalendar: { current: SimpleEvent[] },
  template?: EventTemplate[],
  previousTemplate?: { current: EventTemplate[] }
) {
  // Filter out generated events (travel, template, category wrappers) BEFORE serialization
  // These are dynamically generated and should never be persisted to database
  const filterGeneratedEvents = (events: SimpleEvent[]) =>
    events.filter(
      (e) =>
        e.extendedProps?.itemType !== "travel" &&
        e.extendedProps?.itemType !== "template" &&
        !e.extendedProps?.wrapperId // Category wrapper events have wrapperId
    );

  const filteredCalendar = filterGeneratedEvents(calendar);
  const filteredPreviousCalendar = filterGeneratedEvents(
    previousCalendar.current
  );

  // Serialize inputs to remove any Date objects or non-serializable data
  const serializedPlanner = JSON.parse(JSON.stringify(planner));
  const serializedPreviousPlanner = {
    current: JSON.parse(JSON.stringify(previousPlanner.current)),
  };
  const serializedCalendar = JSON.parse(JSON.stringify(filteredCalendar));
  const serializedPreviousCalendar = {
    current: JSON.parse(JSON.stringify(filteredPreviousCalendar)),
  };
  const serializedTemplate = template
    ? JSON.parse(JSON.stringify(template))
    : undefined;
  const serializedPreviousTemplate = previousTemplate
    ? { current: JSON.parse(JSON.stringify(previousTemplate.current)) }
    : undefined;

  const databaseChanges = compareData(
    serializedPlanner,
    serializedPreviousPlanner,
    serializedCalendar,
    serializedPreviousCalendar,
    serializedTemplate,
    serializedPreviousTemplate
  );

  const response = await syncCalendarData(userId, databaseChanges);

  return response;
}

export function compareData(
  planner: Planner[],
  previousPlanner: { current: Planner[] },
  calendar: SimpleEvent[],
  previousCalendar: { current: SimpleEvent[] },
  template?: EventTemplate[],
  previousTemplate?: { current: EventTemplate[] }
) {
  const databaseChanges: DatabaseChanges = {
    planner: { create: [], update: [], destroy: [] },
    calendar: { create: [], update: [], destroy: [] },
    template: { create: [], update: [], destroy: [] },
    extendedProps: { create: [], update: [], destroy: [] },
  };

  // Check planner changes
  const prevPlan: Planner[] = [...previousPlanner.current];
  const plannerMap = new Map(planner.map((planner) => [planner.id, planner]));
  const prevPlanMap = new Map(prevPlan.map((planner) => [planner.id, planner]));

  // Find items to create or update
  plannerMap.forEach((item) => {
    const prevItem = prevPlanMap.get(item.id);
    if (!prevItem) {
      databaseChanges.planner.create.push(item);
    } else if (!objectsAreEqual(prevItem, item)) {
      databaseChanges.planner.update.push(item);
    }
  });

  // Find items to delete (items in previous but not in current)
  prevPlanMap.forEach((item) => {
    if (!plannerMap.has(item.id)) {
      databaseChanges.planner.destroy.push(item);
    }
  });

  // Check calendar changes
  // Note: Generated events (travel, template, category wrappers) are already filtered out
  // in handleServerTransaction before this function is called
  const prevCal: SimpleEvent[] = [...previousCalendar.current];
  const filteredCalendar = [...calendar];
  const calendarMap = new Map(
    filteredCalendar.map((event) => [event.id, event])
  );
  const prevCalMap = new Map(prevCal.map((event) => [event.id, event]));

  // Find events to create or update
  calendarMap.forEach((event) => {
    const prevEvent = prevCalMap.get(event.id);

    if (!prevEvent) {
      const { extendedProps, ...eventCore } = event;
      databaseChanges.calendar.create.push(eventCore as CalendarChange);

      if (extendedProps) {
        databaseChanges.extendedProps.create.push({
          ...extendedProps,
          eventId: event.id,
        } as EventExtendedProps);
      }

      return;
    }

    if (!objectsAreEqual(prevEvent, event)) {
      const { extendedProps: _extendedProps, ...eventCore } = event;
      databaseChanges.calendar.update.push(eventCore as CalendarChange);
    }

    if (
      prevEvent.extendedProps &&
      event.extendedProps &&
      !objectsAreEqual(prevEvent.extendedProps, event.extendedProps)
    ) {
      databaseChanges.extendedProps.update.push({
        ...event.extendedProps,
        eventId: event.id,
      } as EventExtendedProps);
    }
  });

  // Find events to delete (events in previous but not in current)
  prevCalMap.forEach((event) => {
    if (!calendarMap.has(event.id)) {
      const { extendedProps: _extendedProps, ...eventCore } = event;
      databaseChanges.calendar.destroy.push(eventCore as CalendarChange);
    }
  });

  // Check template changes

  if (template && previousTemplate) {
    const prevTemp: EventTemplate[] = [...previousTemplate.current];
    const templateMap = new Map(
      template.map((template) => [template.id, template])
    );
    const prevTempMap = new Map(
      prevTemp.map((template) => [template.id, template])
    );

    // Find templates to create or update
    templateMap.forEach((template) => {
      const prevTemplate = prevTempMap.get(template.id);
      if (!prevTemplate) {
        databaseChanges.template.create.push(template);
      } else if (!objectsAreEqual(prevTemplate, template)) {
        databaseChanges.template.update.push(template);
      }
    });

    // Find templates to delete (templates in previous but not in current)
    prevTempMap.forEach((template) => {
      if (!templateMap.has(template.id)) {
        databaseChanges.template.destroy.push(template);
      }
    });
  }

  return databaseChanges;
}
