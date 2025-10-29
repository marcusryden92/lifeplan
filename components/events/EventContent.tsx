// EventContent.tsx
import {
  CheckIcon,
  ArrowRightIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

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

interface EventContentProps {
  event: EventImpl;
}

const EventContent: React.FC<EventContentProps> = ({ event }) => {
  const { planner, updateAll, calendar, userSettings } = useCalendarProvider();
  const { itemType, parentId, completedStartTime, completedEndTime } =
    event.extendedProps;
  const elementRef = useRef<HTMLDivElement>(null);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [eventRect, setEventRect] = useState<DOMRect | null>(null);
  const [onHover, setOnHover] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(
    !!(completedStartTime && completedEndTime) || false
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
      itemType as string,
      (parentId as string) ?? null,
      red,
      setShowPopover
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
      green
    );
  };

  const onPostpone = () => handlePostponeTask(event, calendar, updateAll);

  return (
    <EventWrapper
      event={event}
      elementRef={elementRef}
      elementHeight={elementHeight}
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
            }}
          >
            <>
              <div
                className="m-1 ml-0"
                style={{ display: "flex", justifyContent: "flex-end" }}
              >
                <button onClick={onDelete}>
                  <TrashIcon height="1rem" width="1rem" />
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {!event.extendedProps.isTemplateItem &&
                  (event.extendedProps.itemType === "goal" ||
                    event.extendedProps.itemType === "task") && (
                    <>
                      <button
                        onClick={onComplete}
                        style={{ marginLeft: "10px" }}
                      >
                        <CheckIcon height="1rem" width="1rem" />
                      </button>

                      <button
                        disabled={!displayPostponeButton}
                        onClick={onPostpone}
                        style={{
                          marginLeft: "10px",
                          opacity: displayPostponeButton ? "100%" : "50%",
                        }}
                      >
                        <ArrowRightIcon height="1rem" width="1rem" />
                      </button>
                    </>
                  )}
              </div>
            </>
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
