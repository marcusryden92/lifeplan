"use client";

import { TaskDisplayProps } from "@/lib/taskItem";
import {
  taskTitle,
  taskTitleFocused,
} from "@/components/tasks/lumenTasks.css";

export const TaskDisplay: React.FC<TaskDisplayProps> = ({
  task,
  itemIsFocused,
}) => {
  return (
    <span
      className={`${taskTitle} ${itemIsFocused ? taskTitleFocused : ""}`}
    >
      {task.title}
    </span>
  );
};

export default TaskDisplay;
