"use client";

import { useRef, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // Required for selectable behavior

import {
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

// Constant to enable/disable event interaction
const EVENT_INTERACTION_ENABLED = false;

// Define the types for the events
interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO 8601 string format for FullCalendar
  end: string; // ISO 8601 string format for FullCalendar
}

// Props interface for the Calendar component
interface CalendarProps {
  initialEvents?: CalendarEvent[] | undefined;
}

export default function Calendar({ initialEvents }: CalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents || []); // State to manage events

  // Sync state with prop changes
  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Handle the selection of a time range (dragging to create a new event)
  const handleSelect = (selectInfo: any) => {
    if (!EVENT_INTERACTION_ENABLED) return; // Disable interaction if the flag is false

    const { start, end, allDay } = selectInfo;
    const title = prompt("Enter event title:", "New Event");

    if (title && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const newEvent: CalendarEvent = {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        id: Date.now().toString(),
      };
      calendarApi.addEvent(newEvent);
      setEvents((prevEvents) => [...prevEvents, newEvent]);
    }
  };

  // Handle event resize
  const handleEventResize = (resizeInfo: any) => {
    if (!EVENT_INTERACTION_ENABLED) return;

    const { event } = resizeInfo;
    setEvents((prevEvents) =>
      prevEvents.map((ev) =>
        ev.id === event.id
          ? {
              ...ev,
              start: event.start.toISOString(),
              end: event.end.toISOString(),
            }
          : ev
      )
    );
  };

  // Handle event drop (dragging events)
  const handleEventDrop = (dropInfo: any) => {
    if (!EVENT_INTERACTION_ENABLED) return;

    const { event } = dropInfo;
    setEvents((prevEvents) =>
      prevEvents.map((ev) =>
        ev.id === event.id
          ? {
              ...ev,
              start: event.start.toISOString(),
              end: event.end.toISOString(),
            }
          : ev
      )
    );
  };

  // Handle event copy
  const handleEventCopy = (event: CalendarEvent) => {
    if (!EVENT_INTERACTION_ENABLED) return;

    const newEvent: CalendarEvent = {
      title: event.title,
      start: event.start,
      end: event.end,
      id: Date.now().toString(),
    };

    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.addEvent(newEvent);
      setEvents((prevEvents) => [...prevEvents, newEvent]);
    }
  };

  // Handle event delete
  const handleEventDelete = (eventId: string) => {
    if (!EVENT_INTERACTION_ENABLED) return;

    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const event = calendarApi.getEvents().find((ev) => ev.id === eventId);
      if (event) {
        event.remove();
        setEvents((prevEvents) => prevEvents.filter((ev) => ev.id !== eventId));
      }
    }
  };

  // Handle event edit
  const handleEventEdit = (eventId: string) => {
    if (!EVENT_INTERACTION_ENABLED) return;

    const event = events.find((ev) => ev.id === eventId);
    if (event) {
      const newTitle = prompt("Enter new title:", event.title);
      if (newTitle && calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        const fullCalendarEvent = calendarApi
          .getEvents()
          .find((ev) => ev.id === eventId);
        if (fullCalendarEvent) {
          fullCalendarEvent.setProp("title", newTitle);
        }
        setEvents((prevEvents) =>
          prevEvents.map((ev) =>
            ev.id === eventId ? { ...ev, title: newTitle } : ev
          )
        );
      }
    }
  };

  return (
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      allDaySlot={false}
      firstDay={1}
      height={"85%"}
      slotLabelFormat={{
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }}
      eventTimeFormat={{
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }}
      editable={EVENT_INTERACTION_ENABLED}
      eventResizableFromStart={EVENT_INTERACTION_ENABLED}
      selectable={EVENT_INTERACTION_ENABLED}
      select={handleSelect}
      eventResize={handleEventResize}
      eventDrop={handleEventDrop}
      eventContent={({ event }: any) => (
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <span className="p-1" style={{ marginBottom: "auto" }}>
            {event.title}
          </span>

          {EVENT_INTERACTION_ENABLED ? (
            <div
              className="m-1"
              style={{ display: "flex", justifyContent: "flex-end" }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventEdit(event.id);
                }}
                style={{ marginLeft: "10px" }}
              >
                <PencilIcon height="1rem" width="1rem" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventCopy(event);
                }}
                style={{ marginLeft: "10px" }}
              >
                <DocumentDuplicateIcon height="1rem" width="1rem" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventDelete(event.id);
                }}
                style={{ marginLeft: "10px" }}
              >
                <TrashIcon height="1rem" width="1rem" />
              </button>
            </div>
          ) : (
            ""
          )}
        </div>
      )}
      events={events}
    />
  );
}
