"use client";

import React, { useState, useEffect } from "react";
import { useCalendarProvider } from "@/context/CalendarProvider";
import TaskItem from "./TaskItem";
import TaskDivider from "@/components/draggable/TaskDivider";
import { TaskListProps } from "@/lib/taskItem";
import { getTaskById } from "@/utils/taskArrayUtils";
import {
  getSubtasksById,
  sortTasksByDependencies,
} from "@/utils/goalPageHandlers";
import { Planner } from "@/prisma/generated/client";

const TaskList: React.FC<TaskListProps> = React.memo(({ id, subtasks }) => {
  const { planner, updatePlannerArray } = useCalendarProvider();

  // State to handle sorted tasks
  const [sortedTasks, setSortedTasks] = useState<Planner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = () => {
      const subtasksToUse = subtasks || getSubtasksById(planner, id);
      if (!subtasksToUse.length) {
        setLoading(false);
        return;
      }

      const thisTask = getTaskById(planner, id);
      if (!thisTask) {
        setLoading(false);
        return;
      }

      const sorted = sortTasksByDependencies(planner, subtasksToUse);
      setSortedTasks(sorted);
      setLoading(false);
    };

    fetchData();
  }, [id, subtasks, planner]);

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
                planner={planner}
                updatePlannerArray={updatePlannerArray}
                targetId={task.id}
                mouseLocationInItem="top"
              />
              <TaskItem planner={planner} task={task} />
            </div>
          ))}

          <TaskDivider
            planner={planner}
            updatePlannerArray={updatePlannerArray}
            targetId={sortedTasks[sortedTasks.length - 1].id}
            mouseLocationInItem="bottom"
          />
        </>
      )}
    </div>
  );
});

TaskList.displayName = "TaskList";

export default TaskList;
