"use client";

import { useDataContext } from "@/context/DataContext";

// Components
import { TaskItem } from "./TaskItem";

// Props
import { TaskListProps } from "@/lib/task-item";

// Utils
import { getTaskById } from "@/utils/task-array-utils";
import {
  getSubtasksById,
  sortTasksByDependencies,
} from "@/utils/goal-page-handlers";

const TaskList: React.FC<TaskListProps> = ({
  id,
  subtasks,
  focusedTask,
  setFocusedTask,
}) => {
  const { taskArray } = useDataContext();

  // Get subtasks from the context if not provided
  const subtasksToUse = subtasks || getSubtasksById(taskArray, id);
  if (!subtasksToUse.length) return null; // Return early if no subtasks.

  const thisTask = getTaskById(taskArray, id);
  if (!thisTask) return null; // Avoid rendering if task doesn't exist.

  const sortedTasks = sortTasksByDependencies(taskArray, subtasksToUse);

  return (
    <div
      className={`flex flex-col justify-start flex-grow w-full ${
        subtasks && subtasks.length > 0 && "mb-2"
      }`}
    >
      {sortedTasks.map((task) => (
        <TaskItem
          key={task.id}
          taskArray={taskArray}
          task={task}
          focusedTask={focusedTask}
          setFocusedTask={setFocusedTask}
        />
      ))}
    </div>
  );
};

export default TaskList;
