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
import PrioritySelector from "@/components/utilities/PrioritySelector";

// Local utilities
import { Planner } from "@/types/prisma";
import { SimpleEvent } from "@/types/prisma";
import { getSubtasksById } from "@/utils/goalPageHandlers";

import {
  totalSubtaskDuration,
  formatMinutesToHours,
} from "@/utils/taskArrayUtils";
import EventColorPicker from "@/components/events/EventColorPicker/EventColorPicker";
import { LocationSelector } from "@/components/locations/LocationSelector";
import {
  assignLocationToPlanner,
  assignLocationToMultiplePlanners,
} from "@/actions/locations";
import { getGoalTree } from "@/utils/goalPageHandlers";

type GoalProps = {
  planner: Planner[];
  task: Planner;
  updatePlannerArray: (
    arg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => void;
  handleDeleteTask: (taskId: string) => void;
  handleConfirmEdit: (taskId: string, newTitle: string) => void;
  handleToggleReady: (taskId: string) => void;
  handleUpdateDeadline: (taskId: string, deadline: string | null) => void;
  devMode: boolean;
};

const Goal = ({
  planner,
  task,
  updatePlannerArray,
  handleDeleteTask,
  handleConfirmEdit,
  handleToggleReady,
  handleUpdateDeadline,
  devMode,
}: GoalProps) => {
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(task.title);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    task.deadline ? new Date(task.deadline) : undefined
  );
  const [showCascadeConfirm, setShowCascadeConfirm] = useState<boolean>(false);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(
    null
  );

  const priority = task.priority ? Number(task.priority) : 5;

  // Get subtasks
  const subtasks = useMemo(
    () => getSubtasksById(planner, task.id),
    [planner, task.id]
  );

  // Calculate total duration with memoization
  const totalDuration = useMemo(
    () => totalSubtaskDuration(task.id, planner),
    [task.id, planner]
  );

  // Update parent component when selectedDate changes
  useEffect(() => {
    if (selectedDate && selectedDate.toISOString() !== task.deadline) {
      handleUpdateDeadline(task.id, selectedDate.toISOString());
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

  // Location change handler with cascade support
  const handleLocationChange = async (locationId: string | null) => {
    // If goal has subtasks, ask about cascading
    if (subtasks.length > 0) {
      setPendingLocationId(locationId);
      setShowCascadeConfirm(true);
      return;
    }

    // No subtasks, just update this item
    await applyLocationChange(locationId, false);
  };

  const applyLocationChange = async (
    locationId: string | null,
    cascade: boolean
  ) => {
    try {
      if (cascade) {
        // Get all items in the tree (this item + all descendants)
        const treeItems = getGoalTree(planner, task.id);
        const treeIds = treeItems.map((item) => item.id);

        await assignLocationToMultiplePlanners(treeIds, locationId);

        // Update local state for all items
        updatePlannerArray((prev) =>
          prev.map((p) =>
            treeIds.includes(p.id) ? { ...p, locationId: locationId } : p
          )
        );
      } else {
        await assignLocationToPlanner(task.id, locationId);

        // Update local state
        updatePlannerArray((prev) =>
          prev.map((p) =>
            p.id === task.id ? { ...p, locationId: locationId } : p
          )
        );
      }
    } catch (error) {
      console.error("Failed to update location:", error);
    } finally {
      setShowCascadeConfirm(false);
      setPendingLocationId(null);
    }
  };

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
                <LocationSelector
                  value={task.locationId ?? null}
                  onChange={handleLocationChange}
                  compact
                />
                <PrioritySelector
                  updatePlannerArray={updatePlannerArray}
                  taskId={task.id}
                  initialPriority={priority}
                />
                <EventColorPicker taskId={task.id} />
                <button
                  onClick={toggleEditMode}
                  className="cursor-pointer text-gray-400 hover:text-blue-400"
                  aria-label="Edit goal"
                >
                  <PencilIcon
                    className={`w-5 h-5 ${
                      task.itemType === "goal" ? "text-black" : ""
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
                      task.itemType === "goal" ? "text-black" : ""
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
            <TaskList id={task.id} />
          </RootTaskListWrapper>
        </div>

        <AddSubtask task={task} parentId={task.id} isMainParent />

        {/* Cascade confirmation dialog */}
        {showCascadeConfirm && (
          <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
            onClick={(e) => {
              e.stopPropagation();
              setShowCascadeConfirm(false);
              setPendingLocationId(null);
            }}
          >
            <div
              className="bg-white rounded-lg p-4 shadow-lg max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm text-gray-700 mb-4">
                Apply this location to all child items?
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  onClick={() => applyLocationChange(pendingLocationId, false)}
                >
                  This item only
                </button>
                <button
                  className="px-3 py-1.5 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded"
                  onClick={() => applyLocationChange(pendingLocationId, true)}
                >
                  All children
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </div>
  );
};

export default Goal;
