"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Components
import TaskDisplay from "./TaskDisplay";

// Definitions
import { TaskHeaderProps } from "@/lib/taskItem";

import TaskEditForm from "./TaskEditForm";
import AddSubtaskWrapper from "./AddSubtaskWrapper";
import DurationDisplay from "./DurationDisplay";

import { useDraggableContext } from "@/components/draggable/DraggableContext";
import { LocationSelector } from "@/components/locations/LocationSelector";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  assignLocationToPlanner,
  assignLocationToMultiplePlanners,
  setUseParentLocation,
  setUseParentLocationMultiple,
} from "@/actions/locations";
import { getGoalTree } from "@/utils/goalPageHandlers";

export const TaskHeader = ({
  task,
  subtasks,
  itemIsFocused,
  setItemIsFocused,
  focusedTask,
  setFocusedTask,
  devMode,
}: TaskHeaderProps) => {
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [displayAddSubtask, setDisplayAddSubtask] = useState<boolean>(false);
  const [showCascadeConfirm, setShowCascadeConfirm] = useState<boolean>(false);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const { currentlyClickedItem, displayDragBox } = useDraggableContext();
  const { planner, updatePlannerArray, inheritedLocationMap } = useCalendarProvider();

  const hasChildren = subtasks.length > 0;

  const inheritedInfo = inheritedLocationMap.get(task.id);

  const [locationOverrideEnabled, setLocationOverrideEnabled] = useState(
    () => !task.useParentLocation
  );

  useEffect(() => {
    setLocationOverrideEnabled(!task.useParentLocation);
  }, [task.useParentLocation]);

  const handleToggleLocationOverride = useCallback(async () => {
    const newOverrideEnabled = !locationOverrideEnabled;

    if (!newOverrideEnabled && hasChildren) {
      setPendingLocationId(null);
      setShowCascadeConfirm(true);
      setLocationOverrideEnabled(false);
      return;
    }

    const newUseParent = !newOverrideEnabled;
    await setUseParentLocation(task.id, newUseParent);
    updatePlannerArray((prev) =>
      prev.map((p) =>
        p.id === task.id ? { ...p, useParentLocation: newUseParent } : p
      )
    );
    setLocationOverrideEnabled(newOverrideEnabled);
  }, [locationOverrideEnabled, hasChildren, task.id, updatePlannerArray]);

  const handleLocationChange = async (locationId: string | null) => {
    // If task has children, ask about cascading
    if (hasChildren) {
      setPendingLocationId(locationId);
      setShowCascadeConfirm(true);
      return;
    }

    // No children, just update this item
    await applyLocationChange(locationId, false);
  };

  const applyLocationChange = async (
    locationId: string | null,
    cascade: boolean
  ) => {
    try {
      const treeItems = getGoalTree(planner, task.id);
      const treeIds = treeItems.map((item) => item.id);

      if (locationId === null && !locationOverrideEnabled) {
        // Toggling override OFF — set useParentLocation=true, preserve locationId
        if (cascade) {
          await setUseParentLocationMultiple(treeIds, true);
          updatePlannerArray((prev) =>
            prev.map((p) =>
              treeIds.includes(p.id) ? { ...p, useParentLocation: true } : p
            )
          );
        } else {
          await setUseParentLocation(task.id, true);
          updatePlannerArray((prev) =>
            prev.map((p) =>
              p.id === task.id ? { ...p, useParentLocation: true } : p
            )
          );
        }
      } else if (cascade) {
        await assignLocationToMultiplePlanners(treeIds, locationId);
        updatePlannerArray((prev) =>
          prev.map((p) =>
            treeIds.includes(p.id) ? { ...p, locationId: locationId } : p
          )
        );
      } else {
        await assignLocationToPlanner(task.id, locationId);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setItemIsFocused(false);
        setFocusedTask(null);
      }
    };

    if (itemIsFocused) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [itemIsFocused]);

  const handleSetFocusedTask = () => {
    if (!(focusedTask === task.id)) setFocusedTask(task.id);
  };

  useEffect(() => {
    setItemIsFocused(task.id === focusedTask);
  }, [focusedTask, task.id]);

  useEffect(() => {
    if (!itemIsFocused) {
      setDisplayEdit(false);
    }
  });

  if (!task.parentId) return null;
  return (
    <div
      ref={headerRef}
      className={` flex justify-between rounded-sm items-center w-full flex-1 text-sm py-1 group ${
        displayDragBox &&
        currentlyClickedItem?.parentId === task.id &&
        "bg-gray-200 opacity-40"
      }`}
      onClick={() => {
        handleSetFocusedTask();
      }}
    >
      <div
        className={`flex items-center justify-between flex-grow ${
          subtasks.length !== 0 && !itemIsFocused && "opacity-50"
        }`}
      >
        <div className="flex items-center space-x-5">
          {displayEdit ? (
            <TaskEditForm
              task={task}
              subtasks={subtasks}
              setDisplayEdit={setDisplayEdit}
              itemIsFocused={itemIsFocused}
            />
          ) : (
            <TaskDisplay
              task={task}
              itemIsFocused={itemIsFocused}
              setDisplayEdit={setDisplayEdit}
              setDisplayAddSubtask={setDisplayAddSubtask}
              devMode={devMode}
            />
          )}

          {/* Location selector - shown when focused and not editing */}
          {itemIsFocused && !displayEdit && (
            <div onClick={(e) => e.stopPropagation()}>
              <LocationSelector
                value={task.locationId ?? null}
                onChange={handleLocationChange}
                compact
                isOverridden={locationOverrideEnabled}
                onToggleOverride={inheritedInfo ? handleToggleLocationOverride : undefined}
                inheritedLocationName={inheritedInfo?.locationName}
                inheritedFromLabel={inheritedInfo?.fromLabel}
              />
            </div>
          )}

          <AddSubtaskWrapper
            task={task}
            subtasks={subtasks}
            displayAddSubtask={displayAddSubtask}
            setDisplayAddSubtask={setDisplayAddSubtask}
            itemIsFocused={itemIsFocused}
            displayEdit={displayEdit}
          />
        </div>

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

        {/* DURATION DISPLAY */}

        {!displayEdit && (
          <DurationDisplay
            task={task}
            itemIsFocused={itemIsFocused}
            subtasksLength={subtasks.length}
          />
        )}
      </div>
    </div>
  );
};

export default TaskHeader;
