"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { CheckCircledIcon } from "@radix-ui/react-icons";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateTimePicker } from "@/components/utilities/time-picker/DateTimePicker";

import AddSubtask from "./task-item-subcomponents/AddSubtask";
import TaskList from "./TaskList";
import RootTaskListWrapper from "./task-item-subcomponents/RootTaskListWrapper";

// Local utilities
import { Planner } from "@prisma/client";
import { SimpleEvent } from "@prisma/client";
import { getSubtasksById } from "@/utils/goalPageHandlers";

import {
  totalSubtaskDuration,
  formatMinutesToHours,
} from "@/utils/taskArrayUtils";

type GoalProps = {
  mainPlanner: Planner[];
  task: Planner;
  focusedTask: string | null;
  setMainPlanner: (
    arg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => void;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
  handleDeleteTask: (taskId: string) => void;
  handleConfirmEdit: (taskId: string, newTitle: string) => void;
  handleToggleReady: (taskId: string) => void;
  handleUpdateDeadline: (taskId: string, deadline: Date | null) => void;
  devMode: boolean;
};

const Goal = ({
  mainPlanner,
  task,
  focusedTask,
  setFocusedTask,
  handleDeleteTask,
  handleConfirmEdit,
  handleToggleReady,
  handleUpdateDeadline,
  devMode,
}: GoalProps) => {
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(task.title);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    task.deadline ?? undefined
  );

  // Get subtasks
  const subtasks = useMemo(
    () => getSubtasksById(mainPlanner, task.id),
    [mainPlanner, task.id]
  );

  // Calculate total duration with memoization
  const totalDuration = useMemo(
    () => totalSubtaskDuration(task.id, mainPlanner),
    [task.id, mainPlanner]
  );

  // Update parent component when selectedDate changes
  useEffect(() => {
    if (selectedDate !== task.deadline) {
      handleUpdateDeadline(task.id, selectedDate ?? null);
    }
  }, [selectedDate, task.id, task.deadline, handleUpdateDeadline]);

  // UI handlers
  const toggleEditMode = useCallback(() => {
    setDisplayEdit((prev) => !prev);
    setEditTitle(task.title);
  }, [task.title]);

  const confirmEdit = useCallback(() => {
    handleConfirmEdit(task.id, editTitle);
    setDisplayEdit(false);
  }, [task.id, editTitle, handleConfirmEdit]);

  const handleResetDate = useCallback(() => {
    handleUpdateDeadline(task.id, null);
    setSelectedDate(undefined);
  }, [task.id, handleUpdateDeadline]);

  return (
    <div className="flex flex-col w-full h-full group hover:shadow-md px-12 py-4 transition-colors duration-300 text-black">
      <>
        {/* TITLE AND NAME EDITOR */}
        {displayEdit ? (
          <div className="flex gap-2 items-center">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={`bg-gray-200 bg-opacity-25 border-none m-0 text-sm h-auto `}
              aria-label="Edit goal title"
            />
            <Button
              size="xs"
              variant="invisible"
              onClick={confirmEdit}
              aria-label="Confirm edit"
            >
              <CheckIcon className="w-6 h-6 p-0 bg-none text-sky-500 hover:opacity-50" />
            </Button>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center border-b border-gray-600 border-opacity-15 pb-1">
            <div className="flex-grow flex justify-between items-center max-w-[250px]">
              <div className="flex items-center gap-2">
                <div className="truncate">{task.title.toUpperCase()}</div>
                <button
                  disabled={subtasks.length === 0}
                  className={`${subtasks.length === 0 && "opacity-40"}`}
                  onClick={() => handleToggleReady(task.id)}
                  aria-label={`Mark goal ${task.isReady ? "not ready" : "ready"}`}
                >
                  <CheckCircledIcon
                    className={`h-8 w-8 rounded-full ${
                      task.isReady && "bg-emerald-400"
                    }`}
                  />
                </button>
              </div>

              {devMode && (
                <span>
                  <span className="font-bold">ID: </span>
                  {task.id.substring(0, 4)}
                </span>
              )}
            </div>
            <div className="flex flex-row space-x-2 items-center ml-auto transition-opacity">
              <>
                <button
                  onClick={toggleEditMode}
                  className="cursor-pointer text-gray-400 hover:text-blue-400"
                  aria-label="Edit goal"
                >
                  <PencilIcon
                    className={`w-5 h-5 ${
                      task.type === "goal" ? "text-black" : ""
                    }`}
                  />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="cursor-pointer text-gray-400 hover:text-red-400"
                  aria-label="Delete goal"
                >
                  <TrashIcon
                    className={`w-5 h-5 ${
                      task.type === "goal" ? "text-black" : ""
                    }`}
                  />
                </button>
              </>
            </div>
          </div>
        )}

        {/* DATE PICKER */}
        <div className="flex flex-row justify-between items-center border-b border-gray-600 border-opacity-15 py-1">
          <div className="flex items-center">
            <span className="min-w-24 text-sm">{"Target date:  "}</span>
            <div className="flex items-center space-x-2">
              <DateTimePicker
                date={selectedDate ?? undefined}
                setDate={setSelectedDate ?? undefined}
                color="gray-300"
              />
              <button
                onClick={handleResetDate}
                aria-label="Clear deadline date"
              >
                <XMarkIcon className="cursor-pointer w-6 h-6 text-destructive" />
              </button>
            </div>
          </div>
          <div className="flex flex-row justify-between items-center space-x-2 border-opacity-15 py-2">
            <div className="flex w-full justify-between items-center">
              <span className="min-w-24 text-sm">
                {"Total duration:  " + formatMinutesToHours(totalDuration)}
              </span>
            </div>
          </div>
        </div>

        {/* SUBTASKS LIST */}
        <div className="flex py-2 overflow-y-scroll w-full no-scrollbar flex-grow">
          <RootTaskListWrapper subtasksLength={subtasks.length}>
            <TaskList
              id={task.id}
              focusedTask={focusedTask}
              setFocusedTask={setFocusedTask}
            />
          </RootTaskListWrapper>
        </div>

        <AddSubtask task={task} parentId={task.id} isMainParent />
      </>
    </div>
  );
};

export default Goal;
