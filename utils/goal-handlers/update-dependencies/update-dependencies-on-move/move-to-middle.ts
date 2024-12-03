/*
1. movedTask has no children / has children
2. movedTask has no siblings / has siblings
3. targetTask has children / no children
4. movedTaskFirstBLI is dependency root / not dependency root
5. targetTask is movedTask's nextDependent / not nextDependent

Combinations:

1. movedTask has no children
    2. movedTask has no siblings
        3. targetTask has children
            4. movedTaskFirstBLI is dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
            4. movedTaskFirstBLI is not dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
        3. targetTask has no children
            4. movedTaskFirstBLI is dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
            4. movedTaskFirstBLI is not dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
    2. movedTask has siblings
        3. targetTask has children
            4. movedTaskFirstBLI is dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
            4. movedTaskFirstBLI is not dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
        3. targetTask has no children
            4. movedTaskFirstBLI is dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
            4. movedTaskFirstBLI is not dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent

1. movedTask has children
    2. movedTask has no siblings
        3. targetTask has children
            4. movedTaskFirstBLI is dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
            4. movedTaskFirstBLI is not dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
        3. targetTask has no children
            4. movedTaskFirstBLI is dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
            4. movedTaskFirstBLI is not dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
    2. movedTask has siblings
        3. targetTask has children
            4. movedTaskFirstBLI is dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
            4. movedTaskFirstBLI is not dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
        3. targetTask has no children
            4. movedTaskFirstBLI is dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
            4. movedTaskFirstBLI is not dependency root
                5. targetTask is movedTask's nextDependent
                5. targetTask is not movedTask's nextDependent
*/

import React from "react";

// Types
import { Planner } from "@/lib/planner-class";

