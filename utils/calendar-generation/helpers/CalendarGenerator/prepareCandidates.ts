/**
 * Candidate Preparation
 *
 * Prepares and sorts candidates for scheduling
 */

import { Planner, PlannerType } from "@/types/prisma";
import { sortByPriorityAndConstraints } from "../PrioritySorter";

export function prepareCandidates(
  planners: Planner[],
  memoizedEventIds: Set<string>,
  currentDate: Date,
  plannerCategoryMap?: Map<string, string | null>,
): Planner[] {
  const candidates = planners.filter(
    (item) =>
      ((item.plannerType === PlannerType.goal &&
        !item.parentId &&
        item.isReady) ||
        item.plannerType === PlannerType.task) &&
      !memoizedEventIds.has(item.id),
  );

  return sortByPriorityAndConstraints(
    planners,
    candidates,
    currentDate,
    plannerCategoryMap,
  );
}
