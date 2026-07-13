import type { Queue, PlannerDependency } from "@/types/prisma";
import type { PrecedenceEdge } from "./types";

// VALIDATION graph builder — deliberately distinct from the engine's gated
// builder (buildPrecedenceEdges in calendar-generation/helpers/Scheduler/
// precedenceEdges.ts). This one uses each queue's FULL logical member order:
// completed and unready members still produce edges, because transparency
// affects gating, never legality — un-completing an item must not be able to
// resurrect a latent cycle. Do NOT "unify" the two builders.
export function collectValidationEdges(
  queues: Queue[],
  dependencies: PlannerDependency[],
): PrecedenceEdge[] {
  const edges: PrecedenceEdge[] = [];

  for (const queue of queues) {
    const ordered = [...queue.members].sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
    for (let i = 1; i < ordered.length; i++) {
      edges.push({
        fromId: ordered[i - 1].plannerId,
        toId: ordered[i].plannerId,
        source: "queue",
        queueId: queue.id,
      });
    }
  }

  for (const dependency of dependencies) {
    edges.push({
      fromId: dependency.predecessorId,
      toId: dependency.successorId,
      source: "dependency",
    });
  }

  return edges;
}
