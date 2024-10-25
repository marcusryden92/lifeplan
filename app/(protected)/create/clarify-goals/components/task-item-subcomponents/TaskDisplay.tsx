// Definitions
import { TaskDisplayProps } from "@/lib/task-item";

// Components
import DebugInfo from "./DebugInfo";
import TaskEditDeleteButtons from "./TaskEditDeleteButtons";

import { RxDot } from "react-icons/rx";
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";

export const TaskDisplay: React.FC<TaskDisplayProps> = ({
  task,
  subtasks,
  itemIsFocused,
  setDisplayEdit,
  setDisplayAddSubtask,
  subtasksMinimized,
  setSubtasksMinimized,
  handleSetFocusedTask,
  devMode,
}) => {
  return (
    <div className="flex space-x-2 items-center">
      {/* Button to minimize or display subtasks list */}
      <button
        disabled={subtasks.length === 0}
        className={`translate-x-[-40%] ${itemIsFocused && "text-sky-500"} `}
        onClick={() => {
          setSubtasksMinimized((prev) => !prev);
        }}
      >
        {subtasks.length === 0 ? (
          <RxDot />
        ) : subtasksMinimized ? (
          <IoIosArrowForward />
        ) : (
          <IoIosArrowDown />
        )}
      </button>

      {/* Task title */}
      <span
        onClick={handleSetFocusedTask}
        className={`truncate ${itemIsFocused && " text-sky-400 "}`}
      >
        {task.title}
      </span>

      {/* Display debug info if devMode is active */}
      <DebugInfo task={task} devMode={devMode} />

      {/* Buttons to toggle edit display, or delete task */}
      <TaskEditDeleteButtons
        task={task}
        itemIsFocused={itemIsFocused}
        setDisplayEdit={setDisplayEdit}
        setDisplayAddSubtask={setDisplayAddSubtask}
      />
    </div>
  );
};

export default TaskDisplay;
