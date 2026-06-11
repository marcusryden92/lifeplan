"use client";

import React, { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { TaskEditFormProps } from "@/lib/taskItem";
import { editById } from "@/utils/creationPagesFunctions";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  editForm,
  editInput,
  editDurationInput,
  iconBtn,
  iconBtnVisible,
} from "@/components/tasks/lumenTasks.css";

const TaskEditForm: React.FC<TaskEditFormProps> = ({
  task,
  subtasks,
  setDisplayEdit,
  itemIsFocused,
}) => {
  const { updatePlannerArray } = useCalendarProvider();

  const [editTitle, setEditTitle] = useState<string>(task.title);
  const [editDuration, setEditDuration] = useState<number | null>(task.duration);

  const handleConfirmEdit = () => {
    editById({
      editTitle,
      editDuration,
      editId: task.id,
      updatePlannerArray,
    });
    setDisplayEdit(false);
  };

  return (
    <div className={editForm}>
      <input
        className={editInput}
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        autoFocus
      />
      {subtasks.length === 0 && (
        <input
          className={editDurationInput}
          defaultValue={task.duration ?? undefined}
          onChange={(e) => setEditDuration(Number(e.target.value))}
          placeholder={task.duration?.toString() || "min"}
          type="number"
          pattern="[0-9]*"
        />
      )}
      <button
        type="button"
        onClick={handleConfirmEdit}
        className={`${iconBtn} ${iconBtnVisible}`}
        aria-label="Save"
      >
        <Check size={14} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        disabled={!itemIsFocused}
        onClick={() => {
          setDisplayEdit(false);
          setEditTitle(task.title);
        }}
        className={`${iconBtn} ${iconBtnVisible}`}
        aria-label="Cancel"
      >
        <RotateCcw size={13} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default TaskEditForm;
