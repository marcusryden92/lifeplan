import { Planner } from "@/lib/planner-class";
import React from "react";

import {
  getGoalTree,
  getSortedTreeBottomLayer,
  deleteGoal_ReturnArray,
} from "@/utils/goal-page-handlers";

type MoveToEdgeProps = {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  movedTask: Planner;
  movedTaskFirstBLI: Planner;
  movedTaskLastBLI: Planner;
  targetTask: Planner;
  mouseLocationInTarget: "top" | "bottom";
};

export function moveToEdge({
  taskArray,
  setTaskArray,
  movedTask,
  movedTaskFirstBLI,
  movedTaskLastBLI,
  targetTask,
  mouseLocationInTarget,
}: MoveToEdgeProps) {
  let movedTaskTree = getGoalTree(taskArray, movedTask.id);

  // Get the last item in the child layer of the target item
  const targetSortedBottomLayer = getSortedTreeBottomLayer(
    taskArray,
    targetTask.id
  );

  const targetTaskFirstBLI = targetSortedBottomLayer[0];
  const targetTaskLastBLI =
    targetSortedBottomLayer[targetSortedBottomLayer.length - 1];
  const targetTaskLastBLIDependent = taskArray.find(
    (t) => t.dependency === targetTask.id
  );

  let updatedArray: Planner[] = deleteGoal_ReturnArray({
    taskArray,
    setTaskArray,
    taskId: movedTask.id,
    parentId: movedTask.parentId,
  });

  movedTaskTree = movedTaskTree.map((t) => {
    if (t.id === movedTask.id)
      return {
        ...t,
        parentId: targetTask.parentId,
      };

    if (mouseLocationInTarget === "top" && t.id === movedTaskFirstBLI.id) {
      return { ...t, dependency: targetTaskFirstBLI.dependency };
    }

    if (mouseLocationInTarget === "bottom" && t.id === movedTaskFirstBLI.id) {
      return { ...t, dependency: targetTaskLastBLI.id };
    }

    return t;
  });

  updatedArray = updatedArray.map((t) => {
    if (mouseLocationInTarget === "top" && t.id === targetTaskFirstBLI.id) {
      return { ...t, dependency: movedTaskLastBLI.id };
    }

    if (
      mouseLocationInTarget === "bottom" &&
      t.dependency === targetTaskLastBLI.id
    ) {
      return { ...t, dependency: movedTaskLastBLI.id };
    }

    return t;
  });

  updatedArray.push(...movedTaskTree);

  setTaskArray(updatedArray);
}
