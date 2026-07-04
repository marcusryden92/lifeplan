import type { Planner } from "@/types/prisma";
import { sortTasksByDependencies } from "@/utils/goalPageHandlers";
import { plannerTreeToJson, type DraftNode } from "./plannerTreeToJson";

export interface DraftForest {
  goals: DraftNode[];
}

// The full working set sent to the assistant: every triaged top-level row and
// its subtree. Untriaged rows are Capture-inbox jots — noise for planning —
// and the apply path leaves them untouched. Top-level order is not semantic;
// goals match by id everywhere downstream.
export function plannerForestToJson(planner: Planner[]): DraftForest {
  const roots = planner.filter((p) => !p.parentId && p.isTriaged);
  const ordered = sortTasksByDependencies(planner, roots);
  return {
    goals: ordered
      .map((root) => plannerTreeToJson(planner, root.id))
      .filter((goal): goal is DraftNode => goal !== null),
  };
}
