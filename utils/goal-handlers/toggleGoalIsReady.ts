import { Planner } from "@/prisma/generated/client";
import React from "react";

export function toggleGoalIsReady(
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  taskId: string
) {
  updatePlannerArray((prev) =>
    prev.map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        isReady: task.isReady === undefined ? true : !task.isReady,
      };
    })
  );
}

export function setGoalIsReady(
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  taskId: string,
  isReady: boolean | null
) {
  updatePlannerArray((prev) =>
    prev.map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        isReady: isReady,
      };
    })
  );
}
