"use client";

import React from "react";

import { TaskListWrapperProps } from "@/lib/taskItem";
import { useDraggableContext } from "@/components/draggable/DraggableContext";

const TaskListWrapper: React.FC<TaskListWrapperProps> = ({
  taskId,
  subtasksLength,
  parentId,
  subtasksMinimized,
  itemIsFocused,
  children,
}) => {
  const { displayDragBox, currentlyClickedItem } = useDraggableContext();
  return (
    <>
      {subtasksLength > 0 && (
        <div
          style={{
            height: subtasksMinimized ? "0px" : "auto",
            transition: "height ease 1000ms",
          }}
          className={`overflow-hidden ${
            parentId
              ? `pl-5 ${
                  taskId === currentlyClickedItem?.taskId && displayDragBox
                    ? "border-l-2 border-opacity-0"
                    : itemIsFocused
                    ? "border-l-2 border-sky-400"
                    : "border-l-2 border-gray-200"
                }`
              : ""
          }`}
        >
          {children}
        </div>
      )}
    </>
  );
};

export default TaskListWrapper;
