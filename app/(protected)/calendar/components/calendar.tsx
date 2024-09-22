"use client";

import { useRef, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import EventContent from "@/components/events/event-content";

import { SimpleEvent } from "@/utils/calendar-generation";
import {
  handleSelect,
  handleEventResize,
  handleEventDrop,
  handleEventCopy,
  handleEventDelete,
  handleEventEdit,
} from "@/utils/calendar-event-handlers";

const EVENT_INTERACTION_ENABLED = false; // Constant to enable/disable event interaction

interface CalendarProps {
  initialEvents?: SimpleEvent[] | undefined;
}

export default function Calendar({ initialEvents }: CalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<SimpleEvent[]>(initialEvents || []);

  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  return (
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      events={events}
      initialView="timeGridWeek"
      allDaySlot={false}
      firstDay={1}
      nowIndicator={true}
      height={"100%"}
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
      select={(selectInfo) => handleSelect(calendarRef, setEvents, selectInfo)}
      eventResize={(resizeInfo) => handleEventResize(setEvents, resizeInfo)}
      eventDrop={(dropInfo) => handleEventDrop(setEvents, dropInfo)}
      eventContent={({ event }: any) => (
        <EventContent
          event={event}
          onEdit={() =>
            handleEventEdit(calendarRef, setEvents, events, event.id)
          }
          onCopy={() => handleEventCopy(calendarRef, setEvents, event)}
          onDelete={() => handleEventDelete(calendarRef, setEvents, event.id)}
          showButtons={EVENT_INTERACTION_ENABLED}
        />
      )}
    />
  );
}
