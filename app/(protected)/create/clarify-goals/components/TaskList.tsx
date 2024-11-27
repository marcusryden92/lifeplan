"use client";

import { useDataContext } from "@/context/DataContext";
import { useState, useEffect } from "react";

// Components
import { TaskItem } from "./TaskItem";

// Props
import { TaskListProps } from "@/lib/task-item";

// Utils
import { getTaskById } from "@/utils/task-array-utils";
import {
  getSubtasksFromId,
  sortTasksByDependencies,
} from "@/utils/goal-page-handlers";
import { v4 as uuidv4 } from "uuid";

const TaskList: React.FC<TaskListProps> = ({
  id,
  subtasks,
  focusedTask,
  setFocusedTask,
}) => {
  const { taskArray } = useDataContext();

  // Get subtasks from the context if not provided
  const subtasksToUse = subtasks || getSubtasksFromId(taskArray, id);
  if (!subtasksToUse.length) return null; // Return early if no subtasks.

  const thisTask = getTaskById(taskArray, id);
  if (!thisTask) return null; // Avoid rendering if task doesn't exist.

  const sortedTasks = sortTasksByDependencies(taskArray, subtasksToUse);

  const [bufferIdList, setBufferIdList] = useState<string[]>([]);

  useEffect(() => {
    const ids = Array.from({ length: sortedTasks.length + 1 }, () => uuidv4());
    setBufferIdList(ids);
  }, []);

  const taskElements = [];
  for (let i = 0; i <= sortedTasks.length * 2; i++) {
    if (i % 2 === 0) {
      taskElements.push(
        <div
          key={bufferIdList[i / 2]}
          id={bufferIdList[i / 2]}
          className="w-full h-2 bg-sky-500"
        ></div>
      );
    } else {
      const taskIndex = (i - 1) / 2;
      const task = sortedTasks[taskIndex];
      if (!task) continue; // Skip if no task is found at this index

      taskElements.push(
        <TaskItem
          key={task.id}
          taskArray={taskArray}
          task={task}
          focusedTask={focusedTask}
          setFocusedTask={setFocusedTask}
          bufferIds={{
            previous: bufferIdList[taskIndex],
            next: bufferIdList[taskIndex + 1],
          }}
        />
      );
    }
  }

  return (
    <div
      className={`flex flex-col justify-start flex-grow w-full ${
        subtasks && subtasks.length > 0 && "mb-4"
      }`}
    >
      {taskElements.map((element) => element)}
    </div>
  );
};

export default TaskList;
