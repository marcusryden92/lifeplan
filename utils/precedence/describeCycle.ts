import type { Planner, Queue } from "@/types/prisma";
import type { PrecedenceEdge } from "./types";

// Human-readable cycle path for the block-and-explain surfaces (dependency
// picker, queue reorder refusal): titles joined by arrows, queue hops named
// ("through the Work queue"). Null-safe on deleted rows.
export function describeCycle(
  cycle: PrecedenceEdge[],
  planners: Planner[],
  queues: Queue[],
): string {
  if (cycle.length === 0) return "";
  const plannerById = new Map(planners.map((p) => [p.id, p]));
  const queueById = new Map(queues.map((q) => [q.id, q]));
  const title = (id: string) => plannerById.get(id)?.title ?? "an item";

  const parts: string[] = [`"${title(cycle[0].fromId)}"`];
  for (const edge of cycle) {
    const hop = `"${title(edge.toId)}"`;
    if (edge.source === "queue" && edge.queueId) {
      const queue = queueById.get(edge.queueId);
      parts.push(queue ? `${hop} (through the ${queue.title} queue)` : hop);
    } else {
      parts.push(hop);
    }
  }
  return parts.join(" → ");
}
