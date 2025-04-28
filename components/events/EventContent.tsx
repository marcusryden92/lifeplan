// EventContent.tsx
import {
  CheckIcon,
  ArrowRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { useRef, useState, useEffect } from "react";

import { SimpleEvent } from "@/types/calendarTypes";
import { useDataContext } from "@/context/DataContext";
import { taskIsCompleted, setTaskAsCompleted } from "@/utils/taskHelpers";
import { floorMinutes } from "@/utils/calendarUtils";
import { deleteGoal } from "@/utils/goalPageHandlers";
import { deletePlanner } from "@/utils/plannerUtils";
import EventPopover from "./EventPopover";

const formatTime = (date: Date) => {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

interface EventContentProps {
  event: SimpleEvent;
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
  const { mainPlanner, setMainPlanner, updateCalendar, currentCalendar } =
    useDataContext();

  const elementRef = useRef<HTMLDivElement>(null);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [eventRect, setEventRect] = useState<DOMRect | null>(null);
  const [updatedTitle, setUpdatedTitle] = useState<string>(event.title);

  useEffect(() => {
    const parentElement = elementRef.current?.closest(
      ".fc-event"
    ) as HTMLElement;
    if (parentElement) {
      setElementHeight(parentElement.offsetHeight);
      setElementWidth(parentElement.offsetWidth);

      // Apply sky-500 border when popover is open
      if (showPopover) {
        parentElement.style.outline = "1px solid #0ea5e9"; // sky-500
        parentElement.style.outlineOffset = "0px";
        parentElement.style.zIndex = "30"; // Ensure event is above others
      } else {
        parentElement.style.outline = "none";
        parentElement.style.outlineOffset = "0";
        parentElement.style.zIndex = ""; // Reset to default
      }
    }

    if (elementHeight < 20 && parentElement) {
      parentElement.style.padding = "0px";
    }
  }, [elementHeight, showPopover]);

  const task = mainPlanner.find((task) => task.id === event.id);
  const [onHover, setOnHover] = useState<boolean>(false);

  const currentTime = new Date();
  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  const [isCompleted, setIsCompleted] = useState(
    task ? taskIsCompleted(task) : false
  );

  const displayPostponeButton =
    !isCompleted && floorMinutes(currentTime) > floorMinutes(startTime);

  const green = "#0ebf7e";
  const orange = "#f59e0b";
  const red = "#ef4444";

  const handleClickCompleteTask = () => {
    const parentElement = elementRef.current?.closest(
      ".fc-event"
    ) as HTMLElement;
    const color = !isCompleted ? green : orange;

    if (parentElement) {
      parentElement.style.backgroundColor = color;
      parentElement.style.border = `solid 2px ${color}`;
    }

    if (isCompleted) {
      setIsCompleted(false);
      const updated = mainPlanner.map((item) =>
        item.id === event.id ? { ...item, completed: undefined } : item
      );
      setMainPlanner(updated);
    } else {
      setIsCompleted(true);
      setTimeout(() => {
        setTaskAsCompleted(
          setMainPlanner,
          updateCalendar,
          currentCalendar,
          event
        );
      }, 500);
    }
  };

  const handlePostponeTask = () => {
    const updatedCalendar = currentCalendar?.filter(
      (e) => !(e.id === event.id)
    );
    if (updatedCalendar) updateCalendar(undefined, updatedCalendar);
  };

  const handleClickDelete = () => {
    const parentElement = elementRef.current?.closest(
      ".fc-event"
    ) as HTMLElement;
    if (parentElement) {
      parentElement.style.backgroundColor = red;
      parentElement.style.border = `solid 2px ${red}`;
    }

    const updatedCalendar = currentCalendar?.filter(
      (e) => !(e.id === task?.id)
    );

    setTimeout(() => {
      if (task?.type === "goal") {
        deleteGoal({
          setMainPlanner,
          taskId: task.id,
          parentId: task.parentId,
          manuallyUpdatedCalendar: updatedCalendar,
        });
      } else if (task) {
        deletePlanner(setMainPlanner, task.id, updatedCalendar);
      }
    }, 500);

    setShowPopover(false);
  };

  const handleUpdateTitle = (newTitle: string) => {
    // Update the title in the calendar event
    const updatedEvents = currentCalendar?.map((calEvent) => {
      if (calEvent.id === event.id) {
        return { ...calEvent, title: newTitle };
      }
      return calEvent;
    });

    if (updatedEvents) updateCalendar(undefined, updatedEvents);

    // Update the title in the planner
    const updatedPlanner = mainPlanner.map((item) => {
      if (item.id === event.id) {
        return { ...item, title: newTitle };
      }
      return item;
    });

    setMainPlanner(updatedPlanner);
    setUpdatedTitle(newTitle);
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
        padding: "0px",
      }}
      onMouseEnter={() => setOnHover(true)}
      onMouseLeave={() => setOnHover(false)}
      onDoubleClick={handleDoubleClick}
    >
      <span className="flex gap-2 justify-between">
        <span
          style={{
            marginBottom: "auto",
            fontSize: elementHeight > 20 ? "0.8rem" : "0.5rem",
          }}
        >
          {updatedTitle}
        </span>
        <span
          className="flex gap-2"
          style={{
            fontSize: elementHeight > 20 ? "0.8rem" : "0.5rem",
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
                  <XMarkIcon height="1rem" width="1rem" />
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {!event.extendedProps?.isTemplateItem &&
                  (task?.type === "goal" || task?.type === "task") && (
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
          event={{ ...event, title: updatedTitle }}
          task={task}
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
          onUpdateTitle={handleUpdateTitle}
        />
      )}
    </div>
  );
};

export default EventContent;
