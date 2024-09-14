"use client";

import { useRef, useState, useEffect, useContext } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // Required for selectable behavior
import { useDataContext } from "@/context/DataContext";

import {
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

import { getTemplateFromCalendar } from "@/utils/template-builder-functions";
import { generateCalendar } from "@/utils/calendar-generation";

import { EventTemplate } from "@/utils/template-builder-functions";
import { SimpleEvent } from "@/utils/calendar-generation";

// Define the types for the events
interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO 8601 string format for FullCalendar
  end: string; // ISO 8601 string format for FullCalendar
}

interface TemplateBuilderProps {
  templateEvents: SimpleEvent[];
  setTemplateEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>;
}

export default function TemplateBuilder({
  templateEvents,
  setTemplateEvents,
}: TemplateBuilderProps) {
  const calendarRef = useRef<FullCalendar>(null);

  const { currentTemplate, setCurrentTemplate } = useDataContext();

  useEffect(() => {
    if (currentTemplate && currentTemplate.length > 0 && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();

      const events = calendarApi.getEvents();
      const newCalendar = generateCalendar(currentTemplate);

      if (JSON.stringify(events) != JSON.stringify(newCalendar))
        setTemplateEvents(newCalendar);
    }
  }, [currentTemplate]);

  useEffect(() => {
    updateTemplate();
  }, [templateEvents]);

  const updateTemplate = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const events = calendarApi.getEvents();
      const newTemplate = getTemplateFromCalendar(events);

      // Only update if template has actually changed
      if (JSON.stringify(currentTemplate) !== JSON.stringify(newTemplate)) {
        setCurrentTemplate(newTemplate);
      }
    }
  };

  const handleSelect = async (selectInfo: any) => {
    const { start, end, allDay } = selectInfo;

    const title = prompt("Enter event title:", "New Event");

    if (title) {
      const newEvent = {
        id: Date.now().toString(), // Generate a unique ID
        title,
        start,
        end,
        allDay,
      };
      // Update the templateEvents state to keep it in sync
      setTemplateEvents((prevEvents) => [...prevEvents, newEvent]);
    }
  };

  // Handle event resize
  const handleEventResize = (resizeInfo: any) => {
    const { event } = resizeInfo;

    // Update event in state
    setTemplateEvents((prevEvents) =>
      prevEvents.map((ev) =>
        ev.id === event.id ? { ...ev, start: event.start, end: event.end } : ev
      )
    );
  };

  // Handle event drop (dragging events)
  const handleEventDrop = (dropInfo: any) => {
    const { event } = dropInfo;

    // Update event in state
    setTemplateEvents((prevEvents) =>
      prevEvents.map((ev) =>
        ev.id === event.id ? { ...ev, start: event.start, end: event.end } : ev
      )
    );
  };

  // Handle event copy
  const handleEventCopy = (event: any) => {
    // Create a new event with the same details but a new ID
    const newEvent = {
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      id: Date.now().toString(), // Generate a new ID for the copied event
    };

    // Check if calendarRef.current is not null
    if (calendarRef.current) {
      // Access the calendar's API using the reference
      const calendarApi = calendarRef.current.getApi();
      calendarApi.addEvent(newEvent);
      setTemplateEvents((prevEvents) => [...prevEvents, newEvent]);
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
        setTemplateEvents((prevEvents) =>
          prevEvents.filter((ev) => ev.id !== eventId)
        );
      }
    }
  };

  // Handle event edit
  const handleEventEdit = (eventId: string) => {
    // Find the event and prompt user to edit the title
    if (templateEvents) {
      const event = templateEvents.find((ev) => ev.id === eventId);

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
          setTemplateEvents((prevEvents) =>
            prevEvents.map((ev) =>
              ev.id === eventId ? { ...ev, title: newTitle } : ev
            )
          );
        }
      }
    }
  };

  return (
    <FullCalendar
      ref={calendarRef} // Attach the reference to FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} // Add interaction plugin
      events={templateEvents}
      initialView="timeGridWeek"
      firstDay={1} // Set week to start on Monday
      height={"100%"} // Set calendar height
      eventColor="royalblue"
      headerToolbar={{
        start: "", // Hide previous and next buttons
        center: "", // Show only title
        end: "", // Hide today button
      }}
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
      allDaySlot={false}
      dayHeaderFormat={{ weekday: "short" }}
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
    />
  );
}
