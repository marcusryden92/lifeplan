import FullCalendar from "@fullcalendar/react";
import { DateSelectArg, EventDropArg } from "@fullcalendar/core/index.js";
import { EventResizeStartArg } from "@fullcalendar/interaction/index.js";
import { EventTemplate } from "@/prisma/generated/client";
import { calendarColors } from "@/data/calendarColors";

import { getWeekdayFromDate } from "../calendarUtils";

import { getTimeFromDate } from "../templateBuilderUtils";

import { v4 as uuidv4 } from "uuid";
import { EventImpl } from "@fullcalendar/core/internal";

export const handleTemplateSelect = (
  userId: string | undefined,
  calendarRef: React.RefObject<FullCalendar>,
  updateTemplateArray: React.Dispatch<React.SetStateAction<EventTemplate[]>>,
  selectInfo: DateSelectArg
) => {
  const { start, end } = selectInfo;
  const title = prompt("Enter event title:", "New Event");

  const startDay = getWeekdayFromDate(start);
  const startTime = getTimeFromDate(start);

  if (userId && title && calendarRef.current) {
    const now = new Date();

    // Calculate duration in minutes
    const durationMinutes = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60)
    );

    // Create new EventTemplate object
    const newEvent: EventTemplate = {
      userId: userId,
      title,
      id: uuidv4(),
      startDay, // Assuming startDate is a Date object
      startTime, // Assuming startDate is a Date object
      duration: durationMinutes, // Add duration in minutes
      color: calendarColors[0],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    updateTemplateArray((prevEvents) => [...prevEvents, newEvent]);
  }
};

export const handleTemplateEventResize = (
  updateTemplateArray: React.Dispatch<React.SetStateAction<EventTemplate[]>>,
  resizeInfo: EventResizeStartArg
) => {
  const { event }: EventResizeStartArg = resizeInfo;

  const startDate = event.start;
  const endDate = event.end;

  if (!startDate || !endDate) return;

  updateTemplateArray((prevEvents) =>
    prevEvents.map((ev) => {
      if (ev.id !== event.id) {
        console.log("error");
        return ev;
      }

      // Calculate duration in minutes
      const duration = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60)
      );

      return {
        ...ev,
        startDay: getWeekdayFromDate(startDate),
        startTime: getTimeFromDate(startDate),
        duration,
      };
    })
  );
};

export const handleTemplateEventDrop = (
  updateTemplateArray: React.Dispatch<React.SetStateAction<EventTemplate[]>>,
  dropInfo: EventDropArg
) => {
  const { event } = dropInfo;

  const startDate = event.start;
  const endDate = event.end;

  if (!startDate || !endDate) return;

  updateTemplateArray((prevEvents) =>
    prevEvents.map((ev) => {
      if (ev.id !== event.id) return ev;

      // Calculate duration in minutes
      const duration = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60)
      );

      return {
        ...ev,
        startDay: getWeekdayFromDate(startDate),
        startTime: getTimeFromDate(startDate),
        duration,
      };
    })
  );
};

export const handleTemplateEventCopy = (
  updateTemplateArray: React.Dispatch<React.SetStateAction<EventTemplate[]>>,
  event: EventImpl,
  userId: string
) => {
  const now = new Date();

  if (!event.start || !event.end)
    throw new Error(
      "Missing event.start or event.end in handleTemplateEventCopy"
    );

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  // Calculate duration in minutes
  const duration = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  );

  // Create new EventTemplate object
  const newEvent: EventTemplate = {
    userId: userId,
    title: event.title,
    id: uuidv4(),
    startDay: getWeekdayFromDate(startDate), // Assuming startDate is a Date object
    startTime: getTimeFromDate(startDate), // Assuming startDate is a Date object
    duration, // Add duration in minutes
    color: event.backgroundColor,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  updateTemplateArray((prevEvents) => [...prevEvents, newEvent]);
};

export const handleTemplateEventDelete = (
  updateTemplateArray: React.Dispatch<React.SetStateAction<EventTemplate[]>>,
  eventId: string
) => {
  updateTemplateArray((prevEvents) =>
    prevEvents.filter((ev) => ev.id !== eventId)
  );
};

export const handleTemplateEventEdit = (
  updateTemplateArray: React.Dispatch<React.SetStateAction<EventTemplate[]>>,
  eventTitle: string,
  eventId: string
) => {
  updateTemplateArray((prevEvents) =>
    prevEvents.map((ev) =>
      ev.id === eventId ? { ...ev, title: eventTitle } : ev
    )
  );
};
