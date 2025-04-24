import { Planner } from "@/lib/plannerClass";

export const hasInfluence = (mainPlanner: Planner[]): boolean => {
  return !mainPlanner.some((task) => task.canInfluence === true);
};
