import { Planner } from "@/types/prisma";
import { sortByPriorityAndConstraints } from "../helpers/PrioritySorter";

export class PrioritySorter {
  static sortByPriorityAndConstraints(
    allPlanners: Planner[],
    goalsAndTasks: Planner[],
    currentDate: Date,
    plannerCategoryMap?: Map<string, string | null>
  ): Planner[] {
    return sortByPriorityAndConstraints(
      allPlanners,
      goalsAndTasks,
      currentDate,
      plannerCategoryMap
    );
  }
}
