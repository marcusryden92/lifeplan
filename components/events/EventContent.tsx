// EventContent.tsx
import {
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  CheckIcon,
  ArrowRightCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

import { useRef, useState } from "react";

import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "@/types/calendarTypes";
import { useDataContext } from "@/context/DataContext";
import { taskIsCompleted, setTaskAsCompleted } from "@/utils/taskHelpers";
import { floorMinutes } from "@/utils/calendarUtils";

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
  onDelete,
  showButtons,
}) => {
  const { mainPlanner, setMainPlanner, updateCalendar, currentCalendar } =
    useDataContext();
  const elementRef = useRef<HTMLDivElement>(null);
  const task = mainPlanner.find((task) => task.id === event.id);

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

  const handleClickCompleteTask = () => {
    const color = !isCompleted ? green : orange;

    // Find the DOM element for this event and change color directly
    const el = elementRef.current?.closest(".fc-event") as HTMLElement;
    if (el) {
      el.style.backgroundColor = color;
      el.style.border = `solid 2px ${color}`;
    }

    if (isCompleted) {
      setIsCompleted(!isCompleted);

      // Remove the event from currentCalendar
      const manuallyUpdatedCalendar: SimpleEvent[] | undefined =
        currentCalendar?.filter((e) => !(e.id === event.id));

      // Create a new mainPlanner instance where item.completed is undefined
      const manuallyUpdatedTaskArray: Planner[] | undefined = mainPlanner.map(
        (item: Planner) =>
          item.id === event.id ? { ...item, completed: undefined } : item
      );

      if (manuallyUpdatedCalendar)
        // Update mainPlanner with the new information while also updating
        // the calendar with the new custom data
        setMainPlanner(manuallyUpdatedTaskArray, manuallyUpdatedCalendar);
    } else {
      setIsCompleted(!isCompleted);

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

  const handlePostponetask = () => {
    const manuallyUpdatedCalendar: SimpleEvent[] | undefined =
      currentCalendar?.filter((e) => !(e.id === event.id));

    if (manuallyUpdatedCalendar)
      updateCalendar(undefined, manuallyUpdatedCalendar);
  };

  return (
    <div
      ref={elementRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "0px",
      }}
    >
      <span className="flex gap-2 justify-between">
        <span style={{ marginBottom: "auto" }}>{event.title}</span>
        <span className="flex gap-2">
          <span>{formatTime(startTime)}</span>
          <span>{formatTime(endTime)}</span>
        </span>
      </span>

      {showButtons && (
        <div
          className="m-1"
          style={{ display: "flex", justifyContent: "flex-end" }}
        >
          <button onClick={onEdit} style={{ marginLeft: "10px" }}>
            <PencilIcon height="1rem" width="1rem" />
          </button>
          <button onClick={onCopy} style={{ marginLeft: "10px" }}>
            <DocumentDuplicateIcon height="1rem" width="1rem" />
          </button>
          <button onClick={onDelete} style={{ marginLeft: "10px" }}>
            <TrashIcon height="1rem" width="1rem" />
          </button>
        </div>
      )}

      {task?.type === "task" ||
        (task?.type === "goal" && (
          <div
            className="m-1"
            style={{ display: "flex", justifyContent: "flex-end" }}
          >
            <button
              onClick={handleClickCompleteTask}
              style={{ marginLeft: "10px" }}
            >
              <CheckIcon height="1rem" width="1rem" />
            </button>
            {displayPostponeButton && (
              <button
                onClick={handlePostponetask}
                style={{ marginLeft: "10px" }}
              >
                <ArrowRightCircleIcon height="1rem" width="1rem" />
              </button>
            )}
            <button onClick={onDelete} style={{ marginLeft: "10px" }}>
              <XCircleIcon height="1rem" width="1rem" />
            </button>
          </div>
        ))}
    </div>
  );
};

export default EventContent;
