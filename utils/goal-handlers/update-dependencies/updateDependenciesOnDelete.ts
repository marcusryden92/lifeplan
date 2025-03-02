import { Planner } from "@/lib/plannerClass";

import {
  getSubtasksById,
  sortTasksByDependencies,
  getTreeBottomLayer,
} from "@/utils/goalPageHandlers";

import { updateTaskArray } from "@/utils/goal-handlers/update-dependencies/updateDependenciesUtils";

import { InstructionType } from "@/utils/goal-handlers/update-dependencies/updateDependenciesUtils";

import { getRootParent } from "@/utils/goalPageHandlers";

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

  if (itemBeforeFirst && itemAfterLast) {
    if (hasSiblings) {
      instructions.push({
        conditional: (t) => t.id === itemAfterLast.id,
        updates: { dependency: itemBeforeFirst.id },
      });
    } else {
      instructions.push(
        {
          conditional: (t) => t.id === itemAfterLast.id,
          updates: { dependency: parentId },
        },
        {
          conditional: (t) => t.id === parentId && t.id !== rootParentId,
          updates: { dependency: itemBeforeFirst.id },
        }
      );
    }
  } else if (itemBeforeFirst && !itemAfterLast) {
    if (!hasSiblings) {
      instructions.push({
        conditional: (t) => t.id === parentId && parentId !== rootParentId,
        updates: { dependency: itemBeforeFirst.id },
      });
    }
  } else if (!itemBeforeFirst && itemAfterLast) {
    if (hasSiblings) {
      instructions.push({
        conditional: (t) => t.id === itemAfterLast.id,
        updates: { dependency: undefined },
      });
    } else {
      instructions.push({
        conditional: (t) => t.id === itemAfterLast.id,
        updates: {
          dependency: parentId === rootParentId ? undefined : parentId,
        },
      });
    }
  }

  // Ensure all instructions are applied before moving forward
  return new Promise<void>((resolve) => {
    updateTaskArray(setTaskArray, instructions);
    setTimeout(resolve, 0);
  });
}

interface UpdateDependenciesOnDeleteInterface_ReturnArray {
  taskArray: Planner[];
  taskId: string;
  parentId: string | undefined;
}

export function updateDependenciesOnDelete_ReturnArray({
  taskArray,
  taskId,
  parentId,
}: UpdateDependenciesOnDeleteInterface_ReturnArray) {
  const bottomLayer: Planner[] = getTreeBottomLayer(taskArray, taskId);
  const sortedLayer: Planner[] = sortTasksByDependencies(
    taskArray,
    bottomLayer
  );

  let updatedArray: Planner[] = [...taskArray];

  const rootParentId = getRootParent(taskArray, taskId);

  const firstItem = sortedLayer[0];
  const lastItem = sortedLayer[sortedLayer.length - 1];

  const itemBeforeFirst = taskArray.find((t) => t.id === firstItem.dependency);
  const itemAfterLast = taskArray.find((t) => t.dependency === lastItem.id);

  const hasSiblings = parentId
    ? getSubtasksById(taskArray, parentId).length > 1
    : undefined;

  if (itemBeforeFirst && itemAfterLast) {
    if (hasSiblings) {
      updatedArray = updatedArray.map((t) => {
        if (t.id === itemAfterLast.id)
          return { ...t, dependency: itemBeforeFirst.id };

        return t;
      });
    } else {
      updatedArray = updatedArray.map((t) => {
        if (t.id === itemAfterLast.id) return { ...t, dependency: parentId };
        else if (t.id === parentId && t.id !== rootParentId)
          return { ...t, dependency: itemBeforeFirst.id };

        return t;
      });
    }
  } else if (itemBeforeFirst && !itemAfterLast) {
    if (!hasSiblings) {
      updatedArray = updatedArray.map((t) => {
        if (t.id === parentId && parentId !== rootParentId)
          return { ...t, dependency: itemBeforeFirst.id };

        return t;
      });
    }
  } else if (!itemBeforeFirst && itemAfterLast) {
    if (hasSiblings) {
      updatedArray = updatedArray.map((t) => {
        if (t.id === itemAfterLast.id) return { ...t, dependency: undefined };

        return t;
      });
    } else {
      updatedArray = updatedArray.map((t) => {
        if (t.id === itemAfterLast.id)
          return {
            ...t,
            dependency: parentId === rootParentId ? undefined : parentId,
          };

        return t;
      });
    }
  }

  // Ensure all instructions are applied before moving forward
  return updatedArray as Planner[];
}
