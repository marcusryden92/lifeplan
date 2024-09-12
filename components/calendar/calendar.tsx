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
  const [copiedEvent, setCopiedEvent] = useState<CalendarEvent | null>(null); // State to store copied event

  // Sync state with prop changes
  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Handle the selection of a time range (dragging to create a new event)
  const handleSelect = (selectInfo: any) => {
    const { start, end, allDay } = selectInfo;

    // Prompt user for event title
    const title = prompt("Enter event title:", "New Event");

    if (title) {
      // Check if calendarRef.current is not null
      if (calendarRef.current) {
        // Access the calendar's API using the reference
        const calendarApi = calendarRef.current.getApi();

        // Create a new event
        const newEvent: CalendarEvent = {
          title,
          start: start.toISOString(),
          end: end.toISOString(),
          id: Date.now().toString(), // Generate a new ID for the event
        };

        // Add the new event to the calendar and state
        calendarApi.addEvent(newEvent);
        setEvents((prevEvents) => [...prevEvents, newEvent]);
      }
    }
  };

  // Handle event resize
  const handleEventResize = (resizeInfo: any) => {
    const { event } = resizeInfo;

    // Update event in state
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
    const { event } = dropInfo;

    // Update event in state
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
    // Create a new event with the same details but a new ID
    const newEvent: CalendarEvent = {
      title: event.title,
      start: event.start,
      end: event.end,
      id: Date.now().toString(), // Generate a new ID for the copied event
    };

    // Check if calendarRef.current is not null
    if (calendarRef.current) {
      // Access the calendar's API using the reference
      const calendarApi = calendarRef.current.getApi();
      calendarApi.addEvent(newEvent);
      setEvents((prevEvents) => [...prevEvents, newEvent]);
    }
  };

  // Handle event delete
  const handleEventDelete = (eventId: string) => {
    // Check if calendarRef.current is not null
    if (calendarRef.current) {
      // Access the calendar's API using the reference
      const calendarApi = calendarRef.current.getApi();
      const event = calendarApi.getEvents().find((ev) => ev.id === eventId);
      if (event) {
        // Remove the event from the calendar and state
        event.remove();
        setEvents((prevEvents) => prevEvents.filter((ev) => ev.id !== eventId));
      }
    }
  };

  // Handle event edit
  const handleEventEdit = (eventId: string) => {
    // Find the event and prompt user to edit the title
    const event = events.find((ev) => ev.id === eventId);
    if (event) {
      const newTitle = prompt("Enter new title:", event.title);
      if (newTitle) {
        // Update the event
        if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          const fullCalendarEvent = calendarApi
            .getEvents()
            .find((ev) => ev.id === eventId);
          if (fullCalendarEvent) {
            fullCalendarEvent.setProp("title", newTitle);
          }
        }
        // Update the state
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
      ref={calendarRef} // Attach the reference to FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} // Add interaction plugin
      initialView="timeGridWeek"
      allDaySlot={false}
      firstDay={1} // Set week to start on Monday
      height={"85%"} // Set calendar height
      slotLabelFormat={{
        hour: "2-digit",
        minute: "2-digit",
        hour12: false, // 24-hour format for the time slots
      }}
      eventTimeFormat={{
        hour: "2-digit",
        minute: "2-digit",
        hour12: false, // 24-hour format for the events
      }}
      editable={true} // Enable event dragging and resizing
      eventResizableFromStart={true} // Allow resizing from start
      selectable={true} // Enable selection to create events
      select={handleSelect} // Callback when a selection is made
      eventResize={handleEventResize} // Callback when an event is resized
      eventDrop={handleEventDrop} // Callback when an event is dropped
      eventContent={({ event }: any) => (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%", // Ensure the div takes full height
          }}
        >
          <span className="p-1" style={{ marginBottom: "auto" }}>
            {event.title}
          </span>{" "}
          {/* Title on top */}
          <div
            className="m-1"
            style={{ display: "flex", justifyContent: "flex-end" }}
          >
            {" "}
            {/* Buttons container aligned to bottom right */}
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
        </div>
      )}
      events={events} // Pass the events to FullCalendar
    />
  );
}
