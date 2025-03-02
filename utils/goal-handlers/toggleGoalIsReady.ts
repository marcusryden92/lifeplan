import { Planner } from "@/lib/plannerClass";
import React from "react";

export function toggleGoalIsReady(
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  taskId: string
) {
  setTaskArray((prev) =>
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
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  taskId: string,
  isReady: boolean | undefined
) {
  setTaskArray((prev) =>
    prev.map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        isReady: isReady,
      };
    })
  );
}
