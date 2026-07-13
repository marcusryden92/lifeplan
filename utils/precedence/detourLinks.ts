import type { Planner } from "@/types/prisma";
import { getRootParentId } from "@/utils/goalPageHandlers";

// Detour-link authoring rules. A placeholder subtask carries linkedItemId
// pointing at a root goal/task ("target") whose leaves the engine splices in.
// Legality is enforced here at authoring time; the engine never sees a cycle
// (its enumerator additionally cycle-guards defensively).

// A target must be a triaged root task/goal — the same endpoint shape queues
// and dependencies require.
export function isValidDetourTarget(
  target: Planner | undefined,
): target is Planner {
  return (
    !!target &&
    target.parentId == null &&
    target.isTriaged &&
    (target.plannerType === "task" || target.plannerType === "goal")
  );
}

// Root-level detour graph: an edge rootOf(placeholder) -> linkedItemId for every
// existing link. A detour cycle is a cycle in this graph.
function buildDetourAdjacency(planner: Planner[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const p of planner) {
    if (!p.linkedItemId) continue;
    const root = getRootParentId(planner, p.id) ?? p.id;
    const set = adjacency.get(root);
    if (set) set.add(p.linkedItemId);
    else adjacency.set(root, new Set([p.linkedItemId]));
  }
  return adjacency;
}

function reaches(
  adjacency: Map<string, Set<string>>,
  from: string,
  to: string,
): boolean {
  const stack = [from];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === to) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of adjacency.get(node) ?? []) stack.push(next);
  }
  return false;
}

// Would linking `placeholderId` to `targetId` close a detour cycle? True when
// the target already splices (transitively) back into the placeholder's own
// root — including the self case (linking a subtask to its own root).
export function wouldCreateDetourCycle(
  planner: Planner[],
  placeholderId: string,
  targetId: string,
): boolean {
  const placeholderRoot = getRootParentId(planner, placeholderId);
  if (!placeholderRoot) return false;
  if (targetId === placeholderRoot) return true;
  const adjacency = buildDetourAdjacency(planner);
  return reaches(adjacency, targetId, placeholderRoot);
}

export interface DetourLinkCheck {
  ok: boolean;
  reason?: "invalid-target" | "self" | "cycle";
}

export function canLinkAsDetour(
  planner: Planner[],
  placeholderId: string,
  targetId: string,
): DetourLinkCheck {
  const byId = new Map(planner.map((p) => [p.id, p]));
  if (!isValidDetourTarget(byId.get(targetId))) {
    return { ok: false, reason: "invalid-target" };
  }
  const placeholderRoot = getRootParentId(planner, placeholderId);
  if (targetId === placeholderRoot) return { ok: false, reason: "self" };
  if (wouldCreateDetourCycle(planner, placeholderId, targetId)) {
    return { ok: false, reason: "cycle" };
  }
  return { ok: true };
}
