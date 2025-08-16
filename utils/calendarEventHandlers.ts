import FullCalendar from "@fullcalendar/react";
import { SimpleEvent } from "@/prisma/generated/client";
import {
  DateSelectArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core/index.js";
import { EventResizeStartArg } from "@fullcalendar/interaction/index.js";
import { EventImpl } from "@fullcalendar/core/internal";

export const handleSelect = (
  userId: string | undefined,
  calendarRef: React.RefObject<FullCalendar>,
  setEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
  selectInfo: DateSelectArg
) => {
  const { start, end } = selectInfo;
  const title = prompt("Enter event title:", "New Event");

  const now = new Date();

  if (userId && title && calendarRef.current) {
    const calendarApi = calendarRef.current.getApi();
    const newEvent: SimpleEvent = {
      userId,
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      id: Date.now().toString(),
      extendedProps_isTemplateItem: false,
      rrule: null,
      backgroundColor: "#007BFF",
      borderColor: "#000000",
      duration: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
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
            start: event.start ? event.start.toISOString() : ev.start,
            end: event.end ? event.end.toISOString() : ev.end,
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
            start: event.start ? event.start.toISOString() : ev.start,
            end: event.end ? event.end.toISOString() : ev.end,
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
      extendedProps_isTemplateItem: false,
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
