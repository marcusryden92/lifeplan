"use client";

import React, { useState } from "react";

// Definitions
import { TaskItemProps } from "@/lib/taskItem";

// Components
import TaskList from "./TaskList";
import TaskListWrapper from "./task-item-subcomponents/TaskListWrapper";
import TaskHeader from "./task-item-subcomponents/TaskHeader";
import DraggableItem from "@/components/draggable/DraggableItem";

import { RxDot } from "react-icons/rx";
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";

// Utils
import { getSubtasksById } from "@/utils/goalPageHandlers";
import DragDisableListWrapper from "@/components/draggable/DragDisableListWrapper";

const TaskItem: React.FC<TaskItemProps> = React.memo(
  ({ mainPlanner, task, focusedTask, setFocusedTask }) => {
    const [itemIsFocused, setItemIsFocused] = useState<boolean>(false);
    const [subtasksMinimized, setSubtasksMinimized] = useState<boolean>(false);

    const subtasks = getSubtasksById(mainPlanner, task.id);
    const devMode = false;

    return (
      <div
        className={`flex items-start w-full flex-1 ${
          subtasks.length ? "pb-1" : ""
        } ${task.parentId ? "" : ""}`}
      >
        {/* Button to minimize or display subtasks list */}
        <button
          disabled={subtasks.length === 0}
          className={` h-[2rem] translate-x-[50%] ${
            itemIsFocused ? "text-sky-500" : "opacity-50"
          } `}
          onClick={() => {
            setSubtasksMinimized((prev) => !prev);
          }}
        >
          {subtasks.length === 0 ? (
            <RxDot />
          ) : subtasksMinimized ? (
            <IoIosArrowForward />
          ) : (
            <IoIosArrowDown />
          )}
        </button>
        <DragDisableListWrapper taskId={task.id}>
          <DraggableItem
            taskId={task.id}
            taskTitle={task.title}
            parentId={task.parentId}
            className="ml-5"
          >
            <TaskHeader
              task={task}
              subtasks={subtasks}
              itemIsFocused={itemIsFocused}
              setItemIsFocused={setItemIsFocused}
              focusedTask={focusedTask}
              setFocusedTask={setFocusedTask}
              devMode={devMode}
            />
          </DraggableItem>

          {/* Disables task list if parent is being dragged */}
          {/* Render subtasks if there are any */}
          <TaskListWrapper
            taskId={task.id}
            subtasksLength={subtasks.length}
            parentId={task.parentId}
            subtasksMinimized={subtasksMinimized}
            itemIsFocused={itemIsFocused}
          >
            <TaskList
              id={task.id}
              subtasks={subtasks}
              focusedTask={focusedTask}
              setFocusedTask={setFocusedTask}
            />
          </TaskListWrapper>
        </DragDisableListWrapper>
      </div>
    );
  }
);

TaskItem.displayName = "TaskItem";

export default TaskItem;
