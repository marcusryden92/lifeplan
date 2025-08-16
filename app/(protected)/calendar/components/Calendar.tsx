"use client";

import { useRef, useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import RRulePlugin from "@fullcalendar/rrule";
import luxonPlugin from "@fullcalendar/luxon";

import EventContent from "@/components/events/EventContent";
import TemplateEventContent from "@/components/events/TemplateEventContent";

import { SimpleEvent } from "@/prisma/generated/client";
import type { EventInput } from "@fullcalendar/core/index.js";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { transformEventsForFullCalendar } from "@/utils/calendarUtils";

import {
  handleSelect,
  handleEventResize,
  handleEventDrop,
  handleEventCopy,
  handleEventDelete,
  handleEventEdit,
} from "@/utils/calendarEventHandlers";

import {
  handleTemplateEventCopy,
  handleTemplateEventDelete,
  handleTemplateEventEdit,
} from "@/utils/template-handlers/templateEventHandlers";
import { EventImpl } from "@fullcalendar/core/internal";

const EVENT_INTERACTION_ENABLED = false; // Constant to enable/disable event interaction

interface CalendarProps {
  initialEvents?: SimpleEvent[] | undefined;
  fullCalendarEvents?: EventInput[] | undefined;
  initialDate: Date;
}

export default function Calendar({
  initialEvents,
  initialDate,
}: CalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<SimpleEvent[]>(initialEvents || []);
  const { userId, calendar, updateTemplateArray } = useCalendarProvider();

  /* Transform SimpleEvent calendar to EventInput for FullCalendar */
  const fullCalendarEvents: EventInput[] = useMemo(() => {
    const newCal: EventInput[] = calendar
      ? transformEventsForFullCalendar(calendar)
      : [];

    return newCal;
  }, [calendar]);

  return (
    <>
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
        events={fullCalendarEvents}
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
          handleSelect(userId, calendarRef, setEvents, selectInfo)
        }
        headerToolbar={false}
        eventResize={(resizeInfo) => handleEventResize(setEvents, resizeInfo)}
        eventDrop={(dropInfo) => handleEventDrop(setEvents, dropInfo)}
        eventContent={({ event }: { event: EventImpl }) => {
          return (
            event &&
            (!event.extendedProps.isTemplateItem ? (
              <EventContent
                event={event}
                onEdit={() =>
                  handleEventEdit(calendarRef, setEvents, events, event.id)
                }
                onCopy={() => handleEventCopy(calendarRef, setEvents, event)}
                onDelete={() =>
                  handleEventDelete(calendarRef, setEvents, event.id)
                }
                showButtons={EVENT_INTERACTION_ENABLED}
              />
            ) : (
              <TemplateEventContent
                event={event}
                onEditTitle={handleTemplateEventEdit}
                onCopy={() =>
                  handleTemplateEventCopy(updateTemplateArray, event, userId)
                }
                onDelete={() =>
                  handleTemplateEventDelete(updateTemplateArray, event.id)
                }
                showButtons={true}
              />
            ))
          );
        }}
      />
    </>
  );
}
