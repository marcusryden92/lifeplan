"use client";

import { useState, useEffect, useRef } from "react";

import styles from "./TaskHeader.module.css";

// Components
import TaskDisplay from "./TaskDisplay";

// Definitions
import { TaskHeaderProps } from "@/lib/task-item";

// Icons
import TaskEditForm from "./TaskEditForm";
import AddSubtaskWrapper from "./AddSubtaskWrapper";
import DurationDisplay from "./DurationDisplay";

import { useDraggableContext } from "@/components/draggable/DraggableContext";

// TaskHeader component definition
export const TaskHeader = ({
  task,
  subtasks,
  itemIsFocused,
  setItemIsFocused,
  focusedTask,
  setFocusedTask,
  devMode,
}: TaskHeaderProps) => {
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [displayAddSubtask, setDisplayAddSubtask] = useState<boolean>(false);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const { currentlyClickedItem, displayDragBox } = useDraggableContext();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setItemIsFocused(false);
        setFocusedTask(null);
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
    if (!(focusedTask === task.id)) setFocusedTask(task.id);
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
      className={` flex justify-between   items-center w-full flex-1 text-sm py-1 group ${
        displayDragBox &&
        currentlyClickedItem?.parentId === task.id &&
        styles.striatedBackground
      }`}
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
              itemIsFocused={itemIsFocused}
              setDisplayEdit={setDisplayEdit}
              setDisplayAddSubtask={setDisplayAddSubtask}
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
