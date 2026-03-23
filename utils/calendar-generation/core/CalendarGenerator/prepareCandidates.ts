/**
 * Candidate Preparation
 *
 * Prepares and sorts candidates for scheduling
 */

import { Planner } from "@/types/prisma";
import { PrioritySorter } from "../../helpers/scheduling/PrioritySorter";

export function prepareCandidates(
  planners: Planner[],
  memoizedEventIds: Set<string>,
  currentDate: Date,
  plannerCategoryMap?: Map<string, string | null>
): Planner[] {
  let candidates = planners.filter(
    (item) =>
      ((item.itemType === "goal" && !item.parentId && item.isReady) ||
        item.itemType === "task") &&
      !memoizedEventIds.has(item.id)
  );

  candidates = PrioritySorter.sortByPriorityAndConstraints(
    planners,
    candidates,
    currentDate,
    plannerCategoryMap
  );

  return candidates;
}
