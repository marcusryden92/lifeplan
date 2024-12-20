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
import { getSubtasksFromId } from "@/utils/goal-page-handlers";
import { getTaskIdTree } from "@/utils/goal-page-handlers";
import DragDisableListWrapper from "@/components/draggable/DragDisableListWrapper";

export const TaskItem: React.FC<TaskItemProps> = ({
  taskArray,
  task,
  focusedTask,
  setFocusedTask,
}) => {
  const [itemIsFocused, setItemIsFocused] = useState<boolean>(false);
  const [subtasksMinimized, setSubtasksMinimized] = useState<boolean>(false);

  const subtasks = getSubtasksFromId(taskArray, task.id);
  const devMode = false;

  const [taskTreeIds] = useState<string[]>(getTaskIdTree(taskArray, task.id));

  return (
    <div
      className={`${subtasks.length ? "pb-1" : ""} ${
        task.parentId ? "pl-2" : ""
      }`}
    >
      <DraggableItem
        taskId={task.id}
        taskTitle={task.title}
        parentId={task.parentId}
        taskTreeIds={taskTreeIds}
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
      <DragDisableListWrapper taskId={task.id}>
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
