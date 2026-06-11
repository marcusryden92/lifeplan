"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { deleteGoal } from "@/utils/goalPageHandlers";
import { TaskEditDeleteButtonsProps } from "@/lib/taskItem";
import {
  iconRow,
  iconBtn,
  iconBtnVisible,
  iconBtnDanger,
} from "@/components/tasks/lumenTasks.css";

const TaskEditDeleteButtons: React.FC<TaskEditDeleteButtonsProps> = ({
  task,
  itemIsFocused,
  setDisplayEdit,
  setDisplayAddSubtask,
}) => {
  const { updateAll } = useCalendarProvider();
  const handleDelete = () => {
    deleteGoal({
      updateAll,
      taskId: task.id,
      parentId: task.parentId,
    });
  };

  return (
    <div className={iconRow}>
      <button
        type="button"
        disabled={!itemIsFocused}
        onClick={() => {
          setDisplayEdit(true);
          setDisplayAddSubtask(false);
        }}
        className={`${iconBtn} ${itemIsFocused ? iconBtnVisible : ""}`}
        aria-label="Edit subtask"
      >
        <Pencil size={13} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        disabled={!itemIsFocused}
        onClick={handleDelete}
        className={`${iconBtn} ${iconBtnDanger} ${itemIsFocused ? iconBtnVisible : ""}`}
        aria-label="Delete subtask"
      >
        <Trash2 size={13} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default TaskEditDeleteButtons;
