import { Planner } from "@/lib/planner-class";

import {
  sortTasksByDependencies,
  getTreeBottomLayer,
  getRootParent,
} from "@/utils/goal-page-handlers";
import React from "react";

import { updateDependenciesOnDelete } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-delete";
import { assert } from "@/utils/assert/assert";

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

interface PlaceTaskIntoTargetInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  movedTask: Planner;
  targetTask: Planner;
  movedTaskFirstBLI: Planner;
  movedTaskLastBLI: Planner;
  targetLastBLI: Planner;
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

  assert(movedTask, "Couldn't find movedTask in updateDependenciesOnMove.");

  // The target
  const targetTask: Planner | undefined = taskArray.find(
    (t) => t.id === currentlyHoveredItem
  );

  assert(targetTask, "Couldn't find target in updateDependenciesOnMove.");

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
  // Root parent of the goal
  const goalRootParent: string | undefined = getRootParent(
    taskArray,
    movedTask.id
  );

  assert(
    goalRootParent,
    "Couldn't find goalRootParent in updateDependenciesOnMove / moveToMiddle"
  );

  // Get the last item in the child layer of the target item
  const targetSubtasks = getTreeBottomLayer(taskArray, targetTask.id);
  const sortedSubtasks = sortTasksByDependencies(taskArray, targetSubtasks);
  const targetLastBLI = sortedSubtasks[sortedSubtasks.length - 1];

  /* 

  CASE 1: TARGET TASK IS FIRST IN THE DEPENDENCY CHAIN OR HAS ONLY ONE CHILD, WHICH IS

  Action:
  1. Confirm that targetLastBLI has no dependency, meaning it is the first item in the chain.
  2. Clear the dependency of movedTaskFirstBLI.
  3. Update the moved item's parent ID to the target ID.
  
  */

  if (!targetLastBLI.dependency) {
    // Check if targetLastBLI has a dependent
    const targetLastBLIDependent = taskArray.find(
      (t) => t.dependency === targetLastBLI.id
    );
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

        // Set the updated targetLastBLIDependent dependency
        if (targetLastBLIDependent && t.id === targetLastBLIDependent.id) {
          return { ...t, dependency: movedTask.id };
        }

        return t;
      })
    );

    return;
  }

  /* 
  CASE 2: MOVED TASK IS FIRST IN THE DEPENDENCY CHAIN AND A CHILD OF THE ROOT PARENT TASK

  Action:
  1. Identify movedTaskFirstBLI, which has no dependency and the root parent as its parent, 
     making it the first and top item of the dependency chain.
  2. Clear the dependency of the item that depends on movedTaskLastBLI 
     to designate that item as the new root task.
  3. Move movedTask to the target location using placeTaskIntoTarget().
  */

  if (!movedTaskFirstBLI.dependency && movedTask.parentId === goalRootParent) {
    setTaskArray((prev) =>
      prev.map((t) => {
        if (t.dependency === movedTaskLastBLI.id) {
          return { ...t, dependency: undefined };
        }
        return t;
      })
    );

    placeTaskIntoTarget({
      taskArray,
      setTaskArray,
      movedTask,
      targetTask,
      movedTaskFirstBLI,
      movedTaskLastBLI,
      targetLastBLI,
    });

    return;
  }

  /* 
  CASE 3: MOVED TASK IS FIRST IN THE DEPENDENCY CHAIN BUT NOT A CHILD OF THE ROOT PARENT TASK

  Action:
  1. The item next in the dependency chain after movedTaskLastBLI will have its dependency set 
     to the parentId of movedTask.
  2. The parent task becomes the new first item in the dependency chain.
  */

  if (!movedTaskFirstBLI.dependency) {
    const movedTaskLastBLIDependent = taskArray.find(
      (t) => t.dependency === movedTaskLastBLI.id
    );

    assert(
      movedTaskLastBLIDependent,
      "Couldn't find movedTaskLastBLIDependent at updateDependenciesOnMove / moveToMiddle!"
    );

    setTaskArray((prev) =>
      prev.map((t) => {
        if (t.id === movedTaskLastBLIDependent.id) {
          return { ...t, dependency: movedTask.parentId };
        }
        return t;
      })
    );

    placeTaskIntoTarget({
      taskArray,
      setTaskArray,
      movedTask,
      targetTask,
      movedTaskFirstBLI,
      movedTaskLastBLI,
      targetLastBLI,
    });

    return;
  }

  placeTaskIntoTarget({
    taskArray,
    setTaskArray,
    movedTask,
    targetTask,
    movedTaskFirstBLI,
    movedTaskLastBLI,
    targetLastBLI,
  });

  // We can use this function to stitch together the hole that currentlyClickedItem
  // leaves behind
  updateDependenciesOnDelete({
    taskArray,
    setTaskArray,
    taskId: movedTask.id,
    parentId: movedTask.parentId,
  });
}

