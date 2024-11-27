"use client";

import { useDataContext } from "@/context/DataContext";

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
import next from "next";

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

  const listBufferUuidList: string[] = [];
  for (let i = 0; i < sortedTasks.length + 1; i++) {
    listBufferUuidList.push(uuidv4());
  }

  const taskElements = [];
  for (let i = 0; i <= sortedTasks.length * 2 + 1; i++) {
    if (i % 2 === 0) {
      taskElements.push(
        <div
          id={listBufferUuidList[i / 2]}
          className="w-full h-4 bg-sky-500"
        ></div>
      );
    } else {
      const task = sortedTasks[(i - 1) / 2];
      taskElements.push(
        <TaskItem
          taskArray={taskArray}
          task={task}
          focusedTask={focusedTask}
          setFocusedTask={setFocusedTask}
          bufferIds={{
            previous: listBufferUuidList[(i - 1) / 2],
            next: listBufferUuidList[(i - 1) / 2],
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
