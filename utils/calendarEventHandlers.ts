import FullCalendar from "@fullcalendar/react";
import { SimpleEvent, Planner, ItemType } from "@/prisma/generated/client";
import {
  DateSelectArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core/index.js";
import { EventResizeStartArg } from "@fullcalendar/interaction/index.js";
import { EventImpl } from "@fullcalendar/core/internal";
import { v4 as uuidv4 } from "uuid";
import React, { SetStateAction } from "react";
import { deleteGoal } from "./goalPageHandlers";

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
  setEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
  resizeInfo: EventResizeStartArg
) => {
  const { event } = resizeInfo;
  setEvents((prevEvents) =>
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
  calendarRef: React.RefObject<FullCalendar>,
  setEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
  event: EventImpl,
  userId?: string
) => {
  if (!event.start || !event.end)
    throw new Error("event.start or event.end missing in handleEventCopy");

  if (userId && calendarRef.current) {
    const now = new Date();

    const newEvent: SimpleEvent = {
      userId,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      id: Date.now().toString(),
      extendedProps_itemType: event.extendedProps.itemType as ItemType,
      extendedProps_completedEndTime: null,
      extendedProps_completedStartTime: null,
      extendedProps_parentId:
        typeof event.extendedProps.parentId === "string"
          ? event.extendedProps.parentId
          : null,
      rrule: null,
      backgroundColor: "#007BFF",
      borderColor: "#000000",
      duration: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const calendarApi = calendarRef.current.getApi();
    calendarApi.addEvent(newEvent as EventInput);
    setEvents((prevEvents) => [...prevEvents, newEvent]);
  }
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
