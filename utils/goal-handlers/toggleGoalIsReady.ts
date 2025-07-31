import { Planner } from "@prisma/client";
import React from "react";

export function toggleGoalIsReady(
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>,
  taskId: string
) {
  setMainPlanner((prev) =>
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
  setMainPlanner: React.Dispatch<React.SetStateAction<Planner[]>>,
  taskId: string,
  isReady: boolean | undefined
) {
  setMainPlanner((prev) =>
    prev.map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        isReady: isReady,
      };
    })
  );
}
