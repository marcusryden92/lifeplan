"use client";

import React, { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Check,
  GripVertical,
} from "lucide-react";

import { TaskItemProps } from "@/lib/taskItem";

import TaskList from "./TaskList";
import TaskListWrapper from "./task-item-subcomponents/TaskListWrapper";
import TaskHeader from "./task-item-subcomponents/TaskHeader";
import DraggableItem from "@/components/draggable/DraggableItem";

import { getRootParentId, getSubtasksById } from "@/utils/goalPageHandlers";
import { toggleSubtaskCompletion } from "@/utils/goal-handlers/subtaskCompletion";
import { useCalendarProvider } from "@/context/CalendarProvider";
import DragDisableListWrapper from "@/components/draggable/DragDisableListWrapper";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import {
  itemRow,
  itemRowWithSubtasks,
  chevronBtn,
  chevronBtnFocused,
  completeBtn,
  completeCircle,
  gripBtn,
} from "./lumenTasks.css";

const TaskItem: React.FC<TaskItemProps> = React.memo(({ planner, task }) => {
  const [itemIsFocused, setItemIsFocused] = useState<boolean>(false);
  const [subtasksMinimized, setSubtasksMinimized] = useState<boolean>(false);
  const [shakeLocked, setShakeLocked] = useState(false);
  const { focusedTask, setFocusedTask, setCurrentlyClickedItem } =
    useDraggableContext();
  const { updatePlannerArray } = useCalendarProvider();

  const subtasks = getSubtasksById(planner, task.id);
  const devMode = false;
  const hasSubtasks = subtasks.length > 0;
  const isCompleted = !!task.completedEndTime;

  // Subtask completion is gated on the root item being ready, so users can't
  // start checking off work before the goal has been finalized.
  const rootId = getRootParentId(planner, task.id);
  const rootItem = rootId ? planner.find((p) => p.id === rootId) : undefined;
  const completionLocked = rootItem ? !rootItem.isReady : false;

  const handleToggleComplete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (completionLocked) {
        // Trigger the shake-and-red-flash animation. Re-entry while still
        // shaking is a no-op so the animation doesn't restart mid-flight.
        setShakeLocked((s) => {
          if (s) return s;
          window.setTimeout(() => setShakeLocked(false), 420);
          return true;
        });
        return;
      }
      updatePlannerArray((prev) => toggleSubtaskCompletion(prev, task.id));
    },
    [task.id, updatePlannerArray, completionLocked],
  );

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

          {hasSubtasks ? (
            <button
              type="button"
              className={`${chevronBtn} ${itemIsFocused ? chevronBtnFocused : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setSubtasksMinimized((prev) => !prev);
              }}
              aria-label={
                subtasksMinimized ? "Expand subtasks" : "Collapse subtasks"
              }
            >
              {subtasksMinimized ? (
                <ChevronRight size={14} strokeWidth={2.4} />
              ) : (
                <ChevronDown size={14} strokeWidth={2.4} />
              )}
            </button>
          ) : (
            <button
              type="button"
              className={completeBtn}
              data-completed={isCompleted ? "true" : "false"}
              data-locked={completionLocked ? "true" : "false"}
              data-shake={shakeLocked ? "true" : "false"}
              onClick={handleToggleComplete}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
              aria-pressed={isCompleted}
              title={
                completionLocked
                  ? "Mark the goal ready before completing subtasks"
                  : undefined
              }
            >
              <span className={completeCircle} aria-hidden>
                {isCompleted && <Check size={10} strokeWidth={3} />}
              </span>
            </button>
          )}

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
