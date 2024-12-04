import React from "react";

import { Planner } from "@/lib/planner-class";

import {
  sortTasksByDependencies,
  getTreeBottomLayer,
  getRootParent,
} from "@/utils/goal-page-handlers";

import { updateDependenciesOnDelete } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-delete";
import { moveToMiddle } from "./move-to-middle";
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
