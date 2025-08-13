"use client";

import { useRef, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCalendarProvider } from "@/context/CalendarProvider";

import {
  getTemplateFromCalendar,
  populateTemplateCalendar,
} from "@/utils/templateBuilderUtils";
import { SimpleEvent } from "@/prisma/generated/client";
import {
  handleSelect,
  handleEventResize,
  handleEventDrop,
  handleEventCopy,
  handleEventDelete,
  handleEventEdit,
} from "@/utils/calendarEventHandlers";
import EventContent from "@/components/events/EventContent";
import { ExtendedEventContentArg } from "@/types/calendarTypes";
import { transformEventsForFullCalendar } from "@/utils/calendarUtils";

interface TemplateBuilderProps {
  templateEvents: SimpleEvent[];
  updateTemplateArrayEvents: React.Dispatch<
    React.SetStateAction<SimpleEvent[]>
  >;
}

export default function TemplateBuilder({
  templateEvents,
  updateTemplateArrayEvents,
}: TemplateBuilderProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const { userId, template, updateTemplateArray, weekStartDay } =
    useCalendarProvider();

  const fullcalendarEvents = useMemo(() => {
    return transformEventsForFullCalendar(templateEvents);
  }, [templateEvents]);

  useEffect(() => {
    if (template && template.length > 0 && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const events = calendarApi.getEvents().map((e) => e.toPlainObject());
      const newCalendar = populateTemplateCalendar(
        userId,
        weekStartDay,
        template
      );

      if (JSON.stringify(events) !== JSON.stringify(newCalendar)) {
        updateTemplateArrayEvents(newCalendar);
      }
    }
  }, [template]);

  useEffect(() => {
    updateTemplate();
  }, [fullcalendarEvents]);

  const updateTemplate = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const events = calendarApi.getEvents();
      const newTemplate = getTemplateFromCalendar(userId, events);

      if (JSON.stringify(template) !== JSON.stringify(newTemplate)) {
        updateTemplateArray(newTemplate);
      }
    }
  };

  return (
    <FullCalendar
      initialDate={new Date(2024, 0, 1)}
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      events={fullcalendarEvents}
      initialView="timeGridWeek"
      firstDay={weekStartDay}
      height={"100%"}
      eventColor="royalblue"
      headerToolbar={{
        start: "",
        center: "",
        end: "",
      }}
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
      editable={true}
      eventResizableFromStart={true}
      selectable={true}
      select={(selectInfo) =>
        handleSelect(
          userId,
          calendarRef,
          updateTemplateArrayEvents,
          selectInfo,
          true
        )
      }
      eventResize={(resizeInfo) =>
        handleEventResize(updateTemplateArrayEvents, resizeInfo)
      }
      eventDrop={(dropInfo) =>
        handleEventDrop(updateTemplateArrayEvents, dropInfo)
      }
      allDaySlot={false}
      dayHeaderFormat={{ weekday: "short" }}
      eventContent={({ event }: ExtendedEventContentArg) => {
        const simpleEvent = templateEvents.find((t) => t.id === event.id);
        return (
          simpleEvent && (
            <EventContent
              event={simpleEvent}
              onEdit={() =>
                handleEventEdit(
                  calendarRef,
                  updateTemplateArrayEvents,
                  templateEvents,
                  event.id
                )
              }
              onCopy={() =>
                handleEventCopy(
                  calendarRef,
                  updateTemplateArrayEvents,
                  simpleEvent
                )
              }
              onDelete={() =>
                handleEventDelete(
                  calendarRef,
                  updateTemplateArrayEvents,
                  event.id
                )
              }
              showButtons={true}
            />
          )
        );
      }}
    />
  );
}
