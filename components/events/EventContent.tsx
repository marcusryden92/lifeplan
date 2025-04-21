// EventContent.tsx
import {
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

import { useRef } from "react";

import { SimpleEvent } from "@/types/calendarTypes";
import { useDataContext } from "@/context/DataContext";
import { taskIsCompleted, toggletaskIsCompleted } from "@/utils/taskHelpers";

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
  const { taskArray, setTaskArray, setCurrentCalendar } = useDataContext();
  const elementRef = useRef<HTMLDivElement>(null);
  const task = taskArray.find((task) => task.id === event.id);

  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  const isCompleted = task ? taskIsCompleted(task) : undefined;

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

    setTimeout(() => {
      toggletaskIsCompleted(setTaskArray, event);
    }, 500);
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
      onClick={handleClickCompleteTask}
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
    </div>
  );
};

export default EventContent;
