import { v4 as uuidv4 } from "uuid";
import type { CoachNode } from "./plannerTreeToJson";
import type { CoachForest } from "./plannerForestToJson";
import { normalizeCoachTree } from "./normalizeCoachTree";

// Deterministic operations on a CoachForest, executed server-side on the
// assistant's working copy so the model states intent (ids + fields) and code
// performs the tree surgery — no retyped trees, no transcription drift. All
// functions are pure (clone-then-mutate); the dependency linked list is not
// represented here at all — it is derived from array order once, at Save, by
// applyCoachForestToPlanner. The update-dependencies utilities are untouched.

export interface CoachOpFailure {
  id: string | null;
  reason: string;
}

export interface CoachOpsResult {
  forest: CoachForest;
  // Roots whose trees changed — the route emits these as forest events.
  updatedRootIds: string[];
  // Top-level goals removed entirely.
  deletedGoalIds: string[];
  failures: CoachOpFailure[];
}

export interface CoachSearchHit {
  id: string;
  title: string;
  plannerType: CoachNode["plannerType"];
  rootId: string;
  rootTitle: string;
  // "Root > Branch > Node" — disambiguates same-titled items.
  path: string;
}

export interface CoachItemUpdate {
  id: string;
  title?: string;
  duration?: number;
  deadline?: string | null;
  priority?: number;
  isReady?: boolean | null;
  categoryId?: string | null;
}

export interface CoachMoveArgs {
  itemId: string;
  newParentId: string;
  // Insert after this sibling (must be a child of newParentId); atStart wins
  // over it; neither -> append at the end.
  afterSiblingId?: string;
  atStart?: boolean;
}

export interface CoachAddArgs {
  parentId: string;
  items: unknown[];
  afterSiblingId?: string;
  atStart?: boolean;
}

function cloneForest(forest: CoachForest): CoachForest {
  return JSON.parse(JSON.stringify(forest)) as CoachForest;
}

interface NodeLocation {
  node: CoachNode;
  // null when the node is a top-level root.
  parent: CoachNode | null;
  root: CoachNode;
}

function locate(forest: CoachForest, id: string): NodeLocation | null {
  if (!id) return null;
  for (const root of forest.goals) {
    if (root.id === id) return { node: root, parent: null, root };
    const found = locateWithin(root, id);
    if (found) return { ...found, root };
  }
  return null;
}

function locateWithin(
  parent: CoachNode,
  id: string,
): { node: CoachNode; parent: CoachNode } | null {
  for (const child of parent.children) {
    if (child.id === id) return { node: child, parent };
    const found = locateWithin(child, id);
    if (found) return found;
  }
  return null;
}

function subtreeContains(node: CoachNode, id: string): boolean {
  if (node.id === id) return true;
  return node.children.some((child) => subtreeContains(child, id));
}

export function searchCoachItems(
  forest: CoachForest,
  query: string,
  limit = 25,
): CoachSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: { hit: CoachSearchHit; score: number }[] = [];
  const visit = (node: CoachNode, root: CoachNode, path: string[]) => {
    const title = node.title.toLowerCase();
    const score =
      title === q ? 3 : title.startsWith(q) ? 2 : title.includes(q) ? 1 : 0;
    // Nodes without ids are unsaved additions from this session — they can't
    // be referenced by id, so surfacing them would only mislead the model.
    if (score > 0 && node.id) {
      scored.push({
        hit: {
          id: node.id,
          title: node.title,
          plannerType: node.plannerType,
          rootId: root.id,
          rootTitle: root.title,
          path: [...path, node.title].join(" > "),
        },
        score,
      });
    }
    for (const child of node.children) visit(child, root, [...path, node.title]);
  };
  for (const root of forest.goals) visit(root, root, []);

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.hit);
}

export function updateCoachItems(
  forest: CoachForest,
  updates: CoachItemUpdate[],
  validCategoryIds: ReadonlySet<string>,
): CoachOpsResult {
  const next = cloneForest(forest);
  const updatedRootIds = new Set<string>();
  const failures: CoachOpFailure[] = [];

  for (const update of updates) {
    const id = typeof update.id === "string" ? update.id : "";
    const found = locate(next, id);
    if (!found) {
      failures.push({ id: id || null, reason: "item not found" });
      continue;
    }
    const { node, parent, root } = found;
    const isRoot = parent === null;

    if (typeof update.title === "string") {
      const trimmed = update.title.trim();
      if (trimmed.length === 0) {
        failures.push({ id, reason: "title must be non-empty" });
        continue;
      }
      node.title = trimmed;
    }
    if (update.duration !== undefined) {
      if (typeof update.duration !== "number" || !isFinite(update.duration)) {
        failures.push({ id, reason: "duration must be a number of minutes" });
        continue;
      }
      node.duration = Math.max(1, Math.floor(update.duration));
    }
    if (update.deadline !== undefined) {
      if (update.deadline !== null && typeof update.deadline !== "string") {
        failures.push({ id, reason: "deadline must be a string or null" });
        continue;
      }
      node.deadline = update.deadline;
    }
    if (update.priority !== undefined) {
      if (typeof update.priority !== "number" || !isFinite(update.priority)) {
        failures.push({ id, reason: "priority must be an integer" });
        continue;
      }
      node.priority = Math.floor(update.priority);
    }
    if (update.categoryId !== undefined) {
      if (!isRoot) {
        failures.push({
          id,
          reason: "categoryId can only be set on top-level goals",
        });
        continue;
      }
      if (
        update.categoryId !== null &&
        !validCategoryIds.has(update.categoryId)
      ) {
        failures.push({ id, reason: "unknown categoryId" });
        continue;
      }
      node.categoryId = update.categoryId;
    }
    if (update.isReady !== undefined) {
      if (update.isReady !== null && typeof update.isReady !== "boolean") {
        failures.push({ id, reason: "isReady must be a boolean or null" });
        continue;
      }
      // Same gate as the app's manual "Mark ready": a top-level goal needs
      // subtasks and a deadline.
      if (
        update.isReady === true &&
        isRoot &&
        (node.children.length === 0 || node.deadline === null)
      ) {
        failures.push({
          id,
          reason:
            "a goal can only be readied when it has at least one subtask and a deadline",
        });
        continue;
      }
      node.isReady = update.isReady;
    }

    updatedRootIds.add(root.id);
  }

  return {
    forest: next,
    updatedRootIds: [...updatedRootIds],
    deletedGoalIds: [],
    failures,
  };
}

