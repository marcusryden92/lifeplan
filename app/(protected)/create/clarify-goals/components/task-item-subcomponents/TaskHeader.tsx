"use client";

import { useState, useEffect, useRef } from "react";

// Components
import TaskDisplay from "./TaskDisplay";

// Definitions
import { TaskHeaderProps } from "@/lib/task-item";

// Icons
import TaskEditForm from "./TaskEditForm";
import AddSubtaskWrapper from "./AddSubtaskWrapper";
import DurationDisplay from "./DurationDisplay";

// TaskHeader component definition
export const TaskHeader = ({
  task,
  subtasks,
  itemIsFocused,
  setItemIsFocused,
  subtasksMinimized,
  setSubtasksMinimized,
  focusedTask,
  setFocusedTask,
  devMode,
}: TaskHeaderProps) => {
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [displayAddSubtask, setDisplayAddSubtask] = useState<boolean>(false);
  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setItemIsFocused(false);
      }
    };

    if (itemIsFocused) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [itemIsFocused]);

  const handleSetFocusedTask = () => {
    setFocusedTask(focusedTask === task.id ? null : task.id);
  };

  useEffect(() => {
    setItemIsFocused(task.id === focusedTask);
  }, [focusedTask, task.id]);

  useEffect(() => {
    if (!itemIsFocused) {
      setDisplayEdit(false);
    }
  });

  if (!task.parentId) return null;
  return (
    <div
      ref={headerRef}
      className={`flex justify-between  items-center w-full text-sm py-1 group`}
    >
      <div
        className={`flex items-center justify-between flex-grow ${
          subtasks.length !== 0 && !itemIsFocused && "opacity-50"
        }`}
      >
        <div className="flex items-center space-x-5">
          {!displayEdit ? (
            <TaskDisplay
              task={task}
              subtasks={subtasks}
              itemIsFocused={itemIsFocused}
              setDisplayEdit={setDisplayEdit}
              setDisplayAddSubtask={setDisplayAddSubtask}
              subtasksMinimized={subtasksMinimized}
              setSubtasksMinimized={setSubtasksMinimized}
              handleSetFocusedTask={handleSetFocusedTask}
              devMode={devMode}
            />
          ) : (
            <TaskEditForm
              task={task}
              subtasks={subtasks}
              setDisplayEdit={setDisplayEdit}
              itemIsFocused={itemIsFocused}
            />
          )}

          <AddSubtaskWrapper
            task={task}
            subtasks={subtasks}
            displayAddSubtask={displayAddSubtask}
            setDisplayAddSubtask={setDisplayAddSubtask}
            itemIsFocused={itemIsFocused}
            displayEdit={displayEdit}
          />
        </div>

        {/* DURATION DISPLAY */}
        <DurationDisplay
          task={task}
          itemIsFocused={itemIsFocused}
          subtasksLength={subtasks.length}
          displayEdit={displayEdit}
        />
      </div>
    </div>
  );
};

export default TaskHeader;
