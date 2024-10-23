"use client";

import { useDataContext } from "@/context/DataContext";

// Components
import { TaskItem } from "./TaskItem";

// Planner class
import { Planner } from "@/lib/planner-class";

// Utils
import { getTaskById } from "@/utils/task-array-utils";
import {
  getSubtasksFromId,
  sortTasksByDependencies,
} from "@/utils/goal-page-handlers";

const TaskList = ({
  id,
  subtasks,
  focusedTask,
  setFocusedTask,
}: {
  id: string;
  subtasks?: Planner[];
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const { taskArray, setTaskArray } = useDataContext();

  // Get subtasks from the context if not provided
  const subtasksToUse = subtasks || getSubtasksFromId(taskArray, id);
  if (!subtasksToUse.length) return null; // Return early if no subtasks.

  const thisTask = getTaskById(taskArray, id);
  if (!thisTask) return null; // Avoid rendering if task doesn't exist.

  const sortedTasks = sortTasksByDependencies(taskArray, subtasksToUse);

  return (
    <div className="flex flex-col justify-start flex-grow w-full">
      {sortedTasks.map((task) => (
        <TaskItem
          key={task.id}
          taskArray={taskArray}
          setTaskArray={setTaskArray}
          task={task}
          focusedTask={focusedTask}
          setFocusedTask={setFocusedTask}
        />
      ))}
    </div>
  );
};

export default TaskList;
