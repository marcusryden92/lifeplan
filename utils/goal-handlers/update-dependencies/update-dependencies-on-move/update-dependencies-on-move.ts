import React from "react";

import { Planner } from "@/lib/planner-class";

import {
  sortTasksByDependencies,
  getTreeBottomLayer,
} from "@/utils/goal-page-handlers";

import { moveToMiddle } from "./move-to-middle";
import { moveToEdge } from "./move-to-edge";
import { assert } from "@/utils/assert/assert";

interface UpdateDependenciesOnMoveInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  currentlyClickedItem: { taskId: string; taskTitle: string };
  currentlyHoveredItem: string;
  mouseLocationInTarget: "top" | "middle" | "bottom" | null;
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
  const movedTaskFirstBLI: Planner = sortedBottomLayer[0];
  const movedTaskLastBLI: Planner =
    sortedBottomLayer[sortedBottomLayer.length - 1];
  const movedTaskLastBLIDependent = taskArray.find(
    (t) => t.dependency === movedTaskLastBLI.id
  );

  if (mouseLocationInTarget === "middle") {
    moveToMiddle({
      taskArray,
      setTaskArray,
      movedTask,
      targetTask,
      movedTaskFirstBLI,
      movedTaskLastBLI,
      movedTaskLastBLIDependent,
    });
  } else if (
    mouseLocationInTarget === "top" ||
    mouseLocationInTarget === "bottom"
  ) {
    moveToEdge({
      taskArray,
      setTaskArray,
      movedTask,
      movedTaskFirstBLI,
      movedTaskLastBLI,
      targetTask,
      mouseLocationInTarget,
    });
  }
}
