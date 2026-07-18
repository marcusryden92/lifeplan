import type { Planner } from "@/types/prisma";

// The canonical precedence-endpoint shape: an existing, root-level, triaged,
// non-plan item. Queue members, dependency endpoints, the engine's gated
// builder, the draft save apply, and the UI pickers all gate on this ONE
// predicate (each composing its own extra filters on top — e.g. completion
// for pickers). Completed and unready rows deliberately pass: transparency
// affects gating, never membership. Detour targets keep their own predicate
// (isValidDetourTarget) — root-only permanently.
export const isValidPrecedenceEndpoint = (
  planner: Planner | undefined,
): planner is Planner =>
  !!planner &&
  planner.parentId == null &&
  planner.plannerType !== "plan" &&
  planner.isTriaged;

// Node-level dependency endpoints: any existing non-plan node whose
// STRUCTURAL ROOT is a triaged non-plan item. Dependencies alone are relaxed
// to this shape — queue members and detour targets keep the root predicate
// above. A dangling parent chain (orphaned row) is invalid.
export function isValidDependencyEndpoint(
  byId: Map<string, Planner>,
  id: string,
): boolean {
  const row = byId.get(id);
  if (!row || row.plannerType === "plan") return false;
  const seen = new Set<string>([row.id]);
  let current = row;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent || seen.has(parent.id)) return false;
    seen.add(parent.id);
    current = parent;
  }
  return current.plannerType !== "plan" && current.isTriaged;
}
