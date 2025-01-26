// Definitions
import { TaskDisplayProps } from "@/lib/task-item";

// Components
import DebugInfo from "./DebugInfo";
import TaskEditDeleteButtons from "./TaskEditDeleteButtons";

import { useDraggableContext } from "@/components/draggable/DraggableContext";

export const TaskDisplay: React.FC<TaskDisplayProps> = ({
  task,
  itemIsFocused,
  setDisplayEdit,
  setDisplayAddSubtask,
  handleSetFocusedTask,
  devMode,
}) => {
  const { displayDragBox } = useDraggableContext();
  return (
    <div className="flex space-x-2 items-center">
      {/* Task title */}

      <span
        onClick={handleSetFocusedTask}
        className={`min-w-10 truncate ${itemIsFocused && " text-sky-400 "} ${
          !itemIsFocused && !displayDragBox && "hover:cursor-pointer"
        }`}
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
