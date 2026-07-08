"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";

import TaskDisplay from "./TaskDisplay";
import { TaskHeaderProps } from "@/lib/taskItem";
import DurationDisplay from "./DurationDisplay";

import { useDraggableContext } from "@/components/draggable/DraggableContext";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { addSubtask } from "@/utils/goalPageHandlers";
import { iconBtn } from "@/lib/theme";
import {
  headerRow,
  headerRowDragged,
  headerInner,
  headerInnerDim,
  addChildBtn,
} from "@/components/tasks/lumenTasks.css";

export const NEW_SUBTASK_TITLE = "New subtask";

export const TaskHeader = ({
  task,
  subtasks,
  itemIsFocused,
  setItemIsFocused,
  focusedTask,
  setFocusedTask,
  devMode,
}: TaskHeaderProps) => {
  const { currentlyClickedItem, displayDragBox } = useDraggableContext();
  const { planner, updatePlannerArray, userId } = useCalendarProvider();
  void devMode;

  const handleSetFocusedTask = () => {
    if (!(focusedTask === task.id)) setFocusedTask(task.id);
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = addSubtask({
      userId,
      planner,
      updatePlannerArray,
      task,
      taskDuration: 15,
      taskTitle: NEW_SUBTASK_TITLE,
      resetTaskState: () => {},
    });
    if (newId) setFocusedTask(newId);
  };

  useEffect(() => {
    setItemIsFocused(task.id === focusedTask);
  }, [focusedTask, task.id, setItemIsFocused]);

  if (!task.parentId) return null;

  const dimInner = subtasks.length !== 0 && !itemIsFocused;
  const draggedSelf =
    displayDragBox && currentlyClickedItem?.parentId === task.id;

  return (
    <div
      className={`${headerRow} ${draggedSelf ? headerRowDragged : ""}`}
      onClick={handleSetFocusedTask}
    >
      <div className={`${headerInner} ${dimInner ? headerInnerDim : ""}`}>
        <TaskDisplay task={task} itemIsFocused={itemIsFocused} />
        <button
          type="button"
          className={`${iconBtn()} ${addChildBtn}`}
          onClick={handleAddChild}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Add subtask"
        >
          <Plus size={16} strokeWidth={2.4} />
        </button>
      </div>

      <DurationDisplay
        task={task}
        itemIsFocused={itemIsFocused}
        subtasksLength={subtasks.length}
      />
    </div>
  );
};

export default TaskHeader;
