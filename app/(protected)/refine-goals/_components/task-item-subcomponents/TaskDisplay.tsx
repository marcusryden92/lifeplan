// Definitions
import { TaskDisplayProps } from "@/lib/taskItem";

// Components
import DebugInfo from "./DebugInfo";
import TaskEditDeleteButtons from "./TaskEditDeleteButtons";

export const TaskDisplay: React.FC<TaskDisplayProps> = ({
  task,
  itemIsFocused,
  setDisplayEdit,
  setDisplayAddSubtask,
  devMode,
}) => {
  return (
    <div className="flex pl-2 space-x-2 items-center">
      {/* Task title */}

      <span
        className={`min-w-10 truncate ${itemIsFocused && " text-sky-400 "}`}
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