function placeTaskIntoTarget({
  taskArray,
  setTaskArray,
  movedTask,
  targetTask,
  movedTaskFirstBLI,
  movedTaskLastBLI,
  targetLastBLI,
}: PlaceTaskIntoTargetInterface) {
  // Get the bottom layer of the last item of the target task
  const targetLastItemBottomLayer: Planner[] = sortTasksByDependencies(
    taskArray,
    getTreeBottomLayer(taskArray, targetLastBLI.id)
  );

  // Get last task of last item bottom layer
  const targetLastBottomLayerItem: Planner =
    targetLastItemBottomLayer[targetLastItemBottomLayer.length - 1];

  // Get whatever item is dependent on targetLastBottomLayerItem
  const lastItemDependent: Planner | undefined = taskArray.find(
    (task) => task.dependency === targetLastBottomLayerItem.id
  );

  // Check if targetTask has children
  const targetHasChildren =
    taskArray.filter((t) => t.parentId === targetTask.id).length > 0;

  setTaskArray((prev) =>
    prev.map((t) => {
      // Update the dependency in the item that now will come after the moved task, to be the moved task
      // (or whatever comes last in moved task's dependency chain)
      if (lastItemDependent && t.id === lastItemDependent.id) {
        return { ...t, dependency: movedTaskLastBLI.id };
      }

      // CASE 1: If target HAS children
      if (targetHasChildren) {
        // Case 1a: movedTask LACKS any children and is the only item that should be modified
        if (
          t.id === movedTask.id &&
          movedTaskFirstBLI.id === movedTask.id &&
          movedTaskFirstBLI.id === movedTaskLastBLI.id
        ) {
          return {
            ...t,
            dependency: targetLastBottomLayerItem
              ? targetLastBottomLayerItem.id
              : undefined,
            parentId: targetTask.id,
          };
        } else if (!(movedTaskFirstBLI.id === movedTaskLastBLI.id)) {
          /* 
          Case 1b: movedTask HAS children:
          Find the first item in movedTask's dependency chain,
          and sets it's dependency to whatever is last in the dependency
          chain of the item that will now come before movedTask 
          */
          if (t.id === movedTaskFirstBLI.id) {
            return {
              ...t,
              dependency: targetLastBottomLayerItem
                ? targetLastBottomLayerItem.id
                : undefined,
            };
          } else if (t.id === movedTask.id) {
            return { ...t, parentId: targetTask.id };
          }
        }
      }

      // CASE 2: Target DOESN'T have children
      else {
        // Case 2a: Checking if movedTask lacks any children and is the only item that should be modified
        if (
          movedTaskFirstBLI.id === movedTask.id &&
          movedTaskFirstBLI.id === movedTaskLastBLI.id
        ) {
          // Change the movedTask parent to targetTask and move targetTask's dependency
          // to sit on movedTask instead
          if (t.id === movedTask.id) {
            // If moving movedTask into its dependent, just update movedTask parentId and keep the dependency
            if (targetTask.dependency === movedTask.id) {
              return {
                ...t,
                parentId: targetTask.id,
              };
            }

            // Otherwise set the movedTask dependency to whatever was the dependency of the targetTask
            return {
              ...t,
              dependency: targetTask.dependency
                ? targetTask.dependency
                : undefined,
              parentId: targetTask.id,
            };
          }

          // And clear the dependency of targetTask
          if (t.id === targetTask.id) {
            return { ...t, dependency: undefined };
          }
        }

        // Case 2b: If movedTask HAS children
        else {
          // Move the dependency from targetTask to movedTaskFirstBLI
          if (t.id === movedTaskFirstBLI.id) {
            return {
              ...t,
              dependency: targetTask.dependency,
            };
          }
          // And clear the dependency of targetTask
          else if (t.id === targetTask.id) {
            return { ...t, dependency: undefined };
          }
        }
      }

      return t;
    })
  );

  console.log("moveToMiddle:");
  console.log(taskArray);
}
