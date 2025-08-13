"use client";

import { Planner, SimpleEvent, EventTemplate } from "@/prisma/generated/client";
import { objectsAreEqual } from "../generalUtils";
import { syncCalendarData } from "@/actions/calendar-actions/syncCalendarData";

export async function handleServerTransaction(
  userId: string,
  planner: Planner[],
  previousPlanner: { current: Planner[] },
  calendar: SimpleEvent[],
  previousCalendar: { current: SimpleEvent[] },
  template?: EventTemplate[],
  previousTemplate?: { current: EventTemplate[] }
) {
  const {
    create,
    update,
    destroy,
    createEvent,
    updateEvent,
    destroyEvent,
    createTemplate,
    updateTemplate,
    destroyTemplate,
  } = compareData(
    planner,
    previousPlanner,
    calendar,
    previousCalendar,
    template,
    previousTemplate
  );

  const response = syncCalendarData(
    userId,
    create,
    update,
    destroy,
    createEvent,
    updateEvent,
    destroyEvent,
    createTemplate,
    updateTemplate,
    destroyTemplate
  );

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
  // Check planner changes
  const prevPlan: Planner[] = [...previousPlanner.current];
  const plannerMap = new Map(planner.map((planner) => [planner.id, planner]));
  const prevPlanMap = new Map(prevPlan.map((planner) => [planner.id, planner]));

  const create: Planner[] = [];
  const update: Planner[] = [];
  const destroy: Planner[] = [];

  // Find items to create or update
  plannerMap.forEach((item) => {
    const prevItem = prevPlanMap.get(item.id);
    if (!prevItem) {
      create.push(item);
    } else if (!objectsAreEqual(prevItem, item)) {
      update.push(item);
    }
  });

  // Find items to delete (items in previous but not in current)
  prevPlanMap.forEach((item) => {
    if (!plannerMap.has(item.id)) {
      destroy.push(item);
    }
  });

  // Check calendar changes
  const prevCal: SimpleEvent[] = [...previousCalendar.current];
  const calendarMap = new Map(calendar.map((event) => [event.id, event]));
  const prevCalMap = new Map(prevCal.map((event) => [event.id, event]));

  const createEvent: SimpleEvent[] = [];
  const updateEvent: SimpleEvent[] = [];
  const destroyEvent: SimpleEvent[] = [];

  // Find events to create or update
  calendarMap.forEach((event) => {
    const prevEvent = prevCalMap.get(event.id);
    if (!prevEvent) {
      createEvent.push(event);
    } else if (!objectsAreEqual(prevEvent, event)) {
      updateEvent.push(event);
    }
  });

  // Find events to delete (events in previous but not in current)
  prevCalMap.forEach((event) => {
    if (!calendarMap.has(event.id)) {
      destroyEvent.push(event);
    }
  });

  // Check template changes
  const createTemplate: EventTemplate[] = [];
  const updateTemplate: EventTemplate[] = [];
  const destroyTemplate: EventTemplate[] = [];

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
        createTemplate.push(template);
      } else if (!objectsAreEqual(prevTemplate, template)) {
        updateTemplate.push(template);
      }
    });

    // Find templates to delete (templates in previous but not in current)
    prevTempMap.forEach((template) => {
      if (!templateMap.has(template.id)) {
        destroyTemplate.push(template);
      }
    });
  }

  return {
    create,
    update,
    destroy,
    createEvent,
    updateEvent,
    destroyEvent,
    createTemplate,
    updateTemplate,
    destroyTemplate,
  };
}
