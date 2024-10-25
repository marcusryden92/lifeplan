"use client";

import React from "react";

import { TaskListWrapperProps } from "@/lib/task-item";

const TaskListWrapper: React.FC<TaskListWrapperProps> = ({
  subtasksLength,
  parentId,
  subtasksMinimized,
  itemFocused,
  children,
}) => {
  if (subtasksLength === 0) return null;

  return (
    <div
      style={{
        height: subtasksMinimized ? "0px" : "auto",
        transition: "height ease 1000ms",
      }}
      className={`overflow-hidden ${
        parentId
          ? `pl-5 ${
              itemFocused
                ? "border-l-2 border-sky-400"
                : "border-l-2 border-gray-200"
            }`
          : ""
      }`}
    >
      {children}
    </div>
  );
};

export default TaskListWrapper;
