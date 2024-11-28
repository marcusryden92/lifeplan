"use client";

import { useDataContext } from "@/context/DataContext";
import { useState, useEffect } from "react";

// Components
import { TaskItem } from "./TaskItem";
import ItemBuffer from "./task-item-subcomponents/ItemBuffer/ItemBuffer";

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
  focusedTask,
  setFocusedTask,
}) => {
  const { taskArray } = useDataContext();

  const subtasks = getSubtasksFromId(taskArray, id);

  // Get subtasks from the context if not provided
  const subtasksToUse = subtasks || getSubtasksFromId(taskArray, id);
  if (!subtasksToUse.length) return null; // Return early if no subtasks.

  const thisTask = getTaskById(taskArray, id);
  if (!thisTask) return null; // Avoid rendering if task doesn't exist.

  const sortedTasks = sortTasksByDependencies(taskArray, subtasksToUse);

  const [bufferIdList, setBufferIdList] = useState<string[]>([]);

  useEffect(() => {
    // Generate one more ID than the number of tasks to account for initial and final buffers
    const ids = Array.from({ length: sortedTasks.length + 1 }, () => uuidv4());
    setBufferIdList(ids);
  }, [sortedTasks.length]);

  // If buffer IDs are not yet generated, return null or a placeholder
  if (bufferIdList.length === 0) {
    return null;
  }

  const taskElements: React.ReactNode[] = [];

  // Add initial buffer
  taskElements.push(
    <ItemBuffer key={`${bufferIdList[0]}`} id={bufferIdList[0]} />
  );

  // Add tasks and their subsequent buffers
  sortedTasks.forEach((task, index) => {
    taskElements.push(
      <TaskItem
        key={`task-${task.id}`}
        taskArray={taskArray}
        task={task}
        focusedTask={focusedTask}
        setFocusedTask={setFocusedTask}
        bufferIds={{
          upper: bufferIdList[index],
          lower: bufferIdList[index + 1],
        }}
      />
    );

    // Add buffer after each task
    taskElements.push(
      <ItemBuffer key={`${task.id}`} id={bufferIdList[index + 1]} />
    );
  });

  return (
    <div
      className={`flex flex-col justify-start flex-grow w-full ${
        subtasks && subtasks.length > 0 && "mb-4"
      }`}
    >
      {taskElements}
    </div>
  );
};

export default TaskList;
