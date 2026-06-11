"use client";

import { Plus, RotateCcw } from "lucide-react";
import { AddSubtaskWrapperProps } from "@/lib/taskItem";
import AddSubtask from "./AddSubtask";
import {
  addSubtaskTrigger,
  iconBtn,
  iconBtnVisible,
} from "@/components/tasks/lumenTasks.css";

const AddSubtaskWrapper: React.FC<AddSubtaskWrapperProps> = ({
  task,
  subtasks,
  displayAddSubtask,
  setDisplayAddSubtask,
  itemIsFocused,
  displayEdit,
}) => {
  if (!itemIsFocused || displayEdit) return null;

  return displayAddSubtask ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <AddSubtask
        task={task}
        parentId={task.id}
        subtasksLength={subtasks.length}
      />
      <button
        type="button"
        onClick={() => setDisplayAddSubtask(false)}
        className={`${iconBtn} ${iconBtnVisible}`}
        aria-label="Cancel"
      >
        <RotateCcw size={13} strokeWidth={2.2} />
      </button>
    </div>
  ) : (
    <button
      type="button"
      className={addSubtaskTrigger}
      onClick={() => setDisplayAddSubtask(true)}
    >
      <Plus size={12} strokeWidth={2.4} />
      Add subtask
    </button>
  );
};

export default AddSubtaskWrapper;
