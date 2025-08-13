import { Planner } from "@/prisma/generated/client";

import {
  getGoalTree,
  getSortedTreeBottomLayer,
  deleteGoal_ReturnArray,
} from "@/utils/goalPageHandlers";

import { assert } from "@/utils/assert/assert";

import { ClickedItem } from "@/lib/taskItem";

type MoveToEdgeProps = {
  planner: Planner[];
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[])
  ) => void;
  currentlyClickedItem: ClickedItem;
  targetId: string;
  mouseLocationInItem: "top" | "bottom";
};

export function moveToEdge({
  planner,
  updatePlannerArray,
  currentlyClickedItem,
  targetId,
  mouseLocationInItem,
}: MoveToEdgeProps) {
  // Check that arguments are defined
  if (!planner || !currentlyClickedItem || !targetId) return;

  if (targetId === currentlyClickedItem.taskId) return;

  // The task we're moving
  const movedTask: Planner | undefined = planner.find(
    (t) => t.id === currentlyClickedItem.taskId
  );

  assert(movedTask, "Couldn't find movedTask in moveToMiddle.");

  // The target
  const targetTask: Planner | undefined = planner.find(
    (t) => t.id === targetId
  );

  /*  console.log("_______________");
  console.log(`moveToEdge-${mouseLocationInItem}`);
  console.log(currentlyClickedItem?.taskTitle);
  console.log(targetTask?.title);
  console.log("_______________"); */

  assert(targetTask, "Couldn't find targetTask in moveToMiddle.");

  // Get the tree bottom layer for task, in order to properly update dependencies
  const sortedBottomLayer = getSortedTreeBottomLayer(planner, movedTask.id);

  // Get the first and last Bottom Layer Item (BLI) of the moved task,
  // for setting correct dependencies
  const movedTaskFirstBLI: Planner = sortedBottomLayer[0];
  const movedTaskLastBLI: Planner =
    sortedBottomLayer[sortedBottomLayer.length - 1];

  let movedTaskTree = getGoalTree(planner, movedTask.id);

  let updatedArray: Planner[] = deleteGoal_ReturnArray({
    planner,
    updatePlannerArray,
    taskId: movedTask.id,
    parentId: movedTask.parentId ?? undefined,
  });

  // Get the last item in the child layer of the target item
  const targetSortedBottomLayer = getSortedTreeBottomLayer(
    updatedArray,
    targetTask.id
  );

  const targetTaskFirstBLI = targetSortedBottomLayer[0];
  const targetTaskLastBLI =
    targetSortedBottomLayer[targetSortedBottomLayer.length - 1];

  movedTaskTree = movedTaskTree.map((t) => {
    // If movedTask has no children
    if (
      t.id === movedTask.id &&
      mouseLocationInItem === "top" &&
      t.id === movedTaskFirstBLI.id
    ) {
      return {
        ...t,
        dependency: targetTaskFirstBLI.dependency,
        parentId: targetTask.parentId,
      };
    }

    if (
      t.id === movedTask.id &&
      mouseLocationInItem === "bottom" &&
      t.id === movedTaskFirstBLI.id
    ) {
      return {
        ...t,
        dependency: targetTaskLastBLI.id,
        parentId: targetTask.parentId,
      };
    }

    // If has children
    if (t.id === movedTask.id)
      return {
        ...t,
        parentId: targetTask.parentId,
      };

    if (mouseLocationInItem === "top" && t.id === movedTaskFirstBLI.id) {
      return { ...t, dependency: targetTaskFirstBLI.dependency };
    }

    if (mouseLocationInItem === "bottom" && t.id === movedTaskFirstBLI.id) {
      return { ...t, dependency: targetTaskLastBLI.id };
    }

    return t;
  });

  updatedArray = updatedArray.map((t) => {
    if (mouseLocationInItem === "top") {
      // Set targetTaskFirstBLI's dependency to be movedTaskLastBLI
      if (t.id === targetTaskFirstBLI.id)
        return { ...t, dependency: movedTaskLastBLI.id };
    }

    if (mouseLocationInItem === "bottom") {
      // Set the new dependency of item after target, to be the moved target's last ID
      if (t.dependency === targetTaskLastBLI.id)
        return { ...t, dependency: movedTaskLastBLI.id };
    }

    return t;
  });

  updatedArray.push(...movedTaskTree);

  updatePlannerArray(updatedArray);
}
