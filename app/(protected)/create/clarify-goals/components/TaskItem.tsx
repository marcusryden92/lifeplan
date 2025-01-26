"use client";

import { useState } from "react";

// Definitions
import { TaskItemProps } from "@/lib/task-item";

// Components
import TaskList from "./TaskList";
import TaskListWrapper from "./task-item-subcomponents/TaskListWrapper";
import TaskHeader from "./task-item-subcomponents/TaskHeader";
import DraggableItem from "@/components/draggable/DraggableItem";

import { RxDot } from "react-icons/rx";
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";

// Utils
import { getSubtasksById } from "@/utils/goal-page-handlers";
import DragDisableListWrapper from "@/components/draggable/DragDisableListWrapper";

export const TaskItem: React.FC<TaskItemProps> = ({
  taskArray,
  task,
  focusedTask,
  setFocusedTask,
}) => {
  const [itemIsFocused, setItemIsFocused] = useState<boolean>(false);
  const [subtasksMinimized, setSubtasksMinimized] = useState<boolean>(false);

  const subtasks = getSubtasksById(taskArray, task.id);
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
            subtasksMinimized={subtasksMinimized}
            setSubtasksMinimized={setSubtasksMinimized}
            focusedTask={focusedTask}
            setFocusedTask={setFocusedTask}
            devMode={devMode}
          />
        </DraggableItem>

        {/* Disables task list if parent is being dragged */}
        {/* Render subtasks if there are any */}
        <TaskListWrapper
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
};
