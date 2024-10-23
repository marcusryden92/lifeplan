"use client";

import { useEffect, useState, useRef } from "react";

// Definitions
import { TaskItemProps } from "@/lib/task-item";

// Components
import TaskList from "./TaskList";
import TaskHeader from "./task-item-subcomponents/TaskHeader";

// Utils
import { totalSubtaskDuration } from "@/utils/task-array-utils";
import { getSubtasksFromId } from "@/utils/goal-page-handlers";

export const TaskItem: React.FC<TaskItemProps> = ({
  taskArray,
  task,
  focusedTask,
  setFocusedTask,
}) => {
  const [totalTaskDuration, setTotalTaskDuration] = useState(
    totalSubtaskDuration(task.id, taskArray)
  );
  const [itemFocused, setItemFocused] = useState<boolean>(false);
  const [subtasksMinimized, setSubtasksMinimized] = useState<boolean>(false);

  const subtasks = getSubtasksFromId(taskArray, task.id);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const devMode = false;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setItemFocused(false);
      }
    };

    if (itemFocused) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [itemFocused]);

  const handleSetFocusedTask = () => {
    setFocusedTask(focusedTask === task.id ? null : task.id);
  };

  useEffect(() => {
    setItemFocused(task.id === focusedTask);
  }, [focusedTask, task.id]);

  useEffect(() => {
    setTotalTaskDuration(totalSubtaskDuration(task.id, taskArray));
  }, [taskArray, task.id]);

  return (
    <div
      className={`${subtasks.length ? "pb-1" : ""} ${
        task.parentId ? "pl-2" : ""
      }`}
    >
      <TaskHeader
        task={task}
        headerRef={headerRef}
        subtasks={subtasks}
        itemFocused={itemFocused}
        subtasksMinimized={subtasksMinimized}
        setSubtasksMinimized={setSubtasksMinimized}
        handleSetFocusedTask={handleSetFocusedTask}
        totalTaskDuration={totalTaskDuration}
        devMode={devMode}
      />

      {/* Render subtasks if there are any */}
      {subtasks.length > 0 && (
        <div
          style={{
            height: subtasksMinimized ? "0px" : "auto",
            transition: "height ease 1000ms",
          }}
          className={`overflow-hidden ${
            task.parentId
              ? `pl-5 ${
                  itemFocused
                    ? "border-l-2 border-sky-400"
                    : "border-l-2 border-gray-200"
                }`
              : ""
          }`}
        >
          <TaskList
            id={task.id}
            subtasks={subtasks}
            focusedTask={focusedTask}
            setFocusedTask={setFocusedTask}
          />
        </div>
      )}
    </div>
  );
};
