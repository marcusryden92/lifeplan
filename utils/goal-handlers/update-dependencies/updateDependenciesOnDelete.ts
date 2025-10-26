import { Planner } from "@/types/prisma";

import {
  getSubtasksById,
  sortTasksByDependencies,
  getTreeBottomLayer,
} from "@/utils/goalPageHandlers";

import { updateTaskArray } from "@/utils/goal-handlers/update-dependencies/updateDependenciesUtils";

import { InstructionType } from "@/utils/goal-handlers/update-dependencies/updateDependenciesUtils";

import { getRootParentId } from "@/utils/goalPageHandlers";

interface UpdateDependenciesOnDeleteInterface {
  planner: Planner[];
  updatePlannerArray: (
    planner: Planner[] | ((prev: Planner[]) => Planner[])
  ) => void;
  taskId: string;
  parentId: string | undefined;
}

export function updateDependenciesOnDelete({
  planner,
  updatePlannerArray,
  taskId,
  parentId,
}: UpdateDependenciesOnDeleteInterface) {
  const bottomLayer: Planner[] = getTreeBottomLayer(planner, taskId);
  const sortedLayer: Planner[] = sortTasksByDependencies(planner, bottomLayer);

  const rootParentId = getRootParentId(planner, taskId);

  const firstItem = sortedLayer[0];
  const lastItem = sortedLayer[sortedLayer.length - 1];

  const itemBeforeFirst = planner.find((t) => t.id === firstItem.dependency);
  const itemAfterLast = planner.find((t) => t.dependency === lastItem.id);

  const hasSiblings = parentId
    ? getSubtasksById(planner, parentId).length > 1
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
    updateTaskArray(updatePlannerArray, instructions);
    setTimeout(resolve, 0);
  });
}

interface UpdateDependenciesOnDeleteInterface_ReturnArray {
  planner: Planner[];
  taskId: string;
  parentId: string | null;
}

export function updateDependenciesOnDelete_ReturnArray({
  planner,
  taskId,
  parentId,
}: UpdateDependenciesOnDeleteInterface_ReturnArray) {
  const bottomLayer: Planner[] = getTreeBottomLayer(planner, taskId);
  const sortedLayer: Planner[] = sortTasksByDependencies(planner, bottomLayer);

  let updatedArray: Planner[] = [...planner];

  const rootParentId = getRootParentId(planner, taskId);

  const firstItem = sortedLayer[0];
  const lastItem = sortedLayer[sortedLayer.length - 1];

  const itemBeforeFirst = planner.find((t) => t.id === firstItem.dependency);
  const itemAfterLast = planner.find((t) => t.dependency === lastItem.id);

  const hasSiblings = parentId
    ? getSubtasksById(planner, parentId).length > 1
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
