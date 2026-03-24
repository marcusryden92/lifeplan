/**
 * Candidate Preparation
 *
 * Prepares and sorts candidates for scheduling
 */

import { Planner, ItemType } from "@/types/prisma";
import { PrioritySorter } from "../../core/PrioritySorter";

export function prepareCandidates(
  planners: Planner[],
  memoizedEventIds: Set<string>,
  currentDate: Date,
  plannerCategoryMap?: Map<string, string | null>
): Planner[] {
  let candidates = planners.filter(
    (item) =>
      ((item.itemType === ItemType.goal && !item.parentId && item.isReady) ||
        item.itemType === ItemType.task) &&
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
