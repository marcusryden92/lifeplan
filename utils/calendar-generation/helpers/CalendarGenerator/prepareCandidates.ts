/**
 * Candidate Preparation
 *
 * Prepares and sorts candidates for scheduling
 */

import { Planner, PlannerType } from "@/types/prisma";
import { sortByPriorityAndConstraints } from "../PrioritySorter";
import { taskIsCompleted } from "../../../taskHelpers";

export function prepareCandidates(
  planners: Planner[],
  memoizedEventIds: Set<string>,
  urgencyScores: Map<string, number>,
  plannerCategoryMap?: Map<string, string | null>,
): Planner[] {
  // Completed items are rendered at their completion window by
  // buildCompletedEvents and must never re-enter the scheduler. scheduleGoal
  // filters completed children itself, but tasks reached individually (any
  // subtree whose root goal isn't ready) would otherwise be re-placed —
  // completing a future task used to yield both a completion tile and a
  // fresh scheduled copy of the same id.
  const candidates = planners.filter(
    (item) =>
      ((item.plannerType === PlannerType.goal &&
        !item.parentId &&
        item.isReady) ||
        item.plannerType === PlannerType.task) &&
      !taskIsCompleted(item) &&
      !memoizedEventIds.has(item.id),
  );

  return sortByPriorityAndConstraints(
    planners,
    candidates,
    urgencyScores,
    plannerCategoryMap,
  );
}
