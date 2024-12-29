"use client";

import { useDataContext } from "@/context/DataContext";
import { TaskItem } from "./TaskItem";
import TaskDivider from "./TaskDivider";
import { TaskListProps } from "@/lib/task-item";
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
  const { taskArray, setTaskArray } = useDataContext();

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
      {sortedTasks.map((task, index) => (
        <div key={task.id}>
          <TaskDivider
            taskArray={taskArray}
            setTaskArray={setTaskArray}
            targetId={task.id}
            mouseLocationInItem="top"
          />
          <TaskItem
            taskArray={taskArray}
            task={task}
            focusedTask={focusedTask}
            setFocusedTask={setFocusedTask}
          />
        </div>
      ))}

      <TaskDivider
        taskArray={taskArray}
        setTaskArray={setTaskArray}
        targetId={sortedTasks[sortedTasks.length - 1].id}
        mouseLocationInItem="bottom"
      />
    </div>
  );
};

export default TaskList;
