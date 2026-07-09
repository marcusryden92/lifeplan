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
  const plannersById = new Map(planners.map((p) => [p.id, p]));

  function rootOf(item: Planner): Planner {
    let current = item;
    const seen = new Set<string>([current.id]);
    while (current.parentId) {
      const parent = plannersById.get(current.parentId);
      if (!parent || seen.has(parent.id)) break;
      seen.add(parent.id);
      current = parent;
    }
    return current;
  }

  // Completed items are rendered at their completion window by
  // buildCompletedEvents and must never re-enter the scheduler.
  // Readiness is the universal scheduling gate: tasks and goals alike only
  // become candidates when isReady === true. Tasks inside a goal subtree are
  // owned by the goal's ready gate — scheduleGoal places them when the root
  // goal is ready, and an unready goal's subtree stays off the calendar
  // entirely — so they are excluded here regardless (they inherit the root's
  // readiness via the cascade).
  const candidates = planners.filter((item) => {
    if (taskIsCompleted(item) || memoizedEventIds.has(item.id)) return false;
    if (item.plannerType === PlannerType.goal) {
      return !item.parentId && item.isReady === true;
    }
    if (item.plannerType !== PlannerType.task) return false;
    if (item.isReady !== true) return false;
    if (!item.parentId) return true;
    return rootOf(item).plannerType !== PlannerType.goal;
  });

  return sortByPriorityAndConstraints(
    planners,
    candidates,
    urgencyScores,
    plannerCategoryMap,
  );
}
