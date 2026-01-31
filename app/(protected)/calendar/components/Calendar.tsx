"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import RRulePlugin from "@fullcalendar/rrule";
import luxonPlugin from "@fullcalendar/luxon";

import EventContent from "@/components/events/EventContent";
import TemplateEventContent from "@/components/events/TemplateEventContent";
import TravelEventContent from "@/components/events/TravelEventContent";
import { CategoryWrapperEvent } from "@/components/events/CategoryWrapperEvent";

import type { EventInput } from "@fullcalendar/core/index.js";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { transformEventsForFullCalendar } from "@/utils/calendarUtils";

import {
  handleSelect,
  handleEventResize,
  handleEventDrop,
} from "@/utils/calendarEventHandlers";

import {
  handleTemplateEventCopy,
  handleTemplateEventDelete,
  handleTemplateEventEdit,
} from "@/utils/template-handlers/templateEventHandlers";
import { EventImpl } from "@fullcalendar/core/internal";
import { RuntimeEventExtendedProps } from "@/types/ui";

const EVENT_INTERACTION_ENABLED = true; // Constant to enable/disable event interaction

interface CalendarProps {
  fullCalendarEvents?: EventInput[] | undefined;
  initialDate: Date;
  onCategoryHover?: (
    categoryName: string | null,
    categoryColor: string | null,
  ) => void;
}

export default function Calendar({
  initialDate,
  onCategoryHover,
}: CalendarProps) {
  const {
    userId,
    calendar,
    updateTemplateArray,
    updatePlannerArray,
    updateAll,
  } = useCalendarProvider();

  /* Transform SimpleEvent calendar to EventInput for FullCalendar */
  const fullCalendarEvents: EventInput[] = useMemo(() => {
    return calendar ? transformEventsForFullCalendar(calendar) : [];
    // Note: Category wrappers are now background events, and items with categoryWrapperId
    // are rendered as regular foreground events on top of them
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
        snapDuration={"00:05:00"}
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
        eventOrder={"-duration,start"}
        editable={EVENT_INTERACTION_ENABLED}
        eventResizableFromStart={EVENT_INTERACTION_ENABLED}
        selectable={EVENT_INTERACTION_ENABLED}
        select={(selectInfo) =>
          handleSelect(userId, updatePlannerArray, selectInfo)
        }
        headerToolbar={false}
        eventResize={(resizeInfo) => handleEventResize(updateAll, resizeInfo)}
        eventDrop={(dropInfo) => handleEventDrop(updatePlannerArray, dropInfo)}
        eventContent={({ event }: { event: EventImpl }) => {
          const itemType = (
            event.extendedProps as RuntimeEventExtendedProps | undefined
          )?.itemType;

          if (itemType === "category") {
            const ext = event.extendedProps as
              | RuntimeEventExtendedProps
              | undefined;
            const categoryId = ext?.categoryId || "";
            const isStrict = !!ext?.isStrict;
            const wrapperId = ext?.wrapperId || "";

            return (
              <CategoryWrapperEvent
                categoryId={categoryId}
                categoryName={event.title}
                categoryColor={event.backgroundColor}
                isStrict={isStrict}
                start={event.start || new Date()}
                end={event.end || new Date()}
                wrapperId={wrapperId}
                onHover={onCategoryHover}
              >
                {/* Children items will be rendered inside the wrapper */}
              </CategoryWrapperEvent>
            );
          }

          if (itemType === "template") {
            return (
              <TemplateEventContent
                event={event}
                onEditTitle={handleTemplateEventEdit}
                onCopy={() =>
                  handleTemplateEventCopy(updateTemplateArray, event, userId)
                }
                onDelete={() =>
                  handleTemplateEventDelete(updateTemplateArray, event.id)
                }
                disableInteraction
              />
            );
          }

          if (itemType === "travel") {
            return <TravelEventContent event={event} />;
          }

          return <EventContent event={event} />;
        }}
      />
    </>
  );
}
