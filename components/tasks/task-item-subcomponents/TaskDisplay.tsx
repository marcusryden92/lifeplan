"use client";

import { TaskDisplayProps } from "@/lib/taskItem";

import DebugInfo from "./DebugInfo";
import TaskEditDeleteButtons from "./TaskEditDeleteButtons";
import {
  taskTitle,
  taskTitleFocused,
} from "@/components/tasks/lumenTasks.css";

export const TaskDisplay: React.FC<TaskDisplayProps> = ({
  task,
  itemIsFocused,
  setDisplayEdit,
  setDisplayAddSubtask,
  devMode,
}) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
      <span
        className={`${taskTitle} ${itemIsFocused ? taskTitleFocused : ""}`}
      >
        {task.title}
      </span>

      <DebugInfo task={task} devMode={devMode} />

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
