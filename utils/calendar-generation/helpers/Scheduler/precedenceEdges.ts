import type { Planner, Queue, PlannerDependency } from "@/types/prisma";
import type { PrecedenceEdge } from "@/utils/precedence/types";
import { plannerIsCompleted } from "../../../plannerCompletion";

// GATED graph builder — deliberately distinct from the validation builder
// (collectValidationEdges in utils/precedence/validationEdges.ts). This one
// applies TRANSPARENCY: completed members/predecessors carry no bound, and an
// unready-goal queue member is silently chained through (a pipe skips what
// can't flow). Unready-goal DEPENDENCY predecessors are kept — they flow to
// the gate so the fallback can be loud (a prerequisite never stops being a
// prerequisite). Validation runs on the FULL logical order instead, so
// un-completing an item can't resurrect a latent cycle. Do NOT unify the two.

export type { PrecedenceEdge };

const isEligibleEndpoint = (planner: Planner | undefined): planner is Planner =>
  !!planner &&
  planner.parentId == null &&
  (planner.plannerType === "task" || planner.plannerType === "goal") &&
  planner.isTriaged;

const isUnreadyGoal = (planner: Planner): boolean =>
  planner.plannerType === "goal" && planner.isReady !== true;

export function buildPrecedenceEdges(
  queues: Queue[],
  dependencies: PlannerDependency[],
  planners: Planner[],
): PrecedenceEdge[] {
  const plannerById = new Map(planners.map((p) => [p.id, p]));
  const edges: PrecedenceEdge[] = [];

  for (const queue of queues) {
    const flowing = [...queue.members]
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.createdAt.localeCompare(b.createdAt) ||
          a.id.localeCompare(b.id),
      )
      .map((m) => plannerById.get(m.plannerId))
      .filter(isEligibleEndpoint)
      .filter((p) => !plannerIsCompleted(p) && !isUnreadyGoal(p));

    for (let i = 1; i < flowing.length; i++) {
      edges.push({
        fromId: flowing[i - 1].id,
        toId: flowing[i].id,
        source: "queue",
        queueId: queue.id,
      });
    }
  }

  for (const dependency of dependencies) {
    const predecessor = plannerById.get(dependency.predecessorId);
    const successor = plannerById.get(dependency.successorId);
    if (!isEligibleEndpoint(predecessor) || !isEligibleEndpoint(successor)) {
      continue;
    }
    if (plannerIsCompleted(predecessor)) continue;
    edges.push({
      fromId: predecessor.id,
      toId: successor.id,
      source: "dependency",
    });
  }

  return edges;
}

// One list per target. Queues happen to produce one incoming edge per node;
// dependencies produce many — the gate is multi-predecessor from day one.
export function buildPredecessorMap(
  edges: PrecedenceEdge[],
): Map<string, PrecedenceEdge[]> {
  const map = new Map<string, PrecedenceEdge[]>();
  for (const edge of edges) {
    const list = map.get(edge.toId);
    if (list) list.push(edge);
    else map.set(edge.toId, [edge]);
  }
  return map;
}
