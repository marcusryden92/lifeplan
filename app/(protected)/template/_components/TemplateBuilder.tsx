"use client";

import { useRef, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useDataContext } from "@/context/DataContext";

import {
  getTemplateFromCalendar,
  populateTemplateCalendar,
} from "@/utils/templateBuilderUtils";
import { SimpleEvent } from "@prisma/client";
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

import { arraysAreEqual } from "@/utils/generalUtils";

interface TemplateBuilderProps {
  templateEvents: SimpleEvent[];
  setTemplateEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>;
}

export default function TemplateBuilder({
  templateEvents,
  setTemplateEvents,
}: TemplateBuilderProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const { userId, currentTemplate, setMainPlanner, weekStartDay } =
    useDataContext();

  const fullcalendarEvents = useMemo(() => {
    return transformEventsForFullCalendar(templateEvents);
  }, [templateEvents]);

  useEffect(() => {
    if (currentTemplate && currentTemplate.length > 0 && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const events = calendarApi.getEvents().map((e) => e.toPlainObject());
      const newCalendar = populateTemplateCalendar(
        userId,
        weekStartDay,
        currentTemplate
      );

      if (!arraysAreEqual(events, newCalendar)) {
        setTemplateEvents(newCalendar);
      }
    }
  }, [currentTemplate]);

  useEffect(() => {
    updateTemplate();
  }, [fullcalendarEvents]);

  const updateTemplate = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const events = calendarApi.getEvents();
      const newTemplate = getTemplateFromCalendar(userId, events);

      if (!arraysAreEqual(currentTemplate, newTemplate)) {
        setMainPlanner(undefined, undefined, newTemplate);
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
        handleSelect(userId, calendarRef, setTemplateEvents, selectInfo, true)
      }
      eventResize={(resizeInfo) =>
        handleEventResize(setTemplateEvents, resizeInfo)
      }
      eventDrop={(dropInfo) => handleEventDrop(setTemplateEvents, dropInfo)}
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
                  setTemplateEvents,
                  templateEvents,
                  event.id
                )
              }
              onCopy={() =>
                handleEventCopy(calendarRef, setTemplateEvents, simpleEvent)
              }
              onDelete={() =>
                handleEventDelete(calendarRef, setTemplateEvents, event.id)
              }
              showButtons={true}
            />
          )
        );
      }}
    />
  );
}
