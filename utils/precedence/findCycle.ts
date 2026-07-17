import type { Queue, PlannerDependency, QueueMember, Planner } from "@/types/prisma";
import type { PrecedenceEdge } from "./types";
import {
  collectValidationEdges,
  detourComponentMap,
  contractPrecedenceEdges,
} from "./validationEdges";

// Cycle detection over the merged validation graph (queue logical order +
// dependency edges). Graphs are tiny — plain DFS everywhere. Passing
// `planner` folds detour links in: host and spliced target contract to one
// node, so a queue/dependency edge connecting them (directly or through a
// path) is refused as a cycle — at runtime the pair would mutually block.

function buildAdjacency(edges: PrecedenceEdge[]): Map<string, PrecedenceEdge[]> {
  const adjacency = new Map<string, PrecedenceEdge[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.fromId);
    if (list) list.push(edge);
    else adjacency.set(edge.fromId, [edge]);
  }
  return adjacency;
}

// DFS path from `fromId` to `toId` over the given edges; returns the edge
// path or null. Used to close a candidate edge into a displayable cycle.
function findPath(
  edges: PrecedenceEdge[],
  fromId: string,
  toId: string,
): PrecedenceEdge[] | null {
  const adjacency = buildAdjacency(edges);
  const visited = new Set<string>();

  const walk = (node: string): PrecedenceEdge[] | null => {
    if (node === toId) return [];
    if (visited.has(node)) return null;
    visited.add(node);
    for (const edge of adjacency.get(node) ?? []) {
      const rest = walk(edge.toId);
      if (rest) return [edge, ...rest];
    }
    return null;
  };

  return walk(fromId);
}

/**
 * Would adding `candidateEdge` to `edges` close a cycle? Returns the full
 * cycle path for display — candidate first, then the existing edges leading
 * from the candidate's target back to its source — or null when acyclic.
 */
export function findCycle(
  edges: PrecedenceEdge[],
  candidateEdge: PrecedenceEdge,
): PrecedenceEdge[] | null {
  if (candidateEdge.fromId === candidateEdge.toId) return [candidateEdge];
  const back = findPath(edges, candidateEdge.toId, candidateEdge.fromId);
  return back ? [candidateEdge, ...back] : null;
}

/**
 * Any cycle in the graph as an edge path, or null. Used for whole-state
 * mutations (queue reorders) where the offending edge isn't a single
 * candidate. Assumes the pre-mutation graph was acyclic, so any cycle found
 * involves the mutation.
 */
export function findCycleInGraph(
  edges: PrecedenceEdge[],
): PrecedenceEdge[] | null {
  const adjacency = buildAdjacency(edges);
  const done = new Set<string>();
  const onStack = new Set<string>();
  const stack: PrecedenceEdge[] = [];

  const walk = (node: string): PrecedenceEdge[] | null => {
    onStack.add(node);
    for (const edge of adjacency.get(node) ?? []) {
      if (onStack.has(edge.toId)) {
        const startIndex = stack.findIndex((e) => e.fromId === edge.toId);
        return [...stack.slice(startIndex === -1 ? 0 : startIndex), edge];
      }
      if (done.has(edge.toId)) continue;
      stack.push(edge);
      const cycle = walk(edge.toId);
      if (cycle) return cycle;
      stack.pop();
    }
    onStack.delete(node);
    done.add(node);
    return null;
  };

  for (const node of adjacency.keys()) {
    if (done.has(node)) continue;
    const cycle = walk(node);
    if (cycle) return cycle;
  }
  return null;
}

/**
 * Mutation shape 1: adding a dependency edge. Returns the closing cycle path
 * (candidate edge first) or null when legal.
 */
export function wouldCreateCycleAddingDependency(
  queues: Queue[],
  dependencies: PlannerDependency[],
  predecessorId: string,
  successorId: string,
  planner: Planner[] = [],
): PrecedenceEdge[] | null {
  const repr = detourComponentMap(planner);
  const edges = contractPrecedenceEdges(
    collectValidationEdges(queues, dependencies),
    repr,
  );
  return findCycle(edges, {
    fromId: repr.get(predecessorId) ?? predecessorId,
    toId: repr.get(successorId) ?? successorId,
    source: "dependency",
  });
}

const sortMembers = (members: QueueMember[]): QueueMember[] =>
  [...members].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );

function edgesWithQueueOrder(
  queues: Queue[],
  dependencies: PlannerDependency[],
  queueId: string,
  orderedPlannerIds: string[],
): PrecedenceEdge[] {
  const others = queues.filter((q) => q.id !== queueId);
  const edges = collectValidationEdges(others, dependencies);
  for (let i = 1; i < orderedPlannerIds.length; i++) {
    edges.push({
      fromId: orderedPlannerIds[i - 1],
      toId: orderedPlannerIds[i],
      source: "queue",
      queueId,
    });
  }
  return edges;
}

/**
 * Mutation shape 2: adding a planner to a queue at a position (defaults to
 * the end). Returns the cycle the insertion would close, or null.
 */
export function wouldCreateCycleAddingQueueMember(
  queues: Queue[],
  dependencies: PlannerDependency[],
  queueId: string,
  plannerId: string,
  atIndex?: number,
  planner: Planner[] = [],
): PrecedenceEdge[] | null {
  const queue = queues.find((q) => q.id === queueId);
  if (!queue) return null;
  const order = sortMembers(queue.members).map((m) => m.plannerId);
  const index = atIndex === undefined ? order.length : atIndex;
  order.splice(Math.max(0, Math.min(index, order.length)), 0, plannerId);
  return findCycleInGraph(
    contractPrecedenceEdges(
      edgesWithQueueOrder(queues, dependencies, queueId, order),
      detourComponentMap(planner),
    ),
  );
}

/**
 * Mutation shape 3: moving an existing member to a new position within its
 * queue. `toIndex` addresses the order AFTER the member is removed from its
 * old slot. Returns the cycle the reorder would close, or null.
 */
export function wouldCreateCycleReorderingQueueMember(
  queues: Queue[],
  dependencies: PlannerDependency[],
  queueId: string,
  plannerId: string,
  toIndex: number,
  planner: Planner[] = [],
): PrecedenceEdge[] | null {
  const queue = queues.find((q) => q.id === queueId);
  if (!queue) return null;
  const order = sortMembers(queue.members)
    .map((m) => m.plannerId)
    .filter((id) => id !== plannerId);
  order.splice(Math.max(0, Math.min(toIndex, order.length)), 0, plannerId);
  return findCycleInGraph(
    contractPrecedenceEdges(
      edgesWithQueueOrder(queues, dependencies, queueId, order),
      detourComponentMap(planner),
    ),
  );
}
