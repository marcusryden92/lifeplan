"use client";

import React, { useState, useEffect } from "react";
import { useDataContext } from "@/context/DataContext";
import TaskItem from "./TaskItem";
import TaskDivider from "@/components/draggable/TaskDivider";
import { TaskListProps } from "@/lib/taskItem";
import { getTaskById } from "@/utils/mainPlannerUtils";
import {
  getSubtasksById,
  sortTasksByDependenciesAsync,
} from "@/utils/goalPageHandlers";

const TaskList: React.FC<TaskListProps> = React.memo(
  ({ id, subtasks, focusedTask, setFocusedTask }) => {
    const { mainPlanner, setMainPlanner } = useDataContext();

    // State to handle sorted tasks
    const [sortedTasks, setSortedTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
      const fetchData = async () => {
        const subtasksToUse = subtasks || getSubtasksById(mainPlanner, id);
        if (!subtasksToUse.length) {
          setLoading(false);
          return;
        }

        const thisTask = getTaskById(mainPlanner, id);
        if (!thisTask) {
          setLoading(false);
          return;
        }

        const sorted = await sortTasksByDependenciesAsync(
          mainPlanner,
          subtasksToUse
        );
        setSortedTasks(sorted);
        setLoading(false);
      };

      fetchData();
    }, [id, subtasks, mainPlanner]);

    if (loading) {
      return <div className="p-4 text-neutral-300 italic ">Loading...</div>; // Optional: show loading state while waiting for async operation
    }

    /* if (!sortedTasks.length) {
    return null; // Return early if no sorted tasks
  } */

    return (
      <div
        className={`flex flex-col justify-start flex-grow w-full ${
          subtasks && subtasks.length > 0 && "mb-2"
        }`}
      >
        {sortedTasks.length > 0 && (
          <>
            {sortedTasks.map((task) => (
              <div key={task.id}>
                <TaskDivider
                  mainPlanner={mainPlanner}
                  setMainPlanner={setMainPlanner}
                  targetId={task.id}
                  mouseLocationInItem="top"
                />
                <TaskItem
                  mainPlanner={mainPlanner}
                  task={task}
                  focusedTask={focusedTask}
                  setFocusedTask={setFocusedTask}
                />
              </div>
            ))}

            <TaskDivider
              mainPlanner={mainPlanner}
              setMainPlanner={setMainPlanner}
              targetId={sortedTasks[sortedTasks.length - 1].id}
              mouseLocationInItem="bottom"
            />
          </>
        )}
      </div>
    );
  }
);

TaskList.displayName = "TaskList";

export default TaskList;
