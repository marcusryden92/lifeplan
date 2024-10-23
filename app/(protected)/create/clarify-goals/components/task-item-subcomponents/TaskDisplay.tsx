// Planner class
import { Planner } from "@/lib/planner-class";

// Components
import DebugInfo from "./DebugInfo";
import TaskEditDeleteButtons from "./TaskEditDeleteButtons";

import { RxDot } from "react-icons/rx";
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";

interface TaskDisplayProps {
  task: Planner;
  subtasks: Planner[]; // Array of subtasks of type Planner
  itemFocused: boolean; // Boolean indicating if the item is focused
  setDisplayEdit: React.Dispatch<React.SetStateAction<boolean>>; // Function to set displayEdit

  setDisplayAddSubtask: React.Dispatch<React.SetStateAction<boolean>>; // Function to set displayAddSubtask
  subtasksMinimized: boolean; // Boolean indicating if subtasks are minimized
  setSubtasksMinimized: React.Dispatch<React.SetStateAction<boolean>>; // Function to set subtasksMinimized
  handleSetFocusedTask: () => void; // Function to handle setting the focused task
  devMode: boolean; // Boolean indicating if dev mode is active
}

export const TaskDisplay: React.FC<TaskDisplayProps> = ({
  task,
  subtasks,
  itemFocused,
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
        className={`translate-x-[-40%] ${itemFocused && "text-sky-500"} `}
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
        className={`truncate ${itemFocused && " text-sky-400 "}`}
      >
        {task.title}
      </span>

      {/* Display debug info if devMode is active */}
      <DebugInfo task={task} devMode={devMode} />

      {/* Buttons to toggle edit display, or delete task */}
      <TaskEditDeleteButtons
        task={task}
        itemFocused={itemFocused}
        setDisplayEdit={setDisplayEdit}
        setDisplayAddSubtask={setDisplayAddSubtask}
      />
    </div>
  );
};

export default TaskDisplay;
