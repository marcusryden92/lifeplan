import { Planner } from "@/lib/planner-class";

import {
  getSubtasksFromId,
  sortTasksByDependencies,
  getTreeBottomLayer,
} from "@/utils/goal-page-handlers";
import React from "react";

import { updateDependenciesOnDelete } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-delete";

interface UpdateDependenciesOnMoveInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  currentlyClickedItem: { taskId: string; taskTitle: string };
  currentlyHoveredItem: string;
  mouseLocationInItem: "top" | "middle" | "bottom" | null;
}

export function updateDependenciesOnMove({
  taskArray,
  setTaskArray,
  currentlyClickedItem,
  currentlyHoveredItem,
  mouseLocationInItem,
}: UpdateDependenciesOnMoveInterface) {
  // Check that arguments are defined
  if (
    !taskArray ||
    !currentlyClickedItem ||
    !currentlyHoveredItem ||
    !mouseLocationInItem
  )
    return;
  // Return if you're dropping the item unto itself
  if (currentlyClickedItem.taskId === currentlyHoveredItem) return;

  // The task we're moving
  const task = taskArray.find((t) => t.id === currentlyClickedItem.taskId);

  if (!task) {
    throw new Error("Couldn't find task in updateDependenciesOnMove.");
  }

  // The target
  const target = taskArray.find((t) => t.id === currentlyHoveredItem);

  if (!target) {
    throw new Error("Couldn't find target in updateDependenciesOnMove.");
  }

  // Get the tree bottom layer for task, in order to properly update dependencies
  const treeBottomLayer = getTreeBottomLayer(
    taskArray,
    currentlyClickedItem.taskId
  );
  const sortedBottomLayer = sortTasksByDependencies(taskArray, treeBottomLayer);

  // Get first and last task of the bottom layer, for setting correct dependencies
  const firstBottomLayerItem = sortedBottomLayer[0];
  const lastBottomLayerItem = sortedBottomLayer[sortedBottomLayer.length - 1];

  // We can use this function to stitch together the hole that currentlyClickedItem
  // leaves behind
  updateDependenciesOnDelete({
    taskArray,
    setTaskArray,
    taskId: task.id,
    parentId: task.parentId,
  });

  if (mouseLocationInItem === "middle") {
    moveToMiddle({
      taskArray,
      setTaskArray,
      currentlyClickedItem,
      currentlyHoveredItem,
      firstBottomLayerItem,
      lastBottomLayerItem,
      target,
    });
  }
}

interface MoveToMiddleInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  currentlyClickedItem: { taskId: string; taskTitle: string };
  currentlyHoveredItem: string;
  firstBottomLayerItem: Planner;
  lastBottomLayerItem: Planner;
  target: Planner;
}

function moveToMiddle({
  taskArray,
  setTaskArray,
  currentlyClickedItem,
  currentlyHoveredItem,
  firstBottomLayerItem,
  lastBottomLayerItem,
  target,
}: MoveToMiddleInterface) {
  // Get the last item in the child layer of the target item
  const targetSubtasks = getSubtasksFromId(taskArray, currentlyHoveredItem);
  const sortedSubtasks = sortTasksByDependencies(taskArray, targetSubtasks);

  // Get the bottom layer of that last item
  const targetLastItem = sortedSubtasks[sortedSubtasks.length - 1];
  let targetLastItemBottomLayer: Planner[] = [];
  if (targetLastItem) {
    targetLastItemBottomLayer = sortTasksByDependencies(
      taskArray,
      getTreeBottomLayer(taskArray, targetLastItem.id)
    );
  }

  // Get last task of last item bottom layer
  let targetLastBottomLayerItem: Planner | undefined;
  if (targetLastItemBottomLayer.length !== 0) {
    targetLastBottomLayerItem =
      targetLastItemBottomLayer[targetLastItemBottomLayer.length - 1];
  }
  // Get whatever item is dependent on targetLastBottomLayerItem
  let lastItemDependent: Planner | undefined;
  if (targetLastBottomLayerItem) {
    lastItemDependent = taskArray.find(
      (task) => task.dependency === targetLastBottomLayerItem.id
    );
  }

  setTaskArray((prev) =>
    prev.map((t) => {
      // Update the dependency in the item that now will come after the moved task, to be the moved task
      // (or whatever comes last in moved task's dependency chain)
      if (lastItemDependent && t.id === lastItemDependent.id) {
        return { ...t, dependency: lastBottomLayerItem.id };
      }

      // We're checking of firstBottomLayerItem and lastBottomLayerItem are the same,
      // i.e if currentlyClickedItem lacks any children and is the item that should be modified
      if (
        t.id === currentlyClickedItem.taskId &&
        firstBottomLayerItem.id === lastBottomLayerItem.id
      ) {
        return {
          ...t,
          dependency: targetLastBottomLayerItem
            ? targetLastBottomLayerItem.id
            : undefined,
          parentId: target.id,
        };

        // If that isn't the case, we find the first item in currentlyClickedItem's
        // dependency chain, and sets it's dependency to whatever is last in the dependency
        // chain of the item that will now come before currentlyClickedItem
      } else if (!(firstBottomLayerItem.id === lastBottomLayerItem.id)) {
        if (t.id === firstBottomLayerItem.id) {
          return {
            ...t,
            dependency: targetLastBottomLayerItem
              ? targetLastBottomLayerItem.id
              : undefined,
          };
        }
      }

      return t;
    })
  );
}
