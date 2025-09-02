import FullCalendar from "@fullcalendar/react";
import { SimpleEvent, Planner, EventTemplate } from "@/prisma/generated/client";
import { DateSelectArg, EventDropArg } from "@fullcalendar/core/index.js";
import { EventResizeStartArg } from "@fullcalendar/interaction/index.js";
import { EventImpl } from "@fullcalendar/core/internal";
import { v4 as uuidv4 } from "uuid";
import React from "react";
import { deleteGoal } from "./goalPageHandlers";
import { getDuration } from "./calendarUtils";
import { assert } from "./assert/assert";

export const handleSelect = (
  userId: string | undefined,
  calendarRef: React.RefObject<FullCalendar>,
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  selectInfo: DateSelectArg
) => {
  const { start, end } = selectInfo;
  const title = prompt("Enter event title:", "New Event");

  const now = new Date();

  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

  if (userId && title) {
    const newEvent: Planner = {
      id: uuidv4(),
      title,
      parentId: null,
      itemType: "plan",
      isReady: true,
      duration,
      deadline: null,
      starts: start.toISOString(),
      dependency: null,
      completedStartTime: null,
      completedEndTime: null,
      userId,
      color: "black",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    updatePlannerArray((prevEvents) => [...prevEvents, newEvent]);
  }
};

export const handleEventResize = (
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[])
  ) => void,
  resizeInfo: EventResizeStartArg
) => {
  const { event } = resizeInfo;

  assert(event, "Event undefined in handleEventResize");
  assert(event.start, "Event.start undefined in handleEventResize");
  assert(event.end, "Event.end undefined in handleEventResize");

  const start = event.start;
  const end = event.end;

  updateAll(
    (prevPlanner) =>
      prevPlanner.map((p) =>
        p.id === event.id ? { ...p, duration: getDuration(start, end) } : p
      ),
    (prevEvents) =>
      prevEvents.map((ev) =>
        ev.id === event.id
          ? {
              ...ev,
              start: event.start ? event.start.toISOString() : ev.start,
              end: event.end ? event.end.toISOString() : ev.end,
            }
          : ev
      )
  );
};

export const handleEventDrop = (
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  dropInfo: EventDropArg
) => {
  const { event } = dropInfo;

  updatePlannerArray((prevEvents) =>
    prevEvents.map((ev) =>
      ev.id === event.id
        ? {
            ...ev,
            starts: event.start?.toISOString() || ev.starts,
          }
        : ev
    )
  );
};

export const handleEventCopy = (
  event: EventImpl,
  updateAll: (
    planner?: Planner[] | ((prev: Planner[]) => Planner[]),
    calendar?: SimpleEvent[] | ((prev: SimpleEvent[]) => SimpleEvent[]),
    template?: EventTemplate[] | ((prev: EventTemplate[]) => EventTemplate[])
  ) => void
) => {
  assert(event, "Event undefined in handleEventCopy");
  assert(event.start, "Event.start undefined in handleEventCopy");
  assert(event.end, "Event.end undefined in handleEventCopy");

  if (event.extendedProps.ItemType === "goal")
    throw new Error("Can't copy goal in handleEventCopy");

  const now = new Date().toISOString();

  updateAll((prevPlanner) => {
    const item = prevPlanner.find((p) => p.id === event.id);

    return item
      ? [
          ...prevPlanner,
          {
            ...item,
            id: uuidv4(),
            completedStartTime: null,
            completedEndTime: null,
            createdAt: now,
            updatedAt: now,
          },
        ]
      : prevPlanner;
  });
};

export const handleEventDelete = (
  planner: Planner[],
  updateAll: (
    arg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => void,
  eventId: string
) => {
  const task = planner.find((t) => t.id === eventId);

  if (!task) return;

  const parentId = task.parentId ?? null;

  if (task.itemType === "task" || task.itemType === "plan") {
    updateAll((prev) => prev.filter((t) => t.id !== eventId));
  } else if (task.itemType === "goal") {
    deleteGoal({
      updateAll,
      taskId: eventId,
      parentId,
    });
  }
};

export const handleUpdateTitle = (
  title: string,
  setTitle: React.Dispatch<React.SetStateAction<string>>,
  taskId: string,
  calendar: SimpleEvent[],
  updateAll: (
    arg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => void
) => {
  // Update the title in the calendar event
  const updatedEvents = calendar?.map((calEvent) => {
    if (calEvent.id === taskId) {
      return { ...calEvent, title: title };
    }
    return calEvent;
  });

  if (updatedEvents) updateAll((prev) => prev, updatedEvents);

  updateAll((prev) =>
    prev.map((item) => {
      if (item.id === taskId) {
        return { ...item, title };
      }
      return item;
    })
  );

  setTitle(title);
};
