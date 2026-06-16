// EventContent.tsx
import { Check, ArrowRight, Trash2 } from "lucide-react";

import { useRef, useState } from "react";

import { useCalendarProvider } from "@/context/CalendarProvider";
import { floorMinutes } from "@/utils/calendarUtils";
import EventPopover from "./EventPopover";
import EventWrapper from "./EventWrapper";
import { EventImpl } from "@fullcalendar/core/internal";
import {
  handleClickCompleteTask,
  handleClickDelete,
  handlePostponeTask,
} from "@/utils/calendarEventHandlers";
import { PlannerType } from "@/types/prisma";

interface EventContentProps {
  event: EventImpl;
}

const EventContent: React.FC<EventContentProps> = ({ event }) => {
  const { planner, updateAll, calendar, userSettings } = useCalendarProvider();
  const { plannerType, parentId, completedStartTime, completedEndTime } =
    event.extendedProps;
  const elementRef = useRef<HTMLDivElement>(null);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [eventRect, setEventRect] = useState<DOMRect | null>(null);
  const [onHover, setOnHover] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(
    !!(completedStartTime && completedEndTime) || false,
  );

  if (!event.start || !event.end) return null;

  const currentTime = new Date();
  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  const green = userSettings.styles.events.completedColor;
  const red = userSettings.styles.events.errorColor;

  const displayPostponeButton =
    !isCompleted && floorMinutes(currentTime) > floorMinutes(startTime);

  const onDelete = () => {
    handleClickDelete(
      event,
      elementRef,
      calendar,
      updateAll,
      plannerType as string,
      (parentId as string) ?? null,
      red,
      setShowPopover,
    );
  };

  const onComplete = () => {
    handleClickCompleteTask(
      event,
      isCompleted,
      setIsCompleted,
      elementRef,
      planner,
      calendar,
      updateAll,
      green,
    );
  };

  const onPostpone = () => handlePostponeTask(event, calendar, updateAll);

  return (
    <EventWrapper
      event={event}
      elementRef={elementRef}
      elementHeight={elementHeight}
      elementWidth={elementWidth}
      setElementHeight={setElementHeight}
      setElementWidth={setElementWidth}
      setOnHover={setOnHover}
      setEventRect={setEventRect}
      isCompleted={isCompleted}
      showPopover={showPopover}
      setShowPopover={setShowPopover}
    >
      {onHover &&
        elementHeight > 40 &&
        elementWidth > 70 &&
        !event.extendedProps.isTemplateItem && (
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              onClick={onDelete}
              style={{
                display: "inline-flex",
                padding: 2,
                color: "inherit",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              aria-label="Delete"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {(event.extendedProps.plannerType === PlannerType.goal ||
                event.extendedProps.plannerType === PlannerType.task) && (
                <>
                  <button
                    onClick={onComplete}
                    style={{
                      display: "inline-flex",
                      padding: 2,
                      color: "inherit",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                    aria-label="Complete"
                  >
                    <Check size={14} strokeWidth={2.2} />
                  </button>
                  <button
                    disabled={!displayPostponeButton}
                    onClick={onPostpone}
                    style={{
                      display: "inline-flex",
                      padding: 2,
                      color: "inherit",
                      background: "transparent",
                      border: "none",
                      cursor: displayPostponeButton ? "pointer" : "not-allowed",
                      opacity: displayPostponeButton ? 1 : 0.5,
                    }}
                    aria-label="Postpone"
                  >
                    <ArrowRight size={14} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      {showPopover && eventRect && (
        <EventPopover
          event={event}
          eventRect={eventRect}
          startTime={startTime}
          endTime={endTime}
          isCompleted={isCompleted}
          displayPostponeButton={displayPostponeButton}
          onClose={() => setShowPopover(false)}
          onDelete={onDelete}
          onComplete={onComplete}
          onPostpone={onPostpone}
          setShowPopover={setShowPopover}
        />
      )}
    </EventWrapper>
  );
};

export default EventContent;
