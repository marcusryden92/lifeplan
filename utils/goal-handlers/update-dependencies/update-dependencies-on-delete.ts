import { Planner } from "@/lib/planner-class";

import {
  getSubtasksById,
  sortTasksByDependencies,
  getTreeBottomLayer,
} from "@/utils/goal-page-handlers";
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

  const firstItem = sortedLayer[0];
  const lastItem = sortedLayer[sortedLayer.length - 1];

  const itemBeforeFirst = taskArray.find((t) => t.id === firstItem.dependency);
  const itemAfterLast = taskArray.find((t) => t.dependency === lastItem.id);

  const hasSiblings = parentId
    ? getSubtasksById(taskArray, parentId).length > 1
    : undefined;

  if (itemAfterLast && itemBeforeFirst) {
    if (hasSiblings) {
      setTaskArray((prev) =>
        prev.map((t) => {
          if (t.id === itemAfterLast.id) {
            return {
              ...t,
              dependency: itemBeforeFirst.id,
            };
          }
          return t;
        })
      );
    } else {
      setTaskArray((prev) =>
        prev.map((t) => {
          if (t.id === itemAfterLast.id) {
            return {
              ...t,
              dependency: parentId,
            };
          } else if (t.id === parentId) {
            return { ...t, dependency: itemBeforeFirst.id };
          }
          return t;
        })
      );
    }
  }
}
