import React from "react";

// Types
import { Planner } from "@/lib/planner-class";

// Utils
import {
  getRootParent,
  getSortedTreeBottomLayer,
  getGoalTree,
  deleteGoal_ReturnArray,
} from "@/utils/goal-page-handlers";
import { getSubtasksById } from "@/utils/goal-page-handlers";
import { updateTaskArray, InstructionType } from "../update-dependencies-utils";
import { assert } from "@/utils/assert/assert";

interface MoveToMiddleInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  movedTask: Planner;
  targetTask: Planner;
  movedTaskFirstBLI: Planner;
  movedTaskLastBLI: Planner;
  movedTaskLastBLIDependent: Planner | undefined;
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
  if (movedTask.parentId === targetTask.id) return;

  console.log(taskArray);

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

  const targetChildren = getSubtasksById(taskArray, targetTask.id);

  // Conditions
  /*   
  movedTask has no siblings / has siblings
  targetTask has children / no children
  movedTask has no children / has children
  movedTaskFirstBLI is dependency root / not dependency root
  targetTask is movedTask's nextDependent / not nextDependent 
  targetTask is previousDependent
  */

  const movedTaskHasChildren =
    getSubtasksById(taskArray, movedTask.id).length > 0;
  const movedTaskHasSiblings = movedTask.parentId
    ? getSubtasksById(taskArray, movedTask.parentId).length > 1
    : false;

  const targetHasChildren = targetChildren.length > 0;
  const targetIsNextDependent =
    targetTaskFirstBLI.dependency === movedTaskLastBLI.id;

  const targetIsPreviousDependent =
    movedTaskFirstBLI.dependency === targetTaskLastBLI.id;

  if (targetIsPreviousDependent && !targetHasChildren) {
    handleTargetIsPreviousDependent(
      goalRootParent,
      setTaskArray,
      movedTask,
      movedTaskFirstBLI,
      movedTaskLastBLI,
      movedTaskLastBLIDependent,
      targetTask,
      targetTaskFirstBLI,
      movedTaskHasSiblings,
      targetHasChildren,
      movedTaskHasChildren
    );

    return;
  } else if (targetIsNextDependent) {
    handleTargetIsNextDependent(
      setTaskArray,
      goalRootParent,
      movedTask,
      movedTaskFirstBLI,
      movedTaskLastBLI,
      targetTask,
      targetTaskFirstBLI,
      targetTaskLastBLIDependent,
      movedTaskHasSiblings,
      targetHasChildren
    );

    return;
  } else {
    // Actions for stitching the hole movedTask leaves behind
    handleVacancy(
      taskArray,
      setTaskArray,
      movedTask,
      movedTaskFirstBLI,
      movedTaskLastBLI,
      movedTaskHasChildren,
      targetTask,
      targetHasChildren
    );
  }
}

function handleTargetIsPreviousDependent(
  goalRootParent: string,
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  movedTask: Planner,
  movedTaskFirstBLI: Planner,
  movedTaskLastBLI: Planner,
  movedTaskLastBLIDependent: Planner | undefined,
  targetTask: Planner,
  targetTaskFirstBLI: Planner,
  movedTaskHasSiblings: boolean,
  targetHasChildren: boolean,
  movedTaskHasChildren: boolean
) {
  // Initialize empty instructions array
  const instructions: InstructionType[] = [];

  if (targetHasChildren) {
    if (movedTaskHasChildren) {
      // -- Set movedTask parent to targetTask

      instructions.push(
        {
          conditional: (t) => t.id === movedTask.id,
          updates: {
            parentId: targetTask.id,
          },
        },
        {
          conditional: (t) => t.id === movedTaskFirstBLI.id,
          updates: {
            dependency: targetTaskFirstBLI.dependency,
          },
        },
        {
          conditional: (t) => t.id === targetTaskFirstBLI.id,
          updates: {
            dependency: movedTaskLastBLI.id,
          },
        }
      );
    }
  } else {
    // -- Set movedTask parent to targetTask
    // -- Set movedTaskFirstBLI.dependency to targetTask.dependency
    // -- Clear targetTask dependency
    instructions.push(
      {
        conditional: (t) => t.id === movedTask.id,
        updates: {
          parentId: targetTask.id,
        },
      },
      {
        conditional: (t) => t.id === movedTaskFirstBLI.id,
        updates: {
          dependency: targetTask.dependency,
        },
      },
      {
        conditional: (t) => t.id === targetTask.id,
        updates: {
          dependency: undefined,
        },
      }
    );
  }

  // If movedTask has no siblings
  // -- Set movedTaskParent dependency to movedTask.dependency
  // -- Set movedTaskLastBLIDependent (if there is one) dependency to movedTaskParent
  if (!movedTaskHasSiblings) {
    instructions.push(
      {
        conditional: (t) =>
          t.id === movedTask.parentId && movedTask.parentId !== goalRootParent,

        updates: {
          dependency: movedTaskLastBLI.id,
        },
      },
      {
        conditional: (t) =>
          movedTaskLastBLIDependent
            ? t.id === movedTaskLastBLIDependent.id
            : false,
        updates: {
          dependency: movedTask.parentId,
        },
      }
    );
  }
  updateTaskArray(setTaskArray, instructions);
}

