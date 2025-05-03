import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "../eventUtils";
import { objectsAreEqual } from "../generalUtils";

import { db } from "@/lib/db";

export async function compareUpsertPlannerTable(
  userId: string,
  mainPlanner: Planner[],
  previousPlanner: { current: Planner[] },
  currentCalendar: SimpleEvent[],
  previousCalendar: { current: SimpleEvent[] }
) {
  // Check planner changes
  const prevPlan: Planner[] = [...previousPlanner.current];
  const plannerMap = new Map(
    mainPlanner.map((planner) => [planner.id, planner])
  );
  const prevPlanMap = new Map(prevPlan.map((planner) => [planner.id, planner]));

  const create: Planner[] = [];
  const update: Planner[] = [];
  const destroy: Planner[] = [];

  plannerMap.forEach((item) => {
    if (!prevPlanMap.has(item.id)) create.push(item);
  });

  plannerMap.forEach((item) => {
    const prevItem = prevPlanMap.get(item.id);
    if (prevItem && !objectsAreEqual(prevItem, item)) {
      update.push(item);
    } else if (!prevItem) destroy.push(item);
  });

  // Check calendar changes
  const prevCal: SimpleEvent[] = [...previousCalendar.current];
  const calendarMap = new Map(
    currentCalendar.map((event) => [event.id, event])
  );
  const prevCalMap = new Map(prevCal.map((event) => [event.id, event]));

  const createEvent: SimpleEvent[] = [];
  const updateEvent: SimpleEvent[] = [];
  const destroyEvent: SimpleEvent[] = [];

  calendarMap.forEach((event) => {
    if (!prevCalMap.has(event.id)) createEvent.push(event);
  });

  calendarMap.forEach((event) => {
    const prevEvent = prevCalMap.get(event.id);
    if (prevEvent && !objectsAreEqual(prevEvent, event)) {
      updateEvent.push(event);
    } else if (!prevEvent) destroyEvent.push(event);
  });

  uploadPlanners(
    userId,
    create,
    update,
    destroy,
    createEvent,
    updateEvent,
    destroyEvent
  );
}

async function uploadPlanners(
  userId: string,
  create: Planner[],
  update: Planner[],
  destroy: Planner[],
  createEvent: SimpleEvent[],
  updateEvent: SimpleEvent[],
  destroyEvent: SimpleEvent[]
) {
  try {
    const operations = [];

    // === Planner: CREATE ===
    if (create.length) {
      const plannerCreateData = create.map((planner) => ({
        id: planner.id,
        title: planner.title,
        parentId: planner.parentId ?? null,
        type: planner.type ?? null,
        isReady: planner.isReady ?? false,
        duration: planner.duration ?? null,
        deadline: planner.deadline ?? null,
        starts: planner.starts ?? null,
        dependency: planner.dependency ?? null,
        completed: planner.completed ?? null,
        userId,
      }));

      operations.push(
        db.planner.createMany({
          data: plannerCreateData,
          skipDuplicates: true,
        })
      );
    }

    // === Planner: UPDATE ===
    for (const planner of update) {
      operations.push(
        db.planner.update({
          where: { id: planner.id },
          data: {
            title: planner.title,
            parentId: planner.parentId ?? null,
            type: planner.type ?? null,
            isReady: planner.isReady ?? false,
            duration: planner.duration ?? null,
            deadline: planner.deadline ?? null,
            starts: planner.starts ?? null,
            dependency: planner.dependency ?? null,
            completed: planner.completed ?? null,
            userId,
          },
        })
      );
    }

    // === Planner: DELETE ===
    if (destroy.length) {
      operations.push(
        db.planner.deleteMany({
          where: { id: { in: destroy.map((p) => p.id) } },
        })
      );
    }

    // === CalendarEvent: CREATE ===
    if (createEvent.length) {
      const calendarCreateData = createEvent.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        rrule: event.rrule ?? null,
        userId, // Injected
      }));

      operations.push(
        db.calendarEvent.createMany({
          data: calendarCreateData,
          skipDuplicates: true,
        })
      );
    }

    // === CalendarEvent: UPDATE ===
    for (const event of updateEvent) {
      operations.push(
        db.calendarEvent.update({
          where: { id: event.id },
          data: {
            title: event.title,
            start: event.start,
            end: event.end,
            rrule: event.rrule ?? null,
            userId, // If userId is editable
          },
        })
      );
    }

    // === CalendarEvent: DELETE ===
    if (destroyEvent.length) {
      operations.push(
        db.calendarEvent.deleteMany({
          where: { id: { in: destroyEvent.map((e) => e.id) } },
        })
      );
    }

    // === Execute transaction ===
    const response = await db.$transaction(operations);

    console.log(response);

    return response;
  } catch (error) {
    console.error("Failed to sync planner and calendar data:", error);
    throw error;
  }
}
