"use client";

import React from "react";

import { TaskListWrapperProps } from "@/lib/task-item";

const TaskListWrapper: React.FC<TaskListWrapperProps> = ({
  subtasksLength,
  parentId,
  subtasksMinimized,
  itemIsFocused,
  children,
}) => {
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
                  itemIsFocused
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
