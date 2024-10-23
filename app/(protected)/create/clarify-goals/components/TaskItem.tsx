"use client";

import { useEffect, useState, useRef } from "react";

// Planner class
import { Planner } from "@/lib/planner-class";

// Components
import TaskList from "./TaskList";
import TaskHeader from "./task-item-subcomponents/TaskHeader";

// Utils
import { totalSubtaskDuration } from "@/utils/task-array-utils";
import { getSubtasksFromId } from "@/utils/goal-page-handlers";
import { editById } from "@/utils/creation-pages-functions";

interface TaskItemProps {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  task: Planner;
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
}

export const TaskItem = ({
  taskArray,
  setTaskArray,
  task,
  focusedTask,
  setFocusedTask,
}: TaskItemProps) => {
  const [totalTaskDuration, setTotalTaskDuration] = useState(
    totalSubtaskDuration(task.id, taskArray)
  );

  const [itemFocused, setItemFocused] = useState<boolean>(false);
  const [displayAddSubtask, setDisplayAddSubtask] = useState<boolean>(false);

  const subtasks = getSubtasksFromId(taskArray, task.id);

  const [subtasksMinimized, setSubtasksMinimized] = useState<boolean>(false);

  const headerRef = useRef<HTMLDivElement | null>(null);

  const devMode = false;

  useEffect(() => {
    if (itemFocused) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          headerRef.current &&
          !headerRef.current.contains(event.target as Node)
        ) {
          setItemFocused(false); // Set itemFocused to false when clicking outside
        }
      };

      document.addEventListener("mousedown", handleClickOutside);

      // Cleanup function to remove listener when `itemFocused` is false
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [itemFocused, setFocusedTask]);

  const handleSetFocusedTask = () => {
    if (focusedTask === task.id) {
      setFocusedTask(null);
    } else setFocusedTask(task.id);
  };

  useEffect(() => {
    if (task.id === focusedTask) {
      setItemFocused(true);
    } else {
      setItemFocused(false);
    }
  }, [focusedTask]);

  useEffect(() => {
    setTotalTaskDuration(totalSubtaskDuration(task.id, taskArray));
  }, [taskArray]);

  return (
    <div
      className={` ${subtasks.length !== 0 && "pb-1"} ${
        task.parentId && "pl-2"
      }`}
    >
      <TaskHeader
        task={task}
        headerRef={headerRef}
        subtasks={subtasks}
        itemFocused={itemFocused}
        displayAddSubtask={displayAddSubtask}
        setDisplayAddSubtask={setDisplayAddSubtask}
        subtasksMinimized={subtasksMinimized}
        setSubtasksMinimized={setSubtasksMinimized}
        handleSetFocusedTask={handleSetFocusedTask}
        totalTaskDuration={totalTaskDuration}
        devMode={devMode}
      />

      {/*RENDER SUBTASKS IF THERE ARE ANY */}
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
                    ? "border-l-2 border-sky-400 "
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
