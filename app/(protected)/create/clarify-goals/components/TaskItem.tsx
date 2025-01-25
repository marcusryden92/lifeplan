"use client";

import { useEffect, useState, useRef } from "react";

// Definitions
import { TaskItemProps } from "@/lib/task-item";

// Components
import TaskList from "./TaskList";
import TaskListWrapper from "./task-item-subcomponents/TaskListWrapper";
import TaskHeader from "./task-item-subcomponents/TaskHeader";
import DraggableItem from "@/components/draggable/DraggableItem";

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
    <DragDisableListWrapper taskId={task.id}>
      <div
        className={`${subtasks.length ? "pb-1" : ""} ${
          task.parentId ? "pl-2" : ""
        }`}
      >
        <DraggableItem
          taskId={task.id}
          taskTitle={task.title}
          parentId={task.parentId}
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
      </div>
    </DragDisableListWrapper>
  );
};
