"use client";

import { useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useDataContext } from "@/context/DataContext";

import {
  getTemplateFromCalendar,
  populateTemplateCalendar,
} from "@/utils/templateBuilderUtils";
import { SimpleEvent } from "@/types/calendarTypes";
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

interface TemplateBuilderProps {
  templateEvents: SimpleEvent[];
  setTemplateEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>;
}

export default function TemplateBuilder({
  templateEvents,
  setTemplateEvents,
}: TemplateBuilderProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const { currentTemplate, setMainPlanner, weekStartDay } = useDataContext();

  useEffect(() => {
    if (currentTemplate && currentTemplate.length > 0 && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const events = calendarApi.getEvents();
      const newCalendar = populateTemplateCalendar(
        weekStartDay,
        currentTemplate
      );

      if (JSON.stringify(events) !== JSON.stringify(newCalendar)) {
        setTemplateEvents(newCalendar);
      }
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

      if (JSON.stringify(currentTemplate) !== JSON.stringify(newTemplate)) {
        setMainPlanner(undefined, undefined, newTemplate);
      }
    }
  };

  return (
    <FullCalendar
      initialDate={new Date(2024, 0, 1)}
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      events={templateEvents}
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
        handleSelect(calendarRef, setTemplateEvents, selectInfo, true)
      }
      eventResize={(resizeInfo) =>
        handleEventResize(setTemplateEvents, resizeInfo)
      }
      eventDrop={(dropInfo) => handleEventDrop(setTemplateEvents, dropInfo)}
      allDaySlot={false}
      dayHeaderFormat={{ weekday: "short" }}
      eventContent={({ event }: ExtendedEventContentArg) => {
        const simpleEvent = templateEvents?.find((e) => e.id === event.id);

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
              showButtons={true} // Adjust based on your needs
            />
          )
        );
      }}
    />
  );
}
