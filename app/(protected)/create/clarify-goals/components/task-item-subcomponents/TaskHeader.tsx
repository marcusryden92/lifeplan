"use client";

import { useState, useEffect } from "react";

// Components
import TaskDisplay from "./TaskDisplay";
import AddSubtask from "../AddSubtask";

// Planner class
import { Planner } from "@/lib/planner-class";

// Utils
import { formatMinutesToHours } from "@/utils/task-array-utils";

// Icons
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { HiOutlinePlus } from "react-icons/hi";
import TaskEditForm from "./TaskEditForm";

interface TaskHeaderProps {
  task: Planner;
  headerRef: React.RefObject<HTMLDivElement>; // Reference to the header div
  subtasks: Planner[]; // Array of subtasks of type Planner
  itemFocused: boolean; // Boolean indicating if the item is focused
  displayAddSubtask: boolean; // Boolean indicating if add subtask form is displayed
  setDisplayAddSubtask: React.Dispatch<React.SetStateAction<boolean>>; // Function to set displayAddSubtask
  subtasksMinimized: boolean; // Boolean indicating if subtasks are minimized
  setSubtasksMinimized: React.Dispatch<React.SetStateAction<boolean>>; // Function to set subtasksMinimized
  handleSetFocusedTask: () => void; // Function to handle setting the focused task
  totalTaskDuration: number; // Total duration of the task
  devMode: boolean; // Boolean indicating if dev mode is active
}

// TaskHeader component definition
export const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  headerRef,
  subtasks,
  itemFocused,
  displayAddSubtask,
  setDisplayAddSubtask,
  subtasksMinimized,
  setSubtasksMinimized,
  handleSetFocusedTask,
  totalTaskDuration,
  devMode,
}) => {
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);

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

          {itemFocused &&
            !displayEdit &&
            (displayAddSubtask ? (
              /* "ADD SUBTASK" FORM */

              <div className="flex items-center">
                <AddSubtask
                  task={task}
                  parentId={task.id}
                  subtasksLength={subtasks.length}
                />
                <button
                  onClick={() => {
                    setDisplayAddSubtask(false);
                  }}
                >
                  <ArrowUturnLeftIcon
                    className={`w-5 h-5 text-gray-300  ${
                      itemFocused ? "text-opacity-100" : "text-opacity-0"
                    } hover:text-gray-500`}
                  />
                </button>
              </div>
            ) : (
              /* BUTTON TO TOGGLE "ADD SUBTASK" FORM */

              <button
                className="flex items-center text-gray-300 hover:text-gray-500"
                onClick={() => {
                  setDisplayAddSubtask(true);
                }}
              >
                Add subtask
                <HiOutlinePlus className={`w-6 h-6 mr-5 ml-2 bg-none `} />
              </button>
            ))}
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
