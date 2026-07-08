"use client";

import { useState, useRef, createRef } from "react";
import { Plus } from "lucide-react";

import { AddSubtaskProps } from "@/lib/taskItem";
import type { Planner } from "@/types/prisma";

import { useCalendarProvider } from "@/context/CalendarProvider";
import { addSubtask } from "@/utils/goalPageHandlers";
import { iconBtn as iconBtnRecipe } from "@/lib/theme";
import {
  addRowRoot,
  addRowInline,
  addRowForm,
  editInput,
  editDurationInput,
  iconBtn,
  iconBtnVisible,
} from "@/components/tasks/lumenTasks.css";

const AddSubtask: React.FC<AddSubtaskProps> = ({
  task,
  parentId,
  isMainParent,
}) => {
  const [taskDuration, setTaskDuration] = useState<number | undefined>(
    undefined,
  );
  const [taskTitle, setTaskTitle] = useState<string>("");

  const { planner, updatePlannerArray, userId } = useCalendarProvider();
  const refs = useRef(new Map<string, React.RefObject<HTMLInputElement>>());

  const getRef = (parentId?: string) => {
    if (!parentId) return undefined;
    if (!refs.current.has(parentId)) {
      refs.current.set(parentId, createRef());
    }
    return refs.current.get(parentId);
  };

  const durationRef = useRef<HTMLInputElement>(null);

  const resetTaskState = () => {
    setTaskDuration(undefined);
    setTaskTitle("");
  };

  const handleAddSubtask = (task: Planner) => {
    if (taskTitle)
      addSubtask({
        userId,
        planner,
        updatePlannerArray,
        task,
        taskDuration: taskDuration || 5,
        taskTitle,
        resetTaskState,
      });
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    task: Planner,
  ) => {
    if (event.key === "Enter" && parentId) {
      event.preventDefault();
      handleAddSubtask(task);
      const ref = getRef(parentId);
      ref?.current?.focus();
    }
  };

  return (
    <div className={isMainParent ? addRowRoot : addRowInline}>
      <div className={addRowForm}>
        <input
          ref={getRef(parentId ?? undefined)}
          className={editInput}
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="New subtask name"
          style={isMainParent ? undefined : { maxWidth: 180 }}
        />
        <input
          ref={durationRef}
          className={editDurationInput}
          value={taskDuration || ""}
          onChange={(e) => setTaskDuration(Number(e.target.value))}
          placeholder="min"
          type="number"
          pattern="[0-9]*"
          onKeyDown={(e) => handleKeyDown(e, task)}
        />
        <button
          type="button"
          disabled={!taskTitle}
          onClick={() => handleAddSubtask(task)}
          className={`${iconBtnRecipe()} ${iconBtn} ${iconBtnVisible}`}
          aria-label="Add subtask"
        >
          <Plus size={18} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
};

export default AddSubtask;
