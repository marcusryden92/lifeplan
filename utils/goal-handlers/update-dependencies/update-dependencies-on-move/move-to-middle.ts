import React from "react";

// Types
import { Planner } from "@/lib/planner-class";

// Utils
import {
  getRootParent,
  getSortedTreeBottomLayer,
} from "@/utils/goal-page-handlers";
import { getSubtasksById } from "@/utils/goal-page-handlers";
import { updateTaskArray, InstructionType } from "../update-dependencies-utils";
import { assert } from "@/utils/assert/assert";
import { updateDependenciesOnDelete } from "../update-dependencies-on-delete";

interface MoveToMiddleInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  movedTask: Planner;
  targetTask: Planner;
  movedTaskFirstBLI: Planner;
  movedTaskLastBLI: Planner;
  movedTaskLastBLIDependent: Planner;
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
    getSubtasksById(taskArray, movedTask.id).length === 0;
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
      movedTaskLastBLIDependent,
      targetTask,
      movedTaskHasSiblings
    );

    return;
  } else if (targetIsNextDependent) {
    handleTargetIsNextDependent(
      setTaskArray,
      goalRootParent,
      movedTask,
      movedTaskLastBLI,
      targetTask,
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
      goalRootParent,
      movedTask,
      movedTaskLastBLIDependent,
      movedTaskHasSiblings
    );

    // Actions for updating movedTask to the new position
    updateMovedTask(
      setTaskArray,
      movedTask,
      movedTaskFirstBLI,
      movedTaskLastBLI,
      movedTaskHasChildren,
      targetTask,
      targetTaskFirstBLI,
      targetTaskLastBLIDependent,
      targetHasChildren
    );
  }
}

function handleTargetIsNextDependent(
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  goalRootParent: string,
  movedTask: Planner,
  movedTaskLastBLI: Planner,
  targetTask: Planner,
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
          t.id === movedTask.id && movedTask.parentId !== goalRootParent,
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

  console.log(`TARGET: ${targetTask.title}` + targetHasChildren);
  // If targetTask has NO children
  if (!targetHasChildren) console.log("RUN");
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

function handleTargetIsPreviousDependent(
  goalRootParent: string,
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  movedTask: Planner,
  movedTaskFirstBLI: Planner,
  movedTaskLastBLIDependent: Planner | undefined,
  targetTask: Planner,
  movedTaskHasSiblings: boolean
) {
  // Initialize empty instructions array
  const instructions: InstructionType[] = [];

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
      conditional: (t) => t.id === movedTaskFirstBLI.dependency,
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

  // If movedTask has no siblings
  // -- Set movedTaskParent dependency to movedTask.dependency
  // -- Set movedTaskLastBLIDependent (if there is one) dependency to movedTaskParent
  if (!movedTaskHasSiblings) {
    instructions.push(
      {
        conditional: (t) =>
          t.id === movedTask.parentId && movedTask.parentId !== goalRootParent,

        updates: {
          dependency: movedTask.id,
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

function handleVacancy(
  taskArray: Planner[],
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  goalRootParent: string,
  movedTask: Planner,
  movedTaskLastBLIDependent: Planner,
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
  else if (!hasSiblings) {
    const instructions: InstructionType[] = [];

    if (movedTaskLastBLIDependent) {
      if (!movedTask.dependency) {
        instructions.push({
          conditional: (t) => t.id === movedTaskLastBLIDependent.id,
          updates: {
            dependency:
              movedTask.parentId !== goalRootParent
                ? movedTask.parentId
                : undefined,
          },
        });
      } else {
        instructions.push({
          conditional: (t) => t.id === movedTaskLastBLIDependent.id,
          updates: {
            dependency:
              movedTask.parentId !== goalRootParent
                ? movedTask.dependency
                : undefined,
          },
        });
      }
    }

    if (movedTask.dependency) {
      instructions.push({
        conditional: (t) =>
          t.id === movedTask.parentId && movedTask.parentId !== goalRootParent,
        updates: {
          dependency: movedTask.dependency,
        },
      });
    }

    instructions.push({
      conditional: (t) => t.id === movedTask.id,
      updates: {
        dependency: undefined,
      },
    });

    updateTaskArray(setTaskArray, instructions);

    /* const movedTaskParent = taskArray.find((t) => t.id === movedTask.parentId);
    if (movedTaskParent) {
      transferDependencyOwnership(
        taskArray,
        setTaskArray,
        movedTask,
        movedTaskParent
      );
    } */
  }
}

function updateMovedTask(
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  movedTask: Planner,
  movedTaskFirstBLI: Planner,
  movedTaskLastBLI: Planner,
  movedTaskHasChildren: boolean,
  targetTask: Planner,
  targetTaskFirstBLI: Planner,
  targetTaskLastBLIDependent: Planner | undefined,
  targetHasChildren: boolean
) {
  // Initiate empty instructions array
  const instructions: InstructionType[] = [];

  // If movedTask HAS children
  // -- Set movedTask parent to targetTask
  // -- Set movedTaskFirstBLI dependency to that of targetTaskFirstBLI.dependency
  if (movedTaskHasChildren)
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
      }
    );
  // If movedTask has NO children
  // -- Set movedTask parent to targetTask
  // -- Set movedTask dependency to that of targetTaskFirstBLI.dependency
  else
    instructions.push({
      conditional: (t) => t.id === movedTask.id,
      updates: {
        parentId: targetTask.id,
        dependency: targetTaskFirstBLI.dependency,
      },
    });

  if (targetHasChildren) {
    // If targetTask HAS children
    // -- Set targetTaskFirstBLI.dependency to movedTaskLastBLI
    instructions.push({
      conditional: (t) => t.id === targetTaskFirstBLI.id,
      updates: {
        dependency: movedTaskLastBLI.id,
      },
    });
  }

  // If targetTask HAS NO children
  // -- Set the targetTaskLastBLIDependent dependency to movedTaskLastBLI
  else
    instructions.push(
      {
        conditional: (t) =>
          targetTaskLastBLIDependent
            ? t.id === targetTaskLastBLIDependent.id
            : false,
        updates: {
          dependency: movedTaskLastBLI.id,
        },
      },
      // And clear targetTask's dependency
      {
        conditional: (t) => t.id === targetTask.id,
        updates: {
          dependency: undefined,
        },
      }
    );

  updateTaskArray(setTaskArray, instructions);
}
