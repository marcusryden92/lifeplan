import type { Planner } from "@/types/prisma";
import { startOfDay } from "@/utils/dateUtils";

/**
 * Items needing triage in the capture queue: top-level, not completed, not
 * yet triaged. `isTriaged` is the explicit signal set by Capture on save,
 * which works uniformly across task/plan/goal regardless of duration.
 */
export function isUnprocessed(item: Planner): boolean {
  if (item.parentId) return false;
  if (item.completedEndTime) return false;
  return !item.isTriaged;
}

export function isItemOverdue(item: Planner, now: Date): boolean {
  if (!item.deadline) return false;
  if (item.completedEndTime) return false;
  return new Date(item.deadline) < startOfDay(now);
}

/**
 * Duration-weighted progress for a goal: sum of completed-leaf durations
 * over sum of all-leaf durations across the goal's descendant subtree.
 * Returns null for non-goals. For a leaf goal or a goal whose subtree has
 * zero total duration, falls back to the goal's own completion (0 or 1).
 */
export function getGoalDurationProgress(
  goal: Planner,
  allItems: Planner[],
): number | null {
  if (goal.plannerType !== "goal") return null;

  const childrenByParent = new Map<string, Planner[]>();
  for (const p of allItems) {
    if (!p.parentId) continue;
    const arr = childrenByParent.get(p.parentId);
    if (arr) arr.push(p);
    else childrenByParent.set(p.parentId, [p]);
  }

  let totalDuration = 0;
  let completedDuration = 0;

  const stack: Planner[] = [goal];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const node = stack.pop() as Planner;
    if (visited.has(node.id)) continue;
    visited.add(node.id);

    const children = childrenByParent.get(node.id);
    if (!children || children.length === 0) {
      if (node.id === goal.id) continue;
      const d = node.duration ?? 0;
      totalDuration += d;
      if (node.completedEndTime) completedDuration += d;
    } else {
      for (const c of children) stack.push(c);
    }
  }

  if (totalDuration === 0) {
    return goal.completedEndTime ? 1 : 0;
  }
  return completedDuration / totalDuration;
}
