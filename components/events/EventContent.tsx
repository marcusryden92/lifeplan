// EventContent.tsx
import {
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  CheckIcon,
  ArrowRightIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

import { useRef, useState } from "react";

import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "@/types/calendarTypes";
import { useDataContext } from "@/context/DataContext";
import { taskIsCompleted, setTaskAsCompleted } from "@/utils/taskHelpers";
import { floorMinutes } from "@/utils/calendarUtils";

import { deleteGoal } from "@/utils/goalPageHandlers";
import { deletePlanner } from "@/utils/plannerUtils";

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
    const color = !isCompleted ? green : orange;

    // Find the DOM element for this event and change color directly
    const el = elementRef.current?.closest(".fc-event") as HTMLElement;
    if (el) {
      el.style.backgroundColor = color;
      el.style.border = `solid 2px ${color}`;
    }

    if (isCompleted) {
      setIsCompleted(!isCompleted);

      // Create a new mainPlanner instance where item.completed is undefined
      const manuallyUpdatedTaskArray: Planner[] | undefined = mainPlanner.map(
        (item: Planner) =>
          item.id === event.id ? { ...item, completed: undefined } : item
      );

      setMainPlanner(manuallyUpdatedTaskArray);
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

  const handleClickDelete = () => {
    // Find the DOM element for this event and change color directly
    const el = elementRef.current?.closest(".fc-event") as HTMLElement;
    if (el) {
      el.style.backgroundColor = red;
      el.style.border = `solid 2px ${red}`;
    }

    const manuallyUpdatedCalendar: SimpleEvent[] | undefined =
      currentCalendar?.filter((e) => !(e.id === task?.id));

    setTimeout(() => {
      if (task?.type === "goal") {
        deleteGoal({
          setMainPlanner,
          taskId: task.id,
          parentId: task.parentId,
          manuallyUpdatedCalendar,
        });
      } else if (task?.type === "task" || task?.type === "plan") {
        deletePlanner(setMainPlanner, task.id, manuallyUpdatedCalendar);
      }
    }, 500);
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
      onMouseEnter={() => {
        setOnHover(true);
      }}
      onMouseLeave={() => {
        setOnHover(false);
      }}
    >
      <span className="flex gap-2 justify-between">
        <span style={{ marginBottom: "auto" }}>{event.title}</span>
        <span className="flex gap-2">
          <span>{formatTime(startTime)}</span>
          <span>{formatTime(endTime)}</span>
        </span>
      </span>

      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        {onHover && (
          <>
            <div
              className="m-1 ml-0"
              style={{ display: "flex", justifyContent: "flex-end" }}
            >
              <button onClick={handleClickDelete}>
                <TrashIcon height="1rem" width="1rem" />
              </button>
              {/* <button onClick={onEdit}>
            <PencilIcon height="1rem" width="1rem" />
          </button>
          <button onClick={onCopy}>
            <DocumentDuplicateIcon height="1rem" width="1rem" />
          </button> */}
            </div>

            <div
              className="m-1"
              style={{ display: "flex", justifyContent: "flex-end" }}
            >
              {!event.isTemplateItem &&
                (task?.type === "goal" || task?.type === "task") && (
                  <button
                    onClick={handleClickCompleteTask}
                    style={{ marginLeft: "10px" }}
                  >
                    <CheckIcon height="1rem" width="1rem" />
                  </button>
                )}

              <button
                disabled={!displayPostponeButton}
                onClick={handlePostponetask}
                style={{
                  marginLeft: "10px",
                  opacity: displayPostponeButton ? "100%" : "50%",
                }}
              >
                <ArrowRightIcon height="1rem" width="1rem" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EventContent;
