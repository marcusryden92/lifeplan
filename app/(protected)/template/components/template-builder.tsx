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
} from "@/utils/template-builder-utils";
import { SimpleEvent } from "@/utils/calendar-generation";
import {
  handleSelect,
  handleEventResize,
  handleEventDrop,
  handleEventCopy,
  handleEventDelete,
  handleEventEdit,
} from "@/utils/calendar-event-handlers";
import EventContent from "@/components/events/event-content";

interface TemplateBuilderProps {
  templateEvents: SimpleEvent[];
  setTemplateEvents: React.Dispatch<React.SetStateAction<SimpleEvent[]>>;
}

export default function TemplateBuilder({
  templateEvents,
  setTemplateEvents,
}: TemplateBuilderProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const { currentTemplate, setCurrentTemplate, weekStartDay } =
    useDataContext();

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
        setCurrentTemplate(newTemplate);
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
        handleSelect(calendarRef, setTemplateEvents, selectInfo)
      }
      eventResize={(resizeInfo) =>
        handleEventResize(setTemplateEvents, resizeInfo)
      }
      eventDrop={(dropInfo) => handleEventDrop(setTemplateEvents, dropInfo)}
      allDaySlot={false}
      dayHeaderFormat={{ weekday: "short" }}
      eventContent={({ event }: any) => (
        <EventContent
          event={event}
          onEdit={() =>
            handleEventEdit(
              calendarRef,
              setTemplateEvents,
              templateEvents,
              event.id
            )
          }
          onCopy={() => handleEventCopy(calendarRef, setTemplateEvents, event)}
          onDelete={() =>
            handleEventDelete(calendarRef, setTemplateEvents, event.id)
          }
          showButtons={true} // Adjust based on your needs
        />
      )}
    />
  );
}
