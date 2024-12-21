import { Planner } from "@/lib/planner-class";

import {
  getSubtasksById,
  sortTasksByDependencies,
  getTreeBottomLayer,
} from "@/utils/goal-page-handlers";

import { updateTaskArray } from "@/utils/goal-handlers/update-dependencies/update-dependencies-utils";

import { InstructionType } from "@/utils/goal-handlers/update-dependencies/update-dependencies-utils";

import { getRootParent } from "@/utils/goal-page-handlers";

import React from "react";

interface UpdateDependenciesOnDeleteInterface {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  taskId: string;
  parentId: string | undefined;
}

export function updateDependenciesOnDelete({
  taskArray,
  setTaskArray,
  taskId,
  parentId,
}: UpdateDependenciesOnDeleteInterface) {
  const bottomLayer: Planner[] = getTreeBottomLayer(taskArray, taskId);
  const sortedLayer: Planner[] = sortTasksByDependencies(
    taskArray,
    bottomLayer
  );

  const rootParentId = getRootParent(taskArray, taskId);

  const firstItem = sortedLayer[0];
  const lastItem = sortedLayer[sortedLayer.length - 1];

  const itemBeforeFirst = taskArray.find((t) => t.id === firstItem.dependency);
  const itemAfterLast = taskArray.find((t) => t.dependency === lastItem.id);

  const hasSiblings = parentId
    ? getSubtasksById(taskArray, parentId).length > 1
    : undefined;

  const instructions: InstructionType[] = [];

  // If ItemBeforeFirst and ItemAfterLast are both defined
  if (itemBeforeFirst && itemAfterLast) {
    // If HAS siblings
    if (hasSiblings)
      instructions.push({
        // Set itemAfterLast dependency to itemBeforeFirst ID
        conditional: (t) => t.id === itemAfterLast.id,
        updates: { dependency: itemBeforeFirst.id },
      });

    // If NO siblings
    if (!hasSiblings)
      instructions.push(
        {
          // Set itemAfterLast dependency to parentId
          conditional: (t) => t.id === itemAfterLast.id,
          updates: { dependency: parentId },
        },
        {
          // Set parent task dependency to itemBeforeFirst ID (assuming not root parent)
          conditional: (t) => t.id === parentId && t.id !== rootParentId,
          updates: { dependency: itemBeforeFirst.id },
        }
      );
  }

  // If ItemBeforeFirst is defined but not ItemAfterLast
  if (itemBeforeFirst && !itemAfterLast) {
    // If HAS siblings
    if (hasSiblings) {
      // No action necessary
    }

    // If NO siblings
    if (!hasSiblings) {
      instructions.push({
        conditional: (t) => t.id === parentId && parentId !== rootParentId,
        updates: {
          dependency: itemBeforeFirst.id,
        },
      });
    }
  }

  // If ItemAfterLast is defined but not ItemBeforeFirst
  if (!itemBeforeFirst && itemAfterLast) {
    // If HAS siblings
    if (hasSiblings) {
      instructions.push({
        conditional: (t) => t.id === itemAfterLast.id,
        updates: {
          dependency: undefined,
        },
      });
    }

    // If NO siblings
    if (!hasSiblings) {
      instructions.push({
        conditional: (t) => t.id === itemAfterLast.id,
        updates: {
          dependency: parentId === rootParentId ? undefined : parentId,
        },
      });
    }
  }

  updateTaskArray(setTaskArray, instructions);

  return;
}
