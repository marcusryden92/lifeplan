import React from "react";

// Types
import { Planner } from "@/lib/planner-class";

// Utils
import { getRootParent, getSortedSubtasks } from "@/utils/goal-page-handlers";
import { getSubtasksFromId } from "@/utils/goal-page-handlers";
import {
  updateTaskArray,
  transferDependencyOwnership,
  InstructionsType,
} from "../update-dependencies-utils";
import { assert } from "@/utils/assert/assert";
import { updateDependenciesOnDelete } from "../update-dependencies-on-delete";

interface MoveToMiddleInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  movedTask: Planner;
  targetTask: Planner;
  movedTaskFirstBLI: Planner;
  movedTaskLastBLI: Planner;
  movedTaskLastBLIDependent?: Planner;
}

// Function for moving an item to the middle (or into), the target item
export function moveToMiddle({
  taskArray,
  setTaskArray,
  movedTask,
  targetTask,
  movedTaskFirstBLI,
  movedTaskLastBLI,
  movedTaskLastBLIDependent,
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

  // movedTask's parent
  const movedTaskParent = taskArray.find((t) => t.id === movedTask.parentId);

  // Get the last item in the child layer of the target item
  const targetSubtasks = getSortedSubtasks(taskArray, targetTask.id);

  const targetTaskFirstBLI = targetSubtasks[0];
  const targetTaskLastBLI = targetSubtasks[targetSubtasks.length - 1];
  const targettaskLastBLIDependent = taskArray.find(
    (t) => t.dependency === targetTask.id
  );

  // Conditions
  const movedTaskHasChildren =
    getSubtasksFromId(taskArray, movedTask.id).length === 0;
  const movedTaskHasSiblings = movedTask.parentId
    ? getSubtasksFromId(taskArray, movedTask.parentId).length === 0
    : false;
  const movedTaskIsDependencyRoot = !movedTaskFirstBLI.dependency;
  const targetIsNextDependent = targetTask.dependency === movedTaskLastBLI.id;

  /*   
  movedTask has no siblings / has siblings
  targetTask has children / no children
  movedTask has no children / has children
  movedTaskFirstBLI is dependency root / not dependency root
  targetTask is movedTask's nextDependent / not nextDependent 
  */

  if (targetIsNextDependent) {
    handleTargetIsNextDependent(
      setTaskArray,
      movedTask,
      targetTask,
      movedTaskParent
    );
  } else {
    // Actions depending on if movedTask has siblings or not
    handleMovedTaskSiblings(
      taskArray,
      setTaskArray,
      movedTask,
      movedTaskHasSiblings
    );

    // Actions depending on if targetTask has children or not
    updateMovedTask(
      setTaskArray,
      movedTask,
      targetTask,
      targetTaskFirstBLI,
      targettaskLastBLIDependent
    );
  }
}

function handleTargetIsNextDependent(
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  movedTask: Planner,
  targetTask: Planner,
  movedTaskParent?: Planner
) {
  // If target is movedTasks next dependent, only update movedTask.parentId to targetTask,
  // and change movedTaskParent's dependency to movedTask, if there is a parent

  const instructions: InstructionsType[] = [
    {
      conditional: `t.id === ${movedTask.id}`,
      updates: {
        parentId: targetTask.id,
      },
    },
    {
      conditional: movedTaskParent ? `t.id === ${movedTaskParent.id}` : "false",
      updates: {
        dependency: movedTask.id,
      },
    },
  ];

  updateTaskArray(setTaskArray, instructions);
}

function handleMovedTaskSiblings(
  taskArray: Planner[],
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  movedTask: Planner,
  hasSiblings: boolean
) {
  // If movedTask has siblings, stitch the vacancy as if it was deleted
  if (hasSiblings) {
    updateDependenciesOnDelete({
      taskArray,
      setTaskArray,
      taskId: movedTask.id,
      parentId: movedTask.parentId,
    });
  }

  // If if no siblings, transfer ownership of dependencies to parent
  else {
    const movedTaskParent = taskArray.find((t) => t.id === movedTask.parentId);
    if (movedTaskParent) {
      transferDependencyOwnership(
        taskArray,
        setTaskArray,
        movedTask,
        movedTaskParent
      );
    }
  }
}

function updateMovedTask(
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  movedTask: Planner,
  targetTask: Planner,
  targetTaskFirstBLI: Planner,
  targettaskLastBLIDependent: Planner | undefined
) {
  const instructions: InstructionsType[] = [
    {
      conditional: `t.id === ${movedTask.id}`,
      updates: {
        parentId: targetTask.id,
        dependency: targetTaskFirstBLI.dependency,
      },
    },
    {
      conditional: targettaskLastBLIDependent
        ? `t.id === ${targettaskLastBLIDependent.id}`
        : "false",
      updates: {
        dependency: movedTask.id,
      },
    },
  ];
  updateTaskArray(setTaskArray, instructions);
}