function handleTargetIsNextDependent(
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  goalRootParent: string,
  movedTask: Planner,
  movedTaskFirstBLI: Planner,
  movedTaskLastBLI: Planner,
  targetTask: Planner,
  targetTaskFirstBLI: Planner,
  targetTaskLastBLIDependent: Planner | undefined,
  movedTaskHasSiblings: boolean,
  targetHasChildren: boolean
) {
  // If target is movedTasks next dependent, only update movedTask.parentId to targetTask,
  // and change movedTaskParent's dependency to movedTask, if there is a parent

  const instructions: InstructionType[] = [];

  // Set movedTask new parentId to targetTask
  instructions.push({
    conditional: (t) => t.id === movedTask.id,
    updates: {
      parentId: targetTask.id,
    },
  });

  // If movedTask has NO siblings
  if (!movedTaskHasSiblings) {
    instructions.push(
      // Set movedTask's new dependency to be its old parent
      {
        conditional: (t) =>
          t.id === movedTaskFirstBLI.id &&
          movedTask.parentId !== goalRootParent,
        updates: {
          dependency: movedTask.parentId,
        },
      },
      // Set the parent's dependency to be movedTask's old dependency
      {
        conditional: (t) =>
          t.id === movedTask.parentId && movedTask.parentId !== goalRootParent,
        updates: {
          dependency: movedTask.dependency,
        },
      }
    );
  }

  if (targetHasChildren) {
    instructions.push({
      conditional: (t) => t.id === targetTaskFirstBLI.id,
      updates: {
        dependency: movedTaskLastBLI.id,
      },
    });
  }
  // If targetTask has NO children
  else if (!targetHasChildren)
    instructions.push(
      // Clear target's dependency
      {
        conditional: (t) => t.id === targetTask.id,
        updates: {
          dependency: undefined,
        },
      },
      // Set targetLastBLIDependent's dependency to be movedTask's last BLI
      {
        conditional: (t) =>
          targetTaskLastBLIDependent
            ? t.id === targetTaskLastBLIDependent.id
            : false,
        updates: {
          dependency: movedTaskLastBLI.id,
        },
      }
    );

  updateTaskArray(setTaskArray, instructions);
}

async function handleVacancy(
  taskArray: Planner[],
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  movedTask: Planner,
  movedTaskFirstBLI: Planner,
  movedTaskLastBLI: Planner,
  movedTaskHasChildren: boolean,
  targetTask: Planner,
  targetHasChildren: boolean
) {
  const movedTaskTree = getGoalTree(taskArray, movedTask.id);

  const updatedArray: Planner[] = deleteGoal_ReturnArray({
    taskArray,
    setTaskArray,
    taskId: movedTask.id,
    parentId: movedTask.parentId,
  });

  // Actions for updating movedTask to the new position
  updateMovedTask(
    updatedArray,
    setTaskArray,
    movedTask,
    movedTaskFirstBLI,
    movedTaskLastBLI,
    movedTaskHasChildren,
    movedTaskTree,
    targetTask,
    targetHasChildren
  );
}

async function updateMovedTask(
  updatedArray: Planner[],
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  movedTask: Planner,
  movedTaskFirstBLI: Planner,
  movedTaskLastBLI: Planner,
  movedTaskHasChildren: boolean,
  movedTaskTree: Planner[],
  targetTask: Planner,
  targetHasChildren: boolean
) {
  // Get these items again, as they've changed since they were defined in the parent function
  const targetSortedBottomLayer = getSortedTreeBottomLayer(
    updatedArray,
    targetTask.id
  );

  const targetTaskFirstBLI = targetSortedBottomLayer[0];
  const targetTaskLastBLIDependent = updatedArray.find(
    (t) => t.dependency === targetTask.id
  );

  // Initiate empty instructions array
  const instructions: InstructionType[] = [];

  // If movedTask HAS children
  // -- Set movedTask parent to targetTask
  // -- Set movedTaskFirstBLI dependency to that of targetTaskFirstBLI.dependency
  if (movedTaskHasChildren) {
    movedTaskTree = movedTaskTree.map((t) => {
      if (t.id === movedTask.id) {
        return { ...t, parentId: targetTask.id };
      } else if (t.id === movedTaskFirstBLI.id)
        return {
          ...t,
          dependency: targetTaskFirstBLI.dependency,
        };

      return t;
    });
  }
  // If movedTask has NO children
  // -- Set movedTask parent to targetTask
  // -- Set movedTask dependency to that of targetTaskFirstBLI.dependency
  else
    movedTaskTree = movedTaskTree.map((t) => {
      if (t.id === movedTask.id) {
        return {
          ...t,
          parentId: targetTask.id,
          dependency: targetTaskFirstBLI.dependency,
        };
      }

      return t;
    });

  if (targetHasChildren) {
    // If targetTask HAS children
    // -- Set targetTaskFirstBLI.dependency to movedTaskLastBLI

    updatedArray = updatedArray.map((t) => {
      if (t.id === targetTaskFirstBLI.id) {
        return { ...t, dependency: movedTaskLastBLI.id };
      }
      return t;
    });
  }

  // If targetTask HAS NO children
  // -- Set the targetTaskLastBLIDependent dependency to movedTaskLastBLI
  else
    updatedArray = updatedArray.map((t) => {
      if (
        targetTaskLastBLIDependent
          ? t.id === targetTaskLastBLIDependent.id
          : false
      ) {
        return { ...t, dependency: movedTaskLastBLI.id };
      }

      if (t.id === targetTask.id) return { ...t, dependency: undefined };

      return t;
    });

  movedTaskTree.forEach((t) => {
    updatedArray.push(t);
  });

  setTaskArray(updatedArray);
}
