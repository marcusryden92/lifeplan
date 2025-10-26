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

export type DatabaseChanges = {
  planner: ChangeGroup<Planner>;
  calendar: ChangeGroup<SimpleEvent>;
  template: ChangeGroup<EventTemplate>;
  extendedProps: ChangeGroup<EventExtendedProps>;
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
  const databaseChanges = compareData(
    planner,
    previousPlanner,
    calendar,
    previousCalendar,
    template,
    previousTemplate
  );

  const response = syncCalendarData(userId, databaseChanges);

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
  const prevCal: SimpleEvent[] = [...previousCalendar.current];
  const calendarMap = new Map(calendar.map((event) => [event.id, event]));
  const prevCalMap = new Map(prevCal.map((event) => [event.id, event]));

  // Find events to create or update
  calendarMap.forEach((event) => {
    const prevEvent = prevCalMap.get(event.id);

    if (!prevEvent) {
      databaseChanges.calendar.create.push(event);

      if (event.extendedProps) {
        databaseChanges.extendedProps.create.push({
          ...event.extendedProps,
          eventId: event.id,
        } as EventExtendedProps);
      }

      return;
    }

    if (!objectsAreEqual(prevEvent, event)) {
      databaseChanges.calendar.update.push(event);
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
      databaseChanges.calendar.destroy.push(event);
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
