import { Planner } from "@/prisma/generated/client";

import {
  getSubtasksById,
  sortTasksByDependencies,
  getTreeBottomLayer,
} from "@/utils/goalPageHandlers";

import { updateTaskArray } from "@/utils/goal-handlers/update-dependencies/updateDependenciesUtils";

import { InstructionType } from "@/utils/goal-handlers/update-dependencies/updateDependenciesUtils";

import { getRootParentId } from "@/utils/goalPageHandlers";

import React from "react";

interface UpdateDependenciesOnDeleteInterface {
  mainPlanner: Planner[];
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>;
  taskId: string;
  parentId: string | undefined;
}

export function updateDependenciesOnDelete({
  mainPlanner,
  setMainPlanner,
  taskId,
  parentId,
}: UpdateDependenciesOnDeleteInterface) {
  const bottomLayer: Planner[] = getTreeBottomLayer(mainPlanner, taskId);
  const sortedLayer: Planner[] = sortTasksByDependencies(
    mainPlanner,
    bottomLayer
  );

  const rootParentId = getRootParentId(mainPlanner, taskId);

  const firstItem = sortedLayer[0];
  const lastItem = sortedLayer[sortedLayer.length - 1];

  const itemBeforeFirst = mainPlanner.find(
    (t) => t.id === firstItem.dependency
  );
  const itemAfterLast = mainPlanner.find((t) => t.dependency === lastItem.id);

  const hasSiblings = parentId
    ? getSubtasksById(mainPlanner, parentId).length > 1
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
    updateTaskArray(setMainPlanner, instructions);
    setTimeout(resolve, 0);
  });
}

interface UpdateDependenciesOnDeleteInterface_ReturnArray {
  mainPlanner: Planner[];
  taskId: string;
  parentId: string | null;
}

export function updateDependenciesOnDelete_ReturnArray({
  mainPlanner,
  taskId,
  parentId,
}: UpdateDependenciesOnDeleteInterface_ReturnArray) {
  const bottomLayer: Planner[] = getTreeBottomLayer(mainPlanner, taskId);
  const sortedLayer: Planner[] = sortTasksByDependencies(
    mainPlanner,
    bottomLayer
  );

  let updatedArray: Planner[] = [...mainPlanner];

  const rootParentId = getRootParentId(mainPlanner, taskId);

  const firstItem = sortedLayer[0];
  const lastItem = sortedLayer[sortedLayer.length - 1];

  const itemBeforeFirst = mainPlanner.find(
    (t) => t.id === firstItem.dependency
  );
  const itemAfterLast = mainPlanner.find((t) => t.dependency === lastItem.id);

  const hasSiblings = parentId
    ? getSubtasksById(mainPlanner, parentId).length > 1
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
        if (t.id === itemAfterLast.id)
          return { ...t, dependency: parentId ?? null };
        else if (t.id === parentId && t.id !== rootParentId)
          return { ...t, dependency: itemBeforeFirst.id ?? null };

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
        if (t.id === itemAfterLast.id) return { ...t, dependency: null };

        return t;
      });
    } else {
      updatedArray = updatedArray.map((t) => {
        if (t.id === itemAfterLast.id)
          return {
            ...t,
            dependency: parentId === rootParentId ? null : parentId,
          };

        return t;
      });
    }
  }

  // Ensure all instructions are applied before moving forward
  return updatedArray;
}
