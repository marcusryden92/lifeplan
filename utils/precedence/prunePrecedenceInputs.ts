import type { Planner, Queue, PlannerDependency } from "@/types/prisma";

// Central pruning for precedence structures. Runs in the calendar thunk on
// every pass, so a member/endpoint planner that is deleted, retyped to plan,
// nested under a parent, or sent back to the triage queue is dropped wherever
// the mutation originated; DB cascade covers server-side deletes. Completed
// and unready rows are deliberately KEPT — they are valid transparent links /
// gate inputs (transparency affects gating, never membership).
const isValidPrecedenceEndpoint = (planner: Planner | undefined): boolean =>
  !!planner &&
  planner.parentId == null &&
  planner.plannerType !== "plan" &&
  planner.isTriaged;

export function pruneQueueMembers(
  queues: Queue[],
  planner: Planner[],
): Queue[] {
  if (queues.length === 0) return queues;
  const plannerById = new Map(planner.map((p) => [p.id, p]));

  let changed = false;
  const next = queues.map((queue) => {
    const members = queue.members.filter((m) =>
      isValidPrecedenceEndpoint(plannerById.get(m.plannerId)),
    );
    if (members.length === queue.members.length) return queue;
    changed = true;
    return { ...queue, members };
  });

  return changed ? next : queues;
}

export function pruneDependencies(
  dependencies: PlannerDependency[],
  planner: Planner[],
): PlannerDependency[] {
  if (dependencies.length === 0) return dependencies;
  const plannerById = new Map(planner.map((p) => [p.id, p]));

  const next = dependencies.filter(
    (d) =>
      isValidPrecedenceEndpoint(plannerById.get(d.predecessorId)) &&
      isValidPrecedenceEndpoint(plannerById.get(d.successorId)),
  );

  return next.length === dependencies.length ? dependencies : next;
}
