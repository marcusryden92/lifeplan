"use client";

import { useState, useEffect } from "react";

// Components
import TaskDisplay from "./TaskDisplay";

// Definitions
import { TaskHeaderProps } from "@/lib/task-item";

// Utils
import { formatMinutesToHours } from "@/utils/task-array-utils";

// Icons
import TaskEditForm from "./TaskEditForm";
import AddSubtaskWrapper from "./AddSubtaskWrapper";

// TaskHeader component definition
export const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  headerRef,
  subtasks,
  itemFocused,
  subtasksMinimized,
  setSubtasksMinimized,
  handleSetFocusedTask,
  totalTaskDuration,
  devMode,
}) => {
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [displayAddSubtask, setDisplayAddSubtask] = useState<boolean>(false);

  useEffect(() => {
    if (!itemFocused) {
      setDisplayEdit(false);
    }
  });

  if (!task.parentId) return null;
  return (
    <div
      ref={headerRef}
      className={`flex justify-between  items-center w-full text-sm py-2 group`}
    >
      <div
        className={`flex items-center justify-between flex-grow ${
          subtasks.length !== 0 && !itemFocused && "opacity-50"
        }`}
      >
        <div className="flex items-center space-x-5">
          {!displayEdit ? (
            <TaskDisplay
              task={task}
              subtasks={subtasks}
              itemFocused={itemFocused}
              setDisplayEdit={setDisplayEdit}
              setDisplayAddSubtask={setDisplayAddSubtask}
              subtasksMinimized={subtasksMinimized}
              setSubtasksMinimized={setSubtasksMinimized}
              handleSetFocusedTask={handleSetFocusedTask}
              devMode={devMode}
            />
          ) : (
            <TaskEditForm
              task={task}
              subtasks={subtasks}
              setDisplayEdit={setDisplayEdit}
              itemFocused={itemFocused}
            />
          )}

          {itemFocused && !displayEdit && (
            <AddSubtaskWrapper
              task={task}
              subtasks={subtasks}
              displayAddSubtask={displayAddSubtask}
              setDisplayAddSubtask={setDisplayAddSubtask}
              itemFocused={itemFocused}
            />
          )}
        </div>

        {/* DURATION DISPLAY */}
        {!displayEdit && (
          <div className="flex text-sm text-black pl-2  flex-shrink-0 items-start justify-end space-x-2">
            <div className={`${itemFocused && "text-sky-500"}`}>
              {formatMinutesToHours(
                subtasks.length === 0 ? task.duration || 0 : totalTaskDuration
              )}
              {}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskHeader;
