import type { CoachNode } from "./plannerTreeToJson";
import type { CoachForest } from "./plannerForestToJson";
import {
  coachTreesEqual,
  diffCoachTree,
  markSubtree,
  type DiffNode,
} from "./diffCoachTree";

// Diff the working forest against the canonical one, goal by goal. Roots
// match by id; working order is preserved for retained + added goals, and
// deleted goals are appended at the end so removals stay visible.
export function diffCoachForest(
  working: CoachForest,
  canonical: CoachForest,
): DiffNode[] {
  const canonicalById = new Map<string, CoachNode>();
  for (const goal of canonical.goals) {
    if (goal.id) canonicalById.set(goal.id, goal);
  }
  const workingIds = new Set<string>();
  for (const goal of working.goals) {
    if (goal.id) workingIds.add(goal.id);
  }

  const result: DiffNode[] = [];
  for (const goal of working.goals) {
    const canonicalGoal = goal.id ? canonicalById.get(goal.id) : undefined;
    const diffed = diffCoachTree(goal, canonicalGoal ?? null);
    if (diffed) result.push(diffed);
  }
  for (const goal of canonical.goals) {
    if (goal.id && !workingIds.has(goal.id)) {
      result.push(markSubtree(goal, "deleted"));
    }
  }
  return result;
}

// Order-insensitive at the top level (goals match by id); order-sensitive
// inside each goal. Any id-less goal in either forest counts as a change —
// only the AI produces those, and only for new goals.
export function coachForestsEqual(a: CoachForest, b: CoachForest): boolean {
  const aById = new Map<string, CoachNode>();
  for (const goal of a.goals) {
    if (!goal.id) return false;
    aById.set(goal.id, goal);
  }
  let matched = 0;
  for (const goal of b.goals) {
    if (!goal.id) return false;
    const other = aById.get(goal.id);
    if (!other || !coachTreesEqual(other, goal)) return false;
    matched++;
  }
  return aById.size === matched;
}
