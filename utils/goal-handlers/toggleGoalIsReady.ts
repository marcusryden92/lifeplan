import { Planner } from "@/types/prisma";
import { getTaskTreeIds } from "@/utils/goalPageHandlers";
import React from "react";

// Readiness is a whole-subtree property: a root goal and its descendants are
// always ready (or unready) together. Both setters apply the value to the
// entire tree under taskId.
export function toggleGoalIsReady(
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  taskId: string
) {
  updatePlannerArray((prev) => {
    const root = prev.find((task) => task.id === taskId);
    if (!root) return prev;
    const nextIsReady = !root.isReady;
    const treeIds = new Set(getTaskTreeIds(prev, taskId));
    return prev.map((task) =>
      treeIds.has(task.id) ? { ...task, isReady: nextIsReady } : task
    );
  });
}

export function setGoalIsReady(
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  taskId: string,
  isReady: boolean | null
) {
  updatePlannerArray((prev) => {
    const treeIds = new Set(getTaskTreeIds(prev, taskId));
    return prev.map((task) =>
      treeIds.has(task.id) ? { ...task, isReady } : task
    );
  });
}