export function moveCoachItem(
  forest: CoachForest,
  args: CoachMoveArgs,
): CoachOpsResult {
  const fail = (id: string | null, reason: string): CoachOpsResult => ({
    forest,
    updatedRootIds: [],
    deletedGoalIds: [],
    failures: [{ id, reason }],
  });

  const next = cloneForest(forest);
  const itemLoc = locate(next, args.itemId);
  if (!itemLoc) return fail(args.itemId ?? null, "item not found");
  if (itemLoc.parent === null) {
    return fail(
      args.itemId,
      "top-level goals cannot be moved with this tool; use propose_goals",
    );
  }

  const parentLoc = locate(next, args.newParentId);
  if (!parentLoc) return fail(args.newParentId ?? null, "new parent not found");
  if (subtreeContains(itemLoc.node, args.newParentId)) {
    return fail(args.newParentId, "cannot move an item into its own subtree");
  }
  if (parentLoc.root.id !== itemLoc.root.id) {
    return fail(
      args.itemId,
      "cross-goal moves change item identity and are not supported; use propose_goals",
    );
  }

  const oldChildren = itemLoc.parent.children;
  oldChildren.splice(oldChildren.indexOf(itemLoc.node), 1);

  const target = parentLoc.node.children;
  if (args.atStart) {
    target.unshift(itemLoc.node);
  } else if (args.afterSiblingId) {
    const index = target.findIndex((c) => c.id === args.afterSiblingId);
    if (index === -1) {
      return fail(
        args.afterSiblingId,
        "afterSiblingId is not a child of the new parent",
      );
    }
    target.splice(index + 1, 0, itemLoc.node);
  } else {
    target.push(itemLoc.node);
  }

  return {
    forest: next,
    updatedRootIds: [itemLoc.root.id],
    deletedGoalIds: [],
    failures: [],
  };
}

export function deleteCoachItems(
  forest: CoachForest,
  itemIds: string[],
): CoachOpsResult {
  const next = cloneForest(forest);
  const updatedRootIds = new Set<string>();
  const deletedGoalIds: string[] = [];
  const failures: CoachOpFailure[] = [];

  for (const id of [...new Set(itemIds)]) {
    const found = locate(next, id);
    if (!found) {
      // May have been inside a subtree already deleted this call.
      failures.push({ id, reason: "item not found (already deleted?)" });
      continue;
    }
    if (found.parent === null) {
      next.goals = next.goals.filter((g) => g.id !== id);
      deletedGoalIds.push(id);
      updatedRootIds.delete(id);
    } else {
      found.parent.children.splice(
        found.parent.children.indexOf(found.node),
        1,
      );
      updatedRootIds.add(found.root.id);
    }
  }

  return {
    forest: next,
    updatedRootIds: [...updatedRootIds].filter(
      (id) => !deletedGoalIds.includes(id),
    ),
    deletedGoalIds,
    failures,
  };
}

export function addCoachItems(
  forest: CoachForest,
  args: CoachAddArgs,
): CoachOpsResult {
  const fail = (id: string | null, reason: string): CoachOpsResult => ({
    forest,
    updatedRootIds: [],
    deletedGoalIds: [],
    failures: [{ id, reason }],
  });

  const next = cloneForest(forest);
  const parentLoc = locate(next, args.parentId);
  if (!parentLoc) return fail(args.parentId ?? null, "parent not found");

  const items = (Array.isArray(args.items) ? args.items : [])
    .map((raw) => normalizeCoachTree(raw))
    .filter((node): node is CoachNode => node !== null)
    .map(mintDraftIds);
  if (items.length === 0) return fail(null, "no valid items to add");

  const target = parentLoc.node.children;
  let index = target.length;
  if (args.atStart) {
    index = 0;
  } else if (args.afterSiblingId) {
    const siblingIndex = target.findIndex((c) => c.id === args.afterSiblingId);
    if (siblingIndex === -1) {
      return fail(args.afterSiblingId, "afterSiblingId is not a child of the parent");
    }
    index = siblingIndex + 1;
  }
  target.splice(index, 0, ...items);

  return {
    forest: next,
    updatedRootIds: [parentLoc.root.id],
    deletedGoalIds: [],
    failures: [],
  };
}

// Added nodes are new by definition, so any model-supplied id is discarded
// (which also blocks "moving" an existing item via add_items) and a fresh
// draft id is minted in its place — draft nodes stay addressable by every
// tool. Permanent UUIDs still replace draft ids at Save.
function mintDraftIds(node: CoachNode): CoachNode {
  return {
    ...node,
    id: uuidv4(),
    categoryId: null,
    children: node.children.map(mintDraftIds),
  };
}
