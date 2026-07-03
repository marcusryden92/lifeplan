import type { Planner } from "@/types/prisma";
import { sortTasksByDependencies } from "@/utils/goalPageHandlers";
import { plannerTreeToJson, type CoachNode } from "./plannerTreeToJson";

export interface CoachForest {
  goals: CoachNode[];
}

// The full working set sent to the assistant: every triaged top-level row and
// its subtree. Untriaged rows are Capture-inbox jots — noise for planning —
// and the apply path leaves them untouched. Top-level order is not semantic;
// goals match by id everywhere downstream.
export function plannerForestToJson(planner: Planner[]): CoachForest {
  const roots = planner.filter((p) => !p.parentId && p.isTriaged);
  const ordered = sortTasksByDependencies(planner, roots);
  return {
    goals: ordered
      .map((root) => plannerTreeToJson(planner, root.id))
      .filter((goal): goal is CoachNode => goal !== null),
  };
}
