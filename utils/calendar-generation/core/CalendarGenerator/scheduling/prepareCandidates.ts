/**
 * Candidate Preparation
 *
 * Prepares and sorts candidates for scheduling
 */

import { Planner } from "@/types/prisma";
import { PrioritySorter } from "../../../helpers/scheduling/PrioritySorter";

export function prepareCandidates(
  planners: Planner[],
  memoizedEventIds: Set<string>,
  currentDate: Date
): Planner[] {
  // Get initial candidates (top-level goals + tasks)
  let candidates = planners.filter(
    (item) =>
      ((item.itemType === "goal" && !item.parentId && item.isReady) ||
        item.itemType === "task") &&
      !memoizedEventIds.has(item.id)
  );

  // Sort by priority
  candidates = PrioritySorter.sortByPriorityAndConstraints(
    planners,
    candidates,
    currentDate
  );

  return candidates;
}
