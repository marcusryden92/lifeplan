import { Planner } from "@/lib/plannerClass";

export const hasInfluence = (taskArray: Planner[]): boolean => {
  return !taskArray.some((task) => task.canInfluence === true);
};
