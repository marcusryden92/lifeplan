"use client";

import { useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCalendarProvider } from "@/context/CalendarProvider";

import { populateTemplateCalendar } from "@/utils/templateBuilderUtils";

import {
  handleTemplateSelect,
  handleTemplateEventResize,
  handleTemplateEventDrop,
  handleTemplateEventCopy,
  handleTemplateEventDelete,
  handleTemplateEventEdit,
} from "@/utils/template-handlers/templateEventHandlers";
import TemplateEventContent from "@/components/events/TemplateEventContent";

export default function TemplateBuilder() {
  const calendarRef = useRef<FullCalendar>(null);
  const { userId, template, updateTemplateArray, weekStartDay } =
    useCalendarProvider();

  const fullcalendarEvents = useMemo(() => {
    return populateTemplateCalendar(userId, weekStartDay, template);
  }, [template]);

  return (
    <FullCalendar
      initialDate={new Date(2024, 0, 1)}
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      events={fullcalendarEvents}
      initialView="timeGridWeek"
      firstDay={weekStartDay}
      height={"100%"}
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
        handleTemplateSelect(
          userId,
          calendarRef,
          updateTemplateArray,
          selectInfo
        )
      }
      eventResize={(resizeInfo) =>
        handleTemplateEventResize(updateTemplateArray, resizeInfo)
      }
      eventDrop={(dropInfo) =>
        handleTemplateEventDrop(updateTemplateArray, dropInfo)
      }
      allDaySlot={false}
      dayHeaderFormat={{ weekday: "short" }}
      eventContent={({ event }) => {
        return (
          event && (
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
          )
        );
      }}
    />
  );
}
