import type { Planner, PlannerDependency } from "@/types/prisma";
import { plannerIsCompleted } from "@/utils/plannerCompletion";

// Authoring-time readiness gate helpers. A goal cannot be marked ready while
// a dependency predecessor is an unready goal; symmetrically, un-readying a
// goal that a READY goal depends on is refused. Task predecessors and
// completed predecessors never block.

export function dependencyReadyBlockers(
  plannerId: string,
  dependencies: PlannerDependency[],
  planner: Planner[],
): Planner[] {
  const plannerById = new Map(planner.map((p) => [p.id, p]));
  const blockers: Planner[] = [];
  for (const dependency of dependencies) {
    if (dependency.successorId !== plannerId) continue;
    const predecessor = plannerById.get(dependency.predecessorId);
    if (!predecessor) continue;
    if (predecessor.plannerType !== "goal") continue;
    if (predecessor.isReady === true) continue;
    if (plannerIsCompleted(predecessor)) continue;
    blockers.push(predecessor);
  }
  return blockers;
}

export function readyDependents(
  plannerId: string,
  dependencies: PlannerDependency[],
  planner: Planner[],
): Planner[] {
  const plannerById = new Map(planner.map((p) => [p.id, p]));
  const dependents: Planner[] = [];
  for (const dependency of dependencies) {
    if (dependency.predecessorId !== plannerId) continue;
    const successor = plannerById.get(dependency.successorId);
    if (!successor) continue;
    if (successor.plannerType !== "goal") continue;
    if (successor.isReady !== true) continue;
    if (plannerIsCompleted(successor)) continue;
    dependents.push(successor);
  }
  return dependents;
}
