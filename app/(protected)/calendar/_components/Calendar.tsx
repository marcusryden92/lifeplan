"use client";

import { useMemo, useRef, useState } from "react";
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
  createPlanFromSelection,
  handleEventResize,
  handleEventDrop,
} from "@/utils/calendarEventHandlers";
import { NewPlanModal } from "@/components/events/NewPlanModal";
import type FullCalendarComponent from "@fullcalendar/react";

import {
  handleTemplateEventCopy,
  handleTemplateEventDelete,
  handleTemplateEventEdit,
} from "@/utils/template-handlers/templateEventHandlers";
import { EventImpl } from "@fullcalendar/core/internal";
import { RuntimeEventExtendedProps } from "@/types/ui";
import { EventType } from "@/types/prisma";

const EVENT_INTERACTION_ENABLED = true;

interface CalendarProps {
  fullCalendarEvents?: EventInput[] | undefined;
  initialDate: Date;
  onCategoryHover?: (
    categoryName: string | null,
    categoryColor: string | null,
  ) => void;
  dayHeaderContent?: React.ComponentProps<typeof FullCalendar>["dayHeaderContent"];
}

export default function Calendar({
  initialDate,
  onCategoryHover,
  dayHeaderContent,
}: CalendarProps) {
  const {
    userId,
    calendar,
    updateTemplateArray,
    updatePlannerArray,
    updateAll,
  } = useCalendarProvider();

  const calendarRef = useRef<FullCalendarComponent>(null);
  const [pendingPlan, setPendingPlan] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const fullCalendarEvents: EventInput[] = useMemo(() => {
    return calendar ? transformEventsForFullCalendar(calendar) : [];
  }, [calendar]);

  return (
    <>
      <FullCalendar
        ref={calendarRef}
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
        snapDuration={"00:00:01"}
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
        dayHeaderContent={dayHeaderContent}
        editable={EVENT_INTERACTION_ENABLED}
        eventResizableFromStart={EVENT_INTERACTION_ENABLED}
        selectable={EVENT_INTERACTION_ENABLED}
        select={(selectInfo) =>
          setPendingPlan({ start: selectInfo.start, end: selectInfo.end })
        }
        headerToolbar={false}
        eventResize={(resizeInfo) => handleEventResize(updateAll, resizeInfo)}
        eventDrop={(dropInfo) => handleEventDrop(updatePlannerArray, dropInfo)}
        eventContent={({ event }: { event: EventImpl }) => {
          const eventType = (
            event.extendedProps as RuntimeEventExtendedProps | undefined
          )?.eventType;

          if (eventType === EventType.category) {
            const ext = event.extendedProps as
              | (RuntimeEventExtendedProps & {
                  categoryName?: string;
                  categoryColor?: string | null;
                })
              | undefined;
            const categoryId = ext?.categoryId || "";
            const isStrict = !!ext?.isStrict;
            const wrapperId = ext?.wrapperId || "";
            const trespassingStart = !!ext?.trespassingStart;
            const trespassingEnd = !!ext?.trespassingEnd;
            // Clean name from extendedProps ("Work"), not event.title
            // ("Work Time Slot") — so the header hover chip matches what
            // items inside the category show.
            const cleanCategoryName = ext?.categoryName ?? event.title;
            const rawCategoryColor = ext?.categoryColor ?? null;
            return (
              <CategoryWrapperEvent
                categoryId={categoryId}
                categoryName={cleanCategoryName}
                categoryColor={rawCategoryColor}
                isStrict={isStrict}
                start={event.start || new Date()}
                end={event.end || new Date()}
                wrapperId={wrapperId}
                trespassingStart={trespassingStart}
                trespassingEnd={trespassingEnd}
                onHover={onCategoryHover}
              />
            );
          }

          if (eventType === EventType.template) {
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
                hideHoverButtons
              />
            );
          }

          if (eventType === EventType.travel) {
            return <TravelEventContent event={event} />;
          }

          return <EventContent event={event} />;
        }}
      />
      <NewPlanModal
        open={pendingPlan !== null}
        start={pendingPlan?.start ?? null}
        end={pendingPlan?.end ?? null}
        onCancel={() => {
          setPendingPlan(null);
          calendarRef.current?.getApi().unselect();
        }}
        onCreate={(title) => {
          if (pendingPlan) {
            createPlanFromSelection(
              userId,
              updatePlannerArray,
              pendingPlan.start,
              pendingPlan.end,
              title,
            );
          }
          setPendingPlan(null);
          calendarRef.current?.getApi().unselect();
        }}
      />
    </>
  );
}
