import type { Queue, PlannerDependency, Planner } from "@/types/prisma";
import type { PrecedenceEdge } from "./types";
import { getRootParentId } from "@/utils/goalPageHandlers";

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

// A detour splices the target's work INSIDE the host's sequence, making host
// and target mutually ordered — for cycle legality they are one node. This
// union-find map contracts every detour-connected component to a
// representative planner id; queue/dependency edges are validated over the
// contracted graph, so any path connecting a host with its spliced target (in
// either direction) closes a cycle and is refused. Unready/completed targets
// still count — legality, not gating, same rule as queue members.
export function detourComponentMap(planner: Planner[]): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== undefined && parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    let current = id;
    while (current !== root) {
      const next = parent.get(current)!;
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const p of planner) {
    if (!p.linkedItemId) continue;
    const hostRoot = getRootParentId(planner, p.id) ?? p.id;
    parent.set(hostRoot, parent.get(hostRoot) ?? hostRoot);
    parent.set(p.linkedItemId, parent.get(p.linkedItemId) ?? p.linkedItemId);
    union(hostRoot, p.linkedItemId);
  }

  const repr = new Map<string, string>();
  for (const id of parent.keys()) repr.set(id, find(id));
  return repr;
}

// Rewrite edge endpoints through the detour component map. Identity when the
// map is empty, so detour-free callers see the exact same graph.
export function contractPrecedenceEdges(
  edges: PrecedenceEdge[],
  repr: Map<string, string>,
): PrecedenceEdge[] {
  if (repr.size === 0) return edges;
  return edges.map((e) => {
    const fromId = repr.get(e.fromId) ?? e.fromId;
    const toId = repr.get(e.toId) ?? e.toId;
    return fromId === e.fromId && toId === e.toId ? e : { ...e, fromId, toId };
  });
}
