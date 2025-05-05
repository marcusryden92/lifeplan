"use client";

import { useRef, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import RRulePlugin from "@fullcalendar/rrule";
import luxonPlugin from "@fullcalendar/luxon";

import EventContent from "@/components/events/EventContent";

import { SimpleEvent } from "@/types/calendarTypes";
import {
  handleSelect,
  handleEventResize,
  handleEventDrop,
  handleEventCopy,
  handleEventDelete,
  handleEventEdit,
} from "@/utils/calendarEventHandlers";
import { EventContentArg } from "@fullcalendar/core/index.js";

const EVENT_INTERACTION_ENABLED = false; // Constant to enable/disable event interaction

interface CalendarProps {
  initialEvents?: SimpleEvent[] | undefined;
  initialDate: Date;
}

export default function Calendar({
  initialEvents,
  initialDate,
}: CalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<SimpleEvent[]>(initialEvents || []);

  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents);

      console.log("initialEvents");
      console.log(initialEvents);
    }
  }, [initialEvents]);

  return (
    <>
      {events?.length > 0 && (
        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            RRulePlugin,
            luxonPlugin,
          ]}
          key={initialDate.getTime()}
          initialDate={initialDate}
          timeZone={"local"}
          events={events}
          initialView="timeGridWeek"
          scrollTime={"05:00:00"}
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
          select={(selectInfo) =>
            handleSelect(calendarRef, setEvents, selectInfo, false)
          }
          headerToolbar={false}
          eventResize={(resizeInfo) => handleEventResize(setEvents, resizeInfo)}
          eventDrop={(dropInfo) => handleEventDrop(setEvents, dropInfo)}
          eventContent={({ event }: EventContentArg) => {
            const simpleEvent = initialEvents?.find((e) => e.id === event.id);
            return (
              simpleEvent && (
                <EventContent
                  event={simpleEvent}
                  onEdit={() =>
                    handleEventEdit(
                      calendarRef,
                      setEvents,
                      events,
                      simpleEvent.id
                    )
                  }
                  onCopy={() =>
                    handleEventCopy(calendarRef, setEvents, simpleEvent)
                  }
                  onDelete={() =>
                    handleEventDelete(calendarRef, setEvents, simpleEvent.id)
                  }
                  showButtons={EVENT_INTERACTION_ENABLED}
                />
              )
            );
          }}
        />
      )}
    </>
  );
}
