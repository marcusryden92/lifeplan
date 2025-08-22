// EventContent.tsx
import {
  CheckIcon,
  ArrowRightIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { useRef, useState, useLayoutEffect } from "react";

import { useCalendarProvider } from "@/context/CalendarProvider";
import { getPlannerAndCalendarForCompletedTask } from "@/utils/taskHelpers";
import { floorMinutes } from "@/utils/calendarUtils";
import { deleteGoal } from "@/utils/goalPageHandlers";
import EventPopover from "./EventPopover";
import { EventImpl } from "@fullcalendar/core/internal";

const formatTime = (date: Date) => {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

interface EventContentProps {
  event: EventImpl;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  showButtons: boolean;
}

const EventContent: React.FC<EventContentProps> = ({
  event,
  onEdit,
  onCopy,
}) => {
  const { planner, updateAll, calendar, userSettings } = useCalendarProvider();

  const elementRef = useRef<HTMLDivElement>(null);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [eventRect, setEventRect] = useState<DOMRect | null>(null);

  const { itemType, parentId, completedStartTime, completedEndTime } =
    event.extendedProps;

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (element) {
      setElementHeight(element.offsetHeight);
      setElementWidth(element.offsetWidth);

      // Set z-index when opening popover
      if (showPopover) {
        element.style.zIndex = "30"; // Ensure event is above others
      } else {
        element.style.zIndex = ""; // Reset to default
      }
    }
  }, [elementHeight, showPopover]);

  const [onHover, setOnHover] = useState<boolean>(false);

  const [isCompleted, setIsCompleted] = useState<boolean>(
    !!(completedStartTime && completedEndTime) || false
  );

  if (!event.start || !event.end) return null;

  const currentTime = new Date();
  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  const displayPostponeButton =
    !isCompleted && floorMinutes(currentTime) > floorMinutes(startTime);

  const green = "#0ebf7e";
  const red = "#ef4444";

  const handleClickCompleteTask = () => {
    // Set the element to green for a second, before rerendering
    const element = elementRef.current;

    if (!event || !element) return;

    const color = !isCompleted
      ? green
      : (event.extendedProps.backgroundColor as string);

    console.log(color);

    if (element && color) {
      element.style.backgroundColor = color;
    }

    // If already completed, set completed to undefined
    if (isCompleted) {
      setIsCompleted(false);

      const updatedPlanner = planner.map((item) =>
        item.id === event.id
          ? {
              ...item,
              completedStartTime: null,
              completedEndTime: null,
            }
          : item
      );

      updateAll(updatedPlanner);
    }

    // If not completed, update the planner with the
    // new values, and calculate a new calendar from that
    else {
      setIsCompleted(true);
      setTimeout(() => {
        const result = getPlannerAndCalendarForCompletedTask(
          planner,
          calendar,
          event
        );

        if (result) {
          const { manuallyUpdatedTaskArray, manuallyUpdatedCalendar } = result;

          updateAll(
            (prev) => manuallyUpdatedTaskArray || prev,
            manuallyUpdatedCalendar
          );
        }
      }, 500);
    }
  };

  const handlePostponeTask = () => {
    const updatedCalendar = calendar?.filter((e) => !(e.id === event.id));
    if (updatedCalendar) updateAll((prev) => prev, updatedCalendar);
  };

  const handleClickDelete = () => {
    const element = elementRef.current;

    if (element) {
      element.style.backgroundColor = red;
      element.style.border = `solid 2px ${red}`;
    }

    const updatedCalendar = calendar?.filter((e) => !(e.id === event?.id));

    setTimeout(() => {
      if (itemType === "goal") {
        deleteGoal({
          updateAll,
          taskId: event.id,
          parentId: typeof parentId === "string" ? parentId : null,
          manuallyUpdatedCalendar: updatedCalendar,
        });
      } else {
        updateAll((prev) => prev.filter((t) => t.id !== event.id));
      }
    }, 500);

    setShowPopover(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up

    // Get and store the element rect for popover positioning
    if (elementRef.current) {
      setEventRect(elementRef.current.getBoundingClientRect());
      setShowPopover(true);
    }
  };

  return (
    <div
      ref={elementRef}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        padding: "8px",
        borderRadius: userSettings.styles.events.borderRadius,
        backgroundColor: event.backgroundColor,
        borderLeft: userSettings.styles.calendar.event.borderLeft,
      }}
      onMouseEnter={() => setOnHover(true)}
      onMouseLeave={() => setOnHover(false)}
      onDoubleClick={handleDoubleClick}
    >
      <span
        className="flex gap-2 justify-between"
        style={{ borderBottom: showPopover ? "4px dotted white" : "" }}
      >
        <span
          style={{
            marginBottom: "auto",
            fontSize: elementHeight > 20 ? "0.8rem" : "0.5rem",
            fontWeight: "bold",
          }}
        >
          {event.title}
        </span>
        <span
          className="flex gap-2"
          style={{
            fontSize: elementHeight > 20 ? "0.8rem" : "0.5rem",
            fontWeight: "bold",
          }}
        >
          <span>{formatTime(startTime)}</span>
          <span>{formatTime(endTime)}</span>
        </span>
      </span>
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
                <button onClick={handleClickDelete}>
                  <TrashIcon height="1rem" width="1rem" />
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {!event.extendedProps.isTemplateItem &&
                  (event.extendedProps.itemType === "goal" ||
                    event.extendedProps.itemType === "task") && (
                    <>
                      <button
                        onClick={handleClickCompleteTask}
                        style={{ marginLeft: "10px" }}
                      >
                        <CheckIcon height="1rem" width="1rem" />
                      </button>

                      <button
                        disabled={!displayPostponeButton}
                        onClick={handlePostponeTask}
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

      {/* Render popover as a portal with its own positioning logic */}
      {showPopover && eventRect && (
        <EventPopover
          event={event}
          eventRect={eventRect}
          startTime={startTime}
          endTime={endTime}
          isCompleted={isCompleted}
          displayPostponeButton={displayPostponeButton}
          onClose={() => setShowPopover(false)}
          onEdit={() => {
            setShowPopover(false);
            onEdit();
          }}
          onCopy={() => {
            setShowPopover(false);
            onCopy();
          }}
          onDelete={handleClickDelete}
          onComplete={handleClickCompleteTask}
          onPostpone={handlePostponeTask}
        />
      )}
    </div>
  );
};

export default EventContent;