// Utils
import {
  sortTasksByDependencies,
  getTreeBottomLayer,
  getRootParent,
} from "@/utils/goal-page-handlers";
import { getSubtasksFromId } from "@/utils/goal-page-handlers";
import {
  updateTaskArray,
  transferDependencyLocation,
} from "../update-dependencies-utils";
import { assert } from "@/utils/assert/assert";

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
function moveToMiddle({
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
  const targetSubtasks = getTreeBottomLayer(taskArray, targetTask.id);
  const sortedSubtasks = sortTasksByDependencies(taskArray, targetSubtasks);
  const targetLastBLI = sortedSubtasks[sortedSubtasks.length - 1];
  const targetNextDependent = taskArray.find(
    (t) => t.dependency === targetTask.id
  );

  // Conditions
  const movedTaskHasChildren =
    getSubtasksFromId(taskArray, movedTask.id).length === 0;
  const movedTaskHasSiblings = movedTask.parentId
    ? getSubtasksFromId(taskArray, movedTask.parentId).length === 0
    : false;
  const movedTaskIsDependencyRoot = !movedTaskFirstBLI.dependency;

  const targetHasChildren = targetSubtasks.length !== 0;
  const targetIsNextDependent = targetTask.dependency === movedTaskLastBLI.id;

  /*   
1. movedTask has no children / has children (no children = set both dependencies and parentId on movedTask, use BLI's instead of task)
2. movedTask has no siblings / has siblings (no siblings = move movedTasks dependencies/dependent to parent)
3. targetTask has children / no children (no children = move targets dependencies to movedTask)
4. movedTaskFirstBLI is dependency root / not dependency root (is root = remove dependency from nextDependent)
5. targetTask is movedTask's nextDependent / not nextDependent (simply swap the ID of movedTask and set movedTask dependency to parentId)
*/

  // 1. movedTask has no children
  if (!movedTaskHasChildren) {
    // 2. movedTask has no siblings
    if (!movedTaskHasSiblings) {
      // 3. targetTask has no children
      if (!targetHasChildren) {
        // 4. movedTaskFirstBLI is not dependency root
        if (!movedTaskIsDependencyRoot) {
          // 5. targetTask is not movedTask's nextDependent
          if (!targetIsNextDependent) {
            // - Move movedTasks current dependency and dependent to its parent assuming it has one (!movedTaskHasSiblings)
            // - Move targetTasks dependency to movedTask and dependent to targetNextTask  (!targetHasChildren)
            // - Change movedTask parentId (!movedTaskIsDependencyRoot)

            const instructions = [
              {
                conditional: movedTaskParent
                  ? `t.id === ${movedTaskParent.id}`
                  : "false",
                updates: {
                  dependency: movedTask.dependency,
                },
              },
              {
                conditional: movedTaskLastBLIDependent
                  ? `t.id === ${movedTaskLastBLIDependent.id}`
                  : "false",
                updates: {
                  dependency: movedTaskParent?.id,
                },
              },

              {
                conditional: `t.id === ${movedTask.id}`,
                updates: {
                  dependency: targetTask.dependency,
                  parentId: targetTask.id,
                },
              },
              {
                conditional: targetNextDependent
                  ? `t.id === ${targetNextDependent.id}`
                  : "false",
                updates: {
                  dependency: movedTask.id,
                },
              },
              {
                conditional: targetNextDependent
                  ? `t.id === ${targetTask.id}`
                  : "false",
                updates: {
                  dependency: undefined,
                },
              },
            ];

            updateTaskArray(setTaskArray, instructions);
          }

          // 5. targetTask is movedTask's nextDependent
        }
        // 4. movedTaskFirstBLI is dependency root
        else {
          // 5. targetTask is not movedTask's nextDependent
          // 5. targetTask is movedTask's nextDependent
        }
      }
      // 3. targetTask has children
      else {
        // 4. movedTaskFirstBLI is dependency root
        // 5. targetTask is movedTask's nextDependent
        // 5. targetTask is not movedTask's nextDependent
        // 4. movedTaskFirstBLI is not dependency root
        // 5. targetTask is movedTask's nextDependent
        // 5. targetTask is not movedTask's nextDependent
      }
    } else {
      // 2. movedTask has siblings
      // 3. targetTask has children
      // 4. movedTaskFirstBLI is dependency root
      // 5. targetTask is movedTask's nextDependent
      // 5. targetTask is not movedTask's nextDependent
      // 4. movedTaskFirstBLI is not dependency root
      // 5. targetTask is movedTask's nextDependent
      // 5. targetTask is not movedTask's nextDependent
      // 3. targetTask has no children
      // 4. movedTaskFirstBLI is dependency root
      // 5. targetTask is movedTask's nextDependent
      // 5. targetTask is not movedTask's nextDependent
      // 4. movedTaskFirstBLI is not dependency root
      // 5. targetTask is movedTask's nextDependent
      // 5. targetTask is not movedTask's nextDependent
    }
  }
  // 1. movedTask has children
  else {
    // 2. movedTask has no siblings
    // 3. targetTask has children
    // 4. movedTaskFirstBLI is dependency root
    // 5. targetTask is movedTask's nextDependent
    // 5. targetTask is not movedTask's nextDependent
    // 4. movedTaskFirstBLI is not dependency root
    // 5. targetTask is movedTask's nextDependent
    // 5. targetTask is not movedTask's nextDependent
    // 3. targetTask has no children
    // 4. movedTaskFirstBLI is dependency root
    // 5. targetTask is movedTask's nextDependent
    // 5. targetTask is not movedTask's nextDependent
    // 4. movedTaskFirstBLI is not dependency root
    // 5. targetTask is movedTask's nextDependent
    // 5. targetTask is not movedTask's nextDependent
    // 2. movedTask has siblings
    // 3. targetTask has children
    // 4. movedTaskFirstBLI is dependency root
    // 5. targetTask is movedTask's nextDependent
    // 5. targetTask is not movedTask's nextDependent
    // 4. movedTaskFirstBLI is not dependency root
    // 5. targetTask is movedTask's nextDependent
    // 5. targetTask is not movedTask's nextDependent
    // 3. targetTask has no children
    // 4. movedTaskFirstBLI is dependency root
    // 5. targetTask is movedTask's nextDependent
    // 5. targetTask is not movedTask's nextDependent
    // 4. movedTaskFirstBLI is not dependency root
    // 5. targetTask is movedTask's nextDependent
    // 5. targetTask is not movedTask's nextDependent
  }
}
