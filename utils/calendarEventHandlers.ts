// calendarEventHandlers.ts

import FullCalendar from "@fullcalendar/react";
import { SimpleEvent } from "@/prisma/generated/client";
import {
  DateSelectArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core/index.js";
import { EventResizeStartArg } from "@fullcalendar/interaction/index.js";

export const handleSelect = (
  userId: string | undefined,
  calendarRef: React.RefObject<FullCalendar>,
  setEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
  selectInfo: DateSelectArg,
  isTemplateItem: boolean
) => {
  const { start, end } = selectInfo;
  const title = prompt("Enter event title:", "New Event");

  if (userId && title && calendarRef.current) {
    const calendarApi = calendarRef.current.getApi();
    const newEvent: SimpleEvent = {
      userId,
      title,
      start: start,
      end: end,
      id: Date.now().toString(),
      isTemplateItem: isTemplateItem,
      rrule: null,
      backgroundColor: "#007BFF",
      borderColor: "#000000",
      duration: null,
      createdAt: null,
      updatedAt: null,
    };

    calendarApi.addEvent(newEvent as EventInput);
    setEvents((prevEvents) => [...prevEvents, newEvent]);
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
            start: event.start ? event.start : ev.start,
            end: event.end ? event.end : ev.end,
          }
        : ev
    )
  );
};

export const handleEventDrop = (
  setEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
  dropInfo: EventDropArg
) => {
  const { event } = dropInfo;

  setEvents((prevEvents) =>
    prevEvents.map((ev) =>
      ev.id === event.id
        ? {
            ...ev,
            start: event.start ? event.start : ev.start,
            end: event.end ? event.end : ev.end,
          }
        : ev
    )
  );
};

export const handleEventCopy = (
  calendarRef: React.RefObject<FullCalendar>,
  setEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
  event: SimpleEvent,
  userId?: string
) => {
  if (userId && calendarRef.current) {
    const newEvent: SimpleEvent = {
      userId,
      title: event.title,
      start: event.start,
      end: event.end,
      id: Date.now().toString(),
      isTemplateItem: event.isTemplateItem,
      rrule: null,
      backgroundColor: "#007BFF",
      borderColor: "#000000",
      duration: null,
      createdAt: null,
      updatedAt: null,
    };

    const calendarApi = calendarRef.current.getApi();
    calendarApi.addEvent(newEvent as EventInput);
    setEvents((prevEvents) => [...prevEvents, newEvent]);
  }
};

export const handleEventDelete = (
  calendarRef: React.RefObject<FullCalendar>,
  setEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
  eventId: string
) => {
  if (calendarRef.current) {
    const calendarApi = calendarRef.current.getApi();
    const event = calendarApi.getEvents().find((ev) => ev.id === eventId);
    if (event) {
      event.remove();
      setEvents((prevEvents) => prevEvents.filter((ev) => ev.id !== eventId));
    }
  }
};

export const handleEventEdit = (
  calendarRef: React.RefObject<FullCalendar>,
  setEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
  events: SimpleEvent[],
  eventId: string
) => {
  const event = events.find((ev) => ev.id === eventId);
  if (event) {
    const newTitle = prompt("Enter new title:", event.title);
    if (newTitle && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const fullEvent = calendarApi.getEvents().find((ev) => ev.id === eventId);
      if (fullEvent) {
        fullEvent.setProp("title", newTitle);
      }
      setEvents((prevEvents) =>
        prevEvents.map((ev) =>
          ev.id === eventId ? { ...ev, title: newTitle } : ev
        )
      );
    }
  }
};
