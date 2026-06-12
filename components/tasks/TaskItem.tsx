"use client";

import React, { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Circle,
  GripVertical,
} from "lucide-react";

import { TaskItemProps } from "@/lib/taskItem";

import TaskList from "./TaskList";
import TaskListWrapper from "./task-item-subcomponents/TaskListWrapper";
import TaskHeader from "./task-item-subcomponents/TaskHeader";
import DraggableItem from "@/components/draggable/DraggableItem";

import { getSubtasksById } from "@/utils/goalPageHandlers";
import DragDisableListWrapper from "@/components/draggable/DragDisableListWrapper";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import {
  itemRow,
  itemRowWithSubtasks,
  chevronBtn,
  chevronBtnFocused,
  gripBtn,
} from "./lumenTasks.css";

const TaskItem: React.FC<TaskItemProps> = React.memo(({ planner, task }) => {
  const [itemIsFocused, setItemIsFocused] = useState<boolean>(false);
  const [subtasksMinimized, setSubtasksMinimized] = useState<boolean>(false);
  const { focusedTask, setFocusedTask, setCurrentlyClickedItem } =
    useDraggableContext();

  const subtasks = getSubtasksById(planner, task.id);
  const devMode = false;
  const hasSubtasks = subtasks.length > 0;

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.add("lp-dragging");
      setCurrentlyClickedItem({
        taskId: task.id,
        taskTitle: task.title,
        parentId: task.parentId || "",
      });

      // Safety net: clear click state on the next mouseup if no drop handler did.
      // Drop handlers (DraggableItem/TaskDivider) already clear, so this is a no-op
      // in the happy path; it covers releases outside any drop target.
      const onUp = () => {
        setCurrentlyClickedItem(null);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mouseup", onUp);
    },
    [task.id, task.title, task.parentId, setCurrentlyClickedItem],
  );

  return (
    <div
      className={`${itemRow} ${hasSubtasks ? itemRowWithSubtasks : ""}`}
    >
      <DragDisableListWrapper taskId={task.id}>
        <DraggableItem
          taskId={task.id}
          parentId={task.parentId ?? undefined}
        >
          <span
            className={gripBtn}
            onMouseDown={startDrag}
            aria-label="Drag to reorder"
            role="button"
          >
            <GripVertical size={16} strokeWidth={2} />
          </span>

          <button
            type="button"
            disabled={!hasSubtasks}
            className={`${chevronBtn} ${itemIsFocused ? chevronBtnFocused : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setSubtasksMinimized((prev) => !prev);
            }}
            aria-label={
              hasSubtasks
                ? subtasksMinimized
                  ? "Expand subtasks"
                  : "Collapse subtasks"
                : undefined
            }
          >
            {!hasSubtasks ? (
              <Circle size={6} strokeWidth={0} fill="currentColor" />
            ) : subtasksMinimized ? (
              <ChevronRight size={14} strokeWidth={2.4} />
            ) : (
              <ChevronDown size={14} strokeWidth={2.4} />
            )}
          </button>

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

        <TaskListWrapper
          taskId={task.id}
          subtasksLength={subtasks.length}
          parentId={task.parentId ?? undefined}
          subtasksMinimized={subtasksMinimized}
          itemIsFocused={itemIsFocused}
        >
          <TaskList id={task.id} subtasks={subtasks} />
        </TaskListWrapper>
      </DragDisableListWrapper>
    </div>
  );
});

TaskItem.displayName = "TaskItem";

export default TaskItem;
