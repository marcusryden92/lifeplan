import { Planner } from "@/lib/planner-class";

export const hasInfluence = (taskArray: Planner[]): boolean => {
  return !taskArray.some((task) => task.canInfluence === true);
};
