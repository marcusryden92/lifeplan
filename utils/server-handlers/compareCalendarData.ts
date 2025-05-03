import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "../eventUtils";
import { objectsAreEqual } from "../generalUtils";
import { syncCalendarData } from "@/actions/calendar-actions/syncCalendarData";

export async function handleServerTransaction(
  userId: string,
  mainPlanner: Planner[],
  previousPlanner: { current: Planner[] },
  currentCalendar: SimpleEvent[],
  previousCalendar: { current: SimpleEvent[] }
) {
  const { create, update, destroy, createEvent, updateEvent, destroyEvent } =
    compareCalendarData(
      mainPlanner,
      previousPlanner,
      currentCalendar,
      previousCalendar
    );

  const response = syncCalendarData(
    userId,
    create,
    update,
    destroy,
    createEvent,
    updateEvent,
    destroyEvent
  );

  return response;
}

export function compareCalendarData(
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
  const calendarMap = new Map(
    currentCalendar.map((event) => [event.id, event])
  );
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

  return {
    create,
    update,
    destroy,
    createEvent,
    updateEvent,
    destroyEvent,
  };
}
