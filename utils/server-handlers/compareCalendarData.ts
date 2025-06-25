"use client";

import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "@/types/calendarTypes";
import { objectsAreEqual } from "../generalUtils";
import { syncCalendarData } from "@/actions/calendar-actions/syncCalendarData";
import { EventTemplate } from "@/utils/templateBuilderUtils";

import {
  serializePlanner,
  serializeSimpleEvent,
  serializeEventTemplate,
  SerializedPlanner,
  SerializedSimpleEvent,
  SerializedEventTemplate,
} from "@/utils/server-handlers/serializing";

export async function handleServerTransaction(
  userId: string,
  mainPlanner: Planner[],
  previousPlanner: { current: Planner[] },
  currentCalendar: SimpleEvent[],
  previousCalendar: { current: SimpleEvent[] },
  currentTemplate?: EventTemplate[],
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
  } = compareAndSerializeCalendarData(
    mainPlanner,
    previousPlanner,
    currentCalendar,
    previousCalendar,
    currentTemplate,
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

export function compareAndSerializeCalendarData(
  mainPlanner: Planner[],
  previousPlanner: { current: Planner[] },
  currentCalendar: SimpleEvent[],
  previousCalendar: { current: SimpleEvent[] },
  currentTemplate?: EventTemplate[],
  previousTemplate?: { current: EventTemplate[] }
) {
  // Check planner changes
  const prevPlan: Planner[] = [...previousPlanner.current];
  const plannerMap = new Map(
    mainPlanner.map((planner) => [planner.id, planner])
  );
  const prevPlanMap = new Map(prevPlan.map((planner) => [planner.id, planner]));

  const create: SerializedPlanner[] = [];
  const update: SerializedPlanner[] = [];
  const destroy: SerializedPlanner[] = [];

  // Find items to create or update
  plannerMap.forEach((item) => {
    const prevItem = prevPlanMap.get(item.id);
    if (!prevItem) {
      create.push(serializePlanner(item));
    } else if (!objectsAreEqual(prevItem, item)) {
      update.push(serializePlanner(item));
    }
  });

  // Find items to delete (items in previous but not in current)
  prevPlanMap.forEach((item) => {
    if (!plannerMap.has(item.id)) {
      destroy.push(serializePlanner(item));
    }
  });

  // Check calendar changes
  const prevCal: SimpleEvent[] = [...previousCalendar.current];
  const calendarMap = new Map(
    currentCalendar.map((event) => [event.id, event])
  );
  const prevCalMap = new Map(prevCal.map((event) => [event.id, event]));

  console.log("currentCalendar");
  console.log(currentCalendar);

  const createEvent: SerializedSimpleEvent[] = [];
  const updateEvent: SerializedSimpleEvent[] = [];
  const destroyEvent: SerializedSimpleEvent[] = [];

  // Find events to create or update
  calendarMap.forEach((event) => {
    const prevEvent = prevCalMap.get(event.id);
    if (!prevEvent) {
      createEvent.push(serializeSimpleEvent(event));
    } else if (!objectsAreEqual(prevEvent, event)) {
      updateEvent.push(serializeSimpleEvent(event));
    }
  });

  // Find events to delete (events in previous but not in current)
  prevCalMap.forEach((event) => {
    if (!calendarMap.has(event.id)) {
      destroyEvent.push(serializeSimpleEvent(event));
    }
  });

  // Check template changes
  const createTemplate: SerializedEventTemplate[] = [];
  const updateTemplate: SerializedEventTemplate[] = [];
  const destroyTemplate: SerializedEventTemplate[] = [];

  if (currentTemplate && previousTemplate) {
    const prevTemp: EventTemplate[] = [...previousTemplate.current];
    const templateMap = new Map(
      currentTemplate.map((template) => [template.id, template])
    );
    const prevTempMap = new Map(
      prevTemp.map((template) => [template.id, template])
    );

    // Find templates to create or update
    templateMap.forEach((template) => {
      const prevTemplate = prevTempMap.get(template.id);
      if (!prevTemplate) {
        createTemplate.push(serializeEventTemplate(template));
      } else if (!objectsAreEqual(prevTemplate, template)) {
        updateTemplate.push(serializeEventTemplate(template));
      }
    });

    // Find templates to delete (templates in previous but not in current)
    prevTempMap.forEach((template) => {
      if (!templateMap.has(template.id)) {
        destroyTemplate.push(serializeEventTemplate(template));
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
