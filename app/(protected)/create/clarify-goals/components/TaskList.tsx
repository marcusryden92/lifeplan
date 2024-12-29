"use client";

import { useState, useEffect } from "react";
import { useDataContext } from "@/context/DataContext";
import { TaskItem } from "./TaskItem";
import TaskDivider from "@/components/draggable/TaskDivider";
import { TaskListProps } from "@/lib/task-item";
import { getTaskById } from "@/utils/task-array-utils";
import {
  getSubtasksById,
  sortTasksByDependenciesAsync,
} from "@/utils/goal-page-handlers";

const TaskList: React.FC<TaskListProps> = ({
  id,
  subtasks,
  focusedTask,
  setFocusedTask,
}) => {
  const { taskArray, setTaskArray } = useDataContext();

  // State to handle sorted tasks
  const [sortedTasks, setSortedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      const subtasksToUse = subtasks || getSubtasksById(taskArray, id);
      if (!subtasksToUse.length) {
        setLoading(false);
        return;
      }

      const thisTask = getTaskById(taskArray, id);
      if (!thisTask) {
        setLoading(false);
        return;
      }

      const sorted = await sortTasksByDependenciesAsync(
        taskArray,
        subtasksToUse
      );
      setSortedTasks(sorted);
      setLoading(false);
    };

    fetchData();
  }, [id, subtasks, taskArray]);

  if (loading) {
    return <div>Loading...</div>; // Optional: show loading state while waiting for async operation
  }

  if (!sortedTasks.length) {
    return null; // Return early if no sorted tasks
  }

  return (
    <div
      className={`flex flex-col justify-start flex-grow w-full ${
        subtasks && subtasks.length > 0 && "mb-2"
      }`}
    >
      {sortedTasks.map((task) => (
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
