// calendarEventHandlers.ts

import FullCalendar from "@fullcalendar/react";
import { SimpleEvent } from "@prisma/client";
import { DateSelectArg, EventDropArg } from "@fullcalendar/core/index.js";
import { EventResizeStartArg } from "@fullcalendar/interaction/index.js";

export const handleSelect = (
  calendarRef: React.RefObject<FullCalendar>,
  setEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
  selectInfo: DateSelectArg,
  isTemplateItem: boolean
) => {
  const { start, end } = selectInfo;
  const title = prompt("Enter event title:", "New Event");

  if (title && calendarRef.current) {
    const calendarApi = calendarRef.current.getApi();
    const newEvent: SimpleEvent = {
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      id: Date.now().toString(),
      extendedProps: { isTemplateItem },
    };
    calendarApi.addEvent(newEvent);
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
  event: SimpleEvent
) => {
  const newEvent: SimpleEvent = {
    title: event.title,
    start: event.start,
    end: event.end,
    id: Date.now().toString(),
    extendedProps: { isTemplateItem: event.extendedProps.isTemplateItem },
  };

  if (calendarRef.current) {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.addEvent(newEvent);
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
