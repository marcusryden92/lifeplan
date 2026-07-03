import type { CoachNode } from "./plannerTreeToJson";
import { normalizeCoachTree } from "./normalizeCoachTree";

// The shape of a (possibly partial) propose_goals tool input after
// normalization: complete trees for the goals the model created or modified,
// plus the ids of top-level goals it wants removed. Untouched goals are never
// re-emitted; mergeCoachForest overlays this onto the working forest.
export interface CoachForestProposal {
  goals: CoachNode[];
  deletedGoalIds: string[];
  // True for trees computed server-side by the deterministic edit tools:
  // those are authoritative, so a null root categoryId means "cleared", not
  // "unspecified" — the merge must not backfill it.
  trustNullCategoryId: boolean;
}

export function normalizeCoachForest(
  raw: unknown,
): CoachForestProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const rawGoals = Array.isArray(obj.goals) ? obj.goals : [];
  const goals = rawGoals
    .map((goal) => normalizeCoachTree(goal))
    .filter((goal): goal is CoachNode => goal !== null);

  const rawDeleted = Array.isArray(obj.deletedGoalIds)
    ? obj.deletedGoalIds
    : [];
  const deletedGoalIds = rawDeleted.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );

  return { goals, deletedGoalIds, trustNullCategoryId: obj.fromOps === true };
}
