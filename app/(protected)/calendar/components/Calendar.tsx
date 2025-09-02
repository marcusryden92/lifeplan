"use client";

import { useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import RRulePlugin from "@fullcalendar/rrule";
import luxonPlugin from "@fullcalendar/luxon";

import EventContent from "@/components/events/EventContent";
import TemplateEventContent from "@/components/events/TemplateEventContent";

import type { EventInput } from "@fullcalendar/core/index.js";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { transformEventsForFullCalendar } from "@/utils/calendarUtils";

import {
  handleSelect,
  handleEventResize,
  handleEventDrop,
  handleEventDelete,
} from "@/utils/calendarEventHandlers";

import {
  handleTemplateEventCopy,
  handleTemplateEventDelete,
  handleTemplateEventEdit,
} from "@/utils/template-handlers/templateEventHandlers";
import { EventImpl } from "@fullcalendar/core/internal";

const EVENT_INTERACTION_ENABLED = true; // Constant to enable/disable event interaction

interface CalendarProps {
  fullCalendarEvents?: EventInput[] | undefined;
  initialDate: Date;
}

export default function Calendar({ initialDate }: CalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const {
    userId,
    calendar,
    planner,
    updateTemplateArray,
    updatePlannerArray,
    updateAll,
  } = useCalendarProvider();

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
          handleSelect(userId, calendarRef, updatePlannerArray, selectInfo)
        }
        headerToolbar={false}
        eventResize={(resizeInfo) => handleEventResize(updateAll, resizeInfo)}
        eventDrop={(dropInfo) => handleEventDrop(updatePlannerArray, dropInfo)}
        eventContent={({ event }: { event: EventImpl }) => {
          return (
            event &&
            (!event.extendedProps.isTemplateItem ? (
              <EventContent
                event={event}
                onDelete={() =>
                  handleEventDelete(planner, updatePlannerArray, event.id)
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
