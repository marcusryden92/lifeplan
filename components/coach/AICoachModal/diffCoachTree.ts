import type { CoachNode } from "./plannerTreeToJson";

export type DiffStatus = "unchanged" | "modified" | "added" | "deleted";

export interface DiffNode extends Omit<CoachNode, "children"> {
  status: DiffStatus;
  children: DiffNode[];
  // Populated only when status === "modified". Names of the fields that
  // differ between canonical and working (title, duration, deadline, etc.).
  changedFields: string[];
}

// Produce a tree that overlays working onto canonical, tagging each node with
// its diff status. Deleted nodes (present in canonical, missing from working)
// are re-inserted at the end of their original parent's child list so the user
// still sees "this used to be here, it's gone" at the correct level of the
// hierarchy.
export function diffCoachTree(
  working: CoachNode | null,
  canonical: CoachNode | null,
): DiffNode | null {
  if (!working && !canonical) return null;
  if (!working && canonical) return markSubtree(canonical, "deleted");
  if (working && !canonical) return markSubtree(working, "added");
  return diffNode(working!, canonical!);
}

function diffNode(working: CoachNode, canonical: CoachNode): DiffNode {
  const changedFields = fieldsThatChanged(working, canonical);
  const status: DiffStatus =
    changedFields.length > 0 ? "modified" : "unchanged";

  const canonicalChildById = new Map<string, CoachNode>();
  for (const c of canonical.children) {
    if (c.id) canonicalChildById.set(c.id, c);
  }
  const workingChildIds = new Set<string>();
  for (const c of working.children) {
    if (c.id) workingChildIds.add(c.id);
  }

  const diffedChildren: DiffNode[] = [];

  // Retained + added children — preserve the order the AI proposed.
  for (const workingChild of working.children) {
    const canonicalChild = workingChild.id
      ? canonicalChildById.get(workingChild.id)
      : undefined;
    if (canonicalChild) {
      diffedChildren.push(diffNode(workingChild, canonicalChild));
    } else {
      diffedChildren.push(markSubtree(workingChild, "added"));
    }
  }

  // Deleted children — appended at the end of THIS parent's children so the
  // user still sees the removal in place.
  for (const canonicalChild of canonical.children) {
    if (canonicalChild.id && !workingChildIds.has(canonicalChild.id)) {
      diffedChildren.push(markSubtree(canonicalChild, "deleted"));
    }
  }

  return {
    id: working.id,
    title: working.title,
    plannerType: working.plannerType,
    duration: working.duration,
    deadline: working.deadline,
    priority: working.priority,
    isReady: working.isReady,
    status,
    children: diffedChildren,
    changedFields,
  };
}

function markSubtree(node: CoachNode, status: DiffStatus): DiffNode {
  return {
    id: node.id,
    title: node.title,
    plannerType: node.plannerType,
    duration: node.duration,
    deadline: node.deadline,
    priority: node.priority,
    isReady: node.isReady,
    status,
    changedFields: [],
    children: node.children.map((c) => markSubtree(c, status)),
  };
}

function fieldsThatChanged(a: CoachNode, b: CoachNode): string[] {
  const changed: string[] = [];
  if (a.title !== b.title) changed.push("title");
  if (a.plannerType !== b.plannerType) changed.push("plannerType");
  if (a.duration !== b.duration) changed.push("duration");
  if (a.deadline !== b.deadline) changed.push("deadline");
  if (a.priority !== b.priority) changed.push("priority");
  if (a.isReady !== b.isReady) changed.push("isReady");
  return changed;
}
