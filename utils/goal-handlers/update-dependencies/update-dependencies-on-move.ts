import { Planner } from "@/lib/planner-class";

import {
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
  mouseLocationInTarget: "top" | "middle" | "bottom" | null;
}

interface MoveToMiddleInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  movedTask: Planner;
  targetTask: Planner;
  movedTaskFirstBLI: Planner;
  movedTaskLastBLI: Planner;
}

export function updateDependenciesOnMove({
  taskArray,
  setTaskArray,
  currentlyClickedItem,
  currentlyHoveredItem,
  mouseLocationInTarget,
}: UpdateDependenciesOnMoveInterface) {
  // Check that arguments are defined
  if (
    !taskArray ||
    !currentlyClickedItem ||
    !currentlyHoveredItem ||
    !mouseLocationInTarget
  )
    return;
  // Return if you're dropping the item unto itself
  if (currentlyClickedItem.taskId === currentlyHoveredItem) return;

  // The task we're moving
  const movedTask: Planner | undefined = taskArray.find(
    (t) => t.id === currentlyClickedItem.taskId
  );

  if (!movedTask) {
    throw new Error("Couldn't find movedTask in updateDependenciesOnMove.");
  }

  // The target
  const targetTask: Planner | undefined = taskArray.find(
    (t) => t.id === currentlyHoveredItem
  );

  if (!targetTask) {
    throw new Error("Couldn't find target in updateDependenciesOnMove.");
  }

  // Get the tree bottom layer for task, in order to properly update dependencies
  const treeBottomLayer = getTreeBottomLayer(taskArray, movedTask.id);
  const sortedBottomLayer = sortTasksByDependencies(taskArray, treeBottomLayer);

  // Get the first and last Bottom Layer Item (BLI) of the moved task,
  // for setting correct dependencies
  const movedTaskFirstBLI = sortedBottomLayer[0];
  const movedTaskLastBLI = sortedBottomLayer[sortedBottomLayer.length - 1];

  if (mouseLocationInTarget === "middle") {
    moveToMiddle({
      taskArray,
      setTaskArray,
      movedTask,
      targetTask,
      movedTaskFirstBLI,
      movedTaskLastBLI,
    });
  }
}

// Function for moving an item to the middle (or into), the target item
function moveToMiddle({
  taskArray,
  setTaskArray,
  movedTask,
  targetTask,
  movedTaskFirstBLI,
  movedTaskLastBLI,
}: MoveToMiddleInterface) {
  // Get the last item in the child layer of the target item
  const targetSubtasks = getTreeBottomLayer(taskArray, targetTask.id);
  const sortedSubtasks = sortTasksByDependencies(taskArray, targetSubtasks);
  const targetLastBLI = sortedSubtasks[sortedSubtasks.length - 1];

  // If the targetLastItem lacks a dependency, i.e if it's the first item in the chain,
  // simply clear dependency of the movedTaskFirstBLI, and change the
  // moved item's parent ID to the target ID.
  if (!targetLastBLI.dependency) {
    setTaskArray((prev) =>
      prev.map((t) => {
        // movedTaskFirstBLI.id === movedTask.id means that movedTask has NO CHILDREN,
        // in which case we need to change both the parentId and dependency of the movedTask
        if (
          t.id === movedTaskFirstBLI.id &&
          movedTaskFirstBLI.id === movedTask.id
        ) {
          return { ...t, parentId: targetTask.id, dependency: undefined };
        }

        // Otherwise (if movedTask HAS CHILDREN), clear the dependency of the movedTaskFirstBLI
        if (t.id === movedTaskFirstBLI.id) {
          return { ...t, dependency: undefined };
        }

        // And change the parentId of movedTask to targetTask.id
        if (t.id === movedTask.id) {
          return { ...t, parentId: targetTask.id };
        }

        return t;
      })
    );

    return;
  }

  // If the movedTaskFirstBLI lacks a dependency, it means that we're moving the first item of the
  // dependency chain, and we need to clear the dependency of whichever item has movedTaskLastBLI as
  // its dependency, in order to make that item the new root task.
  if (!movedTaskFirstBLI.dependency) {
    setTaskArray((prev) =>
      prev.map((t) => {
        if (
          t.id === movedTaskFirstBLI.id &&
          movedTaskFirstBLI.id === movedTask.id
        ) {
          return { ...t, parentId: targetTask.id, dependency: "" };
        }

        if (t.id === movedTaskFirstBLI.id) {
          return { ...t, dependency: undefined };
        }

        if (t.id === movedTask.id) {
          return { ...t, parentId: targetTask.id };
        }

        return t;
      })
    );
  }

  // We can use this function to stitch together the hole that currentlyClickedItem
  // leaves behind
  updateDependenciesOnDelete({
    taskArray,
    setTaskArray,
    taskId: movedTask.id,
    parentId: movedTask.parentId,
  });

  // Get the bottom layer of that last item
  let targetLastItemBottomLayer: Planner[] = [];
  if (targetLastBLI) {
    targetLastItemBottomLayer = sortTasksByDependencies(
      taskArray,
      getTreeBottomLayer(taskArray, targetLastBLI.id)
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
        return { ...t, dependency: movedTaskLastBLI.id };
      }

      // We're checking of movedTaskFirstBLI and movedTaskLastBLI are the same,
      // i.e if currentlyClickedItem lacks any children and is the item that should be modified
      if (
        t.id === movedTask.id &&
        movedTaskFirstBLI.id === movedTaskLastBLI.id
      ) {
        return {
          ...t,
          dependency: targetLastBottomLayerItem
            ? targetLastBottomLayerItem.id
            : undefined,
          parentId: targetTask.id,
        };

        // If that isn't the case, we find the first item in currentlyClickedItem's
        // dependency chain, and sets it's dependency to whatever is last in the dependency
        // chain of the item that will now come before currentlyClickedItem
      } else if (!(movedTaskFirstBLI.id === movedTaskLastBLI.id)) {
        if (t.id === movedTaskFirstBLI.id) {
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
