import { v4 as uuidv4 } from "uuid";
import type { Planner } from "@/types/prisma";
import { PlannerType } from "@/generated/client";
import {
  getSortedTreeBottomLayer,
  getTaskTreeIds,
} from "@/utils/goalPageHandlers";
import { plannerTreeToJson, type DraftNode } from "./plannerTreeToJson";
import type { DraftForest } from "./plannerForestToJson";
import { draftTreesEqual } from "./diffDraftTree";

interface ApplyForestArgs {
  planner: Planner[];
  workingForest: DraftForest;
  userId: string;
  // The user's category ids. A model-supplied categoryId outside this set is
  // ignored (existing value kept / null for new roots).
  validCategoryIds: ReadonlySet<string>;
}

// Reverse of plannerForestToJson: takes the accepted working forest and
// produces the full Planner[] the app should now hold. Applied sequentially —
// deleted roots first, then retained goals (only those that actually changed,
// so untouched goals see zero updatedAt churn), then new roots. Preserves
// existing planner UUIDs for retained nodes and mints fresh ones for new
// nodes; that invariant is load-bearing for future inter-goal dependencies.
export function applyDraftForestToPlanner({
  planner,
  workingForest,
  userId,
  validCategoryIds,
}: ApplyForestArgs): Planner[] {
  const now = new Date().toISOString();
  let current = planner;

  // 1. Deleted roots: every triaged top-level row (what plannerForestToJson
  // sent out) whose id no longer appears in the working forest.
  const workingIds = new Set(
    workingForest.goals.map((g) => g.id).filter((id) => id.length > 0),
  );
  const canonicalRootIds = planner
    .filter((p) => !p.parentId && p.isTriaged)
    .map((p) => p.id);
  for (const rootId of canonicalRootIds) {
    if (!workingIds.has(rootId)) {
      current = deleteRootSubtree(current, rootId, now);
    }
  }

  // 2 + 3. Retained edits and new roots, in working order. A working goal is
  // "retained" only if its id matches a current top-level row — an id that
  // matches some nested row is out of contract (the model moved a subtree
  // across goals) and is handled safely as a brand-new goal with fresh ids.
  for (const goal of workingForest.goals) {
    const isRetainedRoot =
      goal.id.length > 0 &&
      current.some((p) => p.id === goal.id && !p.parentId);
    if (isRetainedRoot) {
      const canonicalGoal = plannerTreeToJson(current, goal.id);
      if (canonicalGoal && draftTreesEqual(goal, canonicalGoal)) continue;
      current = applyTreeToExistingRoot({
        planner: current,
        rootId: goal.id,
        workingTree: goal,
        userId,
        validCategoryIds,
        now,
      });
    } else {
      current = [
        ...current,
        ...buildNewRootRows(goal, userId, validCategoryIds, now),
      ];
    }
  }

  // Safety pass: no dependency may point at a row that no longer exists.
  const remainingIds = new Set(current.map((p) => p.id));
  return current.map((p) =>
    p.dependency && !remainingIds.has(p.dependency)
      ? { ...p, dependency: null, updatedAt: now }
      : p,
  );
}

// Remove a top-level goal and its whole subtree, bridging the outer
// dependency chain over it: whoever depended on the subtree's last
// bottom-layer leaf is re-pointed at whatever the subtree's first leaf
// depended on (the chain's inbound edge, or null).
function deleteRootSubtree(
  planner: Planner[],
  rootId: string,
  now: string,
): Planner[] {
  const rootRow = planner.find((p) => p.id === rootId);
  if (!rootRow) return planner;

  const treeIds = new Set(getTaskTreeIds(planner, rootId));
  // getTreeBottomLayer returns the root itself for a childless goal, so the
  // bottom layer is never empty here.
  const bottomLayer = getSortedTreeBottomLayer(planner, rootId);
  const lastLeafId =
    bottomLayer.length > 0 ? bottomLayer[bottomLayer.length - 1].id : rootId;
  const firstLeafDep = bottomLayer[0]?.dependency ?? null;
  const bridgeDep =
    firstLeafDep && !treeIds.has(firstLeafDep) ? firstLeafDep : null;

  return planner
    .filter((p) => !treeIds.has(p.id))
    .map((p) =>
      p.dependency === lastLeafId
        ? { ...p, dependency: bridgeDep, updatedAt: now }
        : p,
    );
}

interface ApplyTreeArgs {
  planner: Planner[];
  rootId: string;
  workingTree: DraftNode;
  userId: string;
  validCategoryIds: ReadonlySet<string>;
  now: string;
}

// Apply an accepted DraftNode tree onto an existing root. Preserves existing
// planner UUIDs for retained nodes, mints fresh UUIDs for new ones,
// re-threads the dependency linked list through the bottom layer, and fixes
// up the outer-chain neighbor whose dependency pointed at the old last leaf
// of this subtree.
function applyTreeToExistingRoot({
  planner,
  rootId,
  workingTree,
  userId,
  validCategoryIds,
  now,
}: ApplyTreeArgs): Planner[] {
  const canonicalById = new Map<string, Planner>(planner.map((p) => [p.id, p]));
  const rootRow = canonicalById.get(rootId);
  if (!rootRow) return planner;

  // Everything inside the root subtree (excluding the root itself). These are
  // the rows we may keep, update, or discard.
  const oldDescendantIds = new Set(
    getTaskTreeIds(planner, rootId).filter((id) => id !== rootId),
  );

  // Last leaf id of the OLD subtree — used to fix the outer neighbor whose
  // dependency was pointing at it. If root had no children, root was its own
  // bottom layer, so the neighbor's dependency was root's id.
  const oldBottomLayer = getSortedTreeBottomLayer(planner, rootId);
  const oldLastLeafId =
    oldBottomLayer.length > 0
      ? oldBottomLayer[oldBottomLayer.length - 1].id
      : rootId;

  // Root row categoryId: applied only when it names one of the user's
  // categories; null means "unspecified" (mergeDraftForest already backfills
  // retained roots, so a null here keeps the existing value).
  const nextCategoryId =
    workingTree.categoryId && validCategoryIds.has(workingTree.categoryId)
      ? workingTree.categoryId
      : rootRow.categoryId;

  function inheritFromCanonical(startId: string | null): string | null {
    const visited = new Set<string>();
    let currentId = startId;
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const row = canonicalById.get(currentId);
      if (!row) return null;
      if (row.categoryId) return row.categoryId;
      currentId = row.parentId ?? null;
    }
    return null;
  }
  const rootEffectiveCategoryId =
    nextCategoryId ?? inheritFromCanonical(rootRow.parentId ?? null);

  const newRows: Planner[] = [];
  // Cursor for the dependency linked list; starts at whatever came before the
  // root in schedule order (root's own dep — an id outside this subtree, or
  // null if root has no predecessor).
  let cursor: string | null = rootRow.dependency ?? null;

  // Preorder traversal that both (a) mints/reuses ids and builds Planner rows
  // and (b) threads the dependency cursor at each node. Intermediate nodes
  // record their cursor value at visit time; leaves advance the cursor.
  // The effective category is passed down (rows are built post-order for
  // threading, so a lookup-after-the-fact would miss new intermediate nodes):
  // a retained node's own category wins, otherwise the inherited one flows on.
  function processAndThread(
    node: DraftNode,
    parentId: string,
    inheritedCategoryId: string | null,
  ): string {
    const canRetain = node.id.length > 0 && oldDescendantIds.has(node.id);
    const nodeId = canRetain ? node.id : uuidv4();
    const nodeDep = cursor;
    const existing = canonicalById.get(nodeId);
    const effectiveCategoryId = existing?.categoryId ?? inheritedCategoryId;

    const isLeaf = node.children.length === 0;
    if (isLeaf) cursor = nodeId;

    for (const child of node.children) {
      processAndThread(child, nodeId, effectiveCategoryId);
    }

    const row: Planner = existing
      ? {
          ...existing,
          title: node.title,
          plannerType: normalizePlannerType(node.plannerType),
          duration: Math.max(1, Math.floor(node.duration)),
          deadline: node.deadline,
          priority: node.priority,
          // Readiness cascades from the root: the subtree is ready or
          // unready as one, matching the manual toggle's semantics.
          isReady: workingTree.isReady,
          parentId,
          dependency: nodeDep,
          updatedAt: now,
        }
      : {
          id: nodeId,
          title: node.title,
          parentId,
          plannerType: normalizePlannerType(node.plannerType),
          isReady: workingTree.isReady,
          isTriaged: true,
          duration: Math.max(1, Math.floor(node.duration)),
          deadline: node.deadline,
          starts: null,
          dependency: nodeDep,
          completedStartTime: null,
          completedEndTime: null,
          priority: node.priority,
          userId,
          color: null,
          locationId: null,
          useParentLocation: false,
          categoryId: inheritedCategoryId,
          createdAt: now,
          updatedAt: now,
        };
    newRows.push(row);
    return nodeId;
  }

  for (const child of workingTree.children) {
    processAndThread(child, rootId, rootEffectiveCategoryId);
  }

  // If the new tree has no children, root itself is the bottom layer, so the
  // outer neighbor's dependency should point at root. Otherwise, cursor now
  // holds the id of the deepest last leaf of the new subtree.
  const newLastLeafId = workingTree.children.length === 0 ? rootId : cursor!;

  // Root row: update the fields the assistant may have changed. Preserve
  // dependency, parentId, locationId, color — those are part of root's
  // position/identity in the outer tree, not its subtask structure.
  const updatedRoot: Planner = {
    ...rootRow,
    title: workingTree.title,
    duration: Math.max(1, Math.floor(workingTree.duration)),
    deadline: workingTree.deadline,
    priority: workingTree.priority,
    isReady: workingTree.isReady,
    categoryId: nextCategoryId,
    updatedAt: now,
  };

  // Rebuild the planner array: keep everything outside the subtree, patch the
  // outer-chain neighbor if the last leaf changed, then append root + new rows.
  const outsideSubtree: Planner[] = [];
  for (const p of planner) {
    if (p.id === rootId) continue;
    if (oldDescendantIds.has(p.id)) continue;
    if (oldLastLeafId !== newLastLeafId && p.dependency === oldLastLeafId) {
      outsideSubtree.push({ ...p, dependency: newLastLeafId, updatedAt: now });
    } else {
      outsideSubtree.push(p);
    }
  }

  return [...outsideSubtree, updatedRoot, ...newRows];
}

// Build the rows for a brand-new top-level goal. The root gets top-level
// creation semantics (parentId null, dependency null — new roots stay out of
// the outer top-level chain, matching Capture's behavior; the sort fallback
// handles chainless roots). Children are threaded internally from a null
// cursor with the same defaults as new nodes inside an existing goal.
function buildNewRootRows(
  node: DraftNode,
  userId: string,
  validCategoryIds: ReadonlySet<string>,
  now: string,
): Planner[] {
  const rootId = uuidv4();
  const rootCategoryId =
    node.categoryId && validCategoryIds.has(node.categoryId)
      ? node.categoryId
      : null;

  const rows: Planner[] = [];
  let cursor: string | null = null;

  // The app's manual gate only allows readying a goal with subtasks and a
  // deadline; hold AI-created goals to the same rule. Readiness cascades
  // from the root: every row in the subtree carries the same value.
  const canBeReady = node.children.length > 0 && node.deadline !== null;
  const rootIsReady = node.isReady === true && canBeReady;

  function thread(child: DraftNode, parentId: string): void {
    const childId = uuidv4();
    const childDep = cursor;
    if (child.children.length === 0) cursor = childId;

    for (const grandchild of child.children) {
      thread(grandchild, childId);
    }

    rows.push({
      id: childId,
      title: child.title,
      parentId,
      plannerType: normalizePlannerType(child.plannerType),
      isReady: rootIsReady,
      isTriaged: true,
      duration: Math.max(1, Math.floor(child.duration)),
      deadline: child.deadline,
      starts: null,
      dependency: childDep,
      completedStartTime: null,
      completedEndTime: null,
      priority: child.priority,
      userId,
      color: null,
      locationId: null,
      useParentLocation: false,
      // Every row in a new goal inherits the root's category; the draft
      // contract carries categoryId on roots only.
      categoryId: rootCategoryId,
      createdAt: now,
      updatedAt: now,
    });
  }

  const rootRow: Planner = {
    id: rootId,
    title: node.title,
    parentId: null,
    plannerType: normalizeRootType(node.plannerType, node.children.length > 0),
    isReady: rootIsReady,
    isTriaged: true,
    duration: Math.max(1, Math.floor(node.duration)),
    deadline: node.deadline,
    starts: null,
    dependency: null,
    completedStartTime: null,
    completedEndTime: null,
    priority: node.priority,
    userId,
    color: null,
    locationId: null,
    useParentLocation: false,
    categoryId: rootCategoryId,
    createdAt: now,
    updatedAt: now,
  };
  rows.push(rootRow);

  for (const child of node.children) {
    thread(child, rootId);
  }

  return rows;
}

function normalizePlannerType(raw: DraftNode["plannerType"]): PlannerType {
  if (raw === "goal") return PlannerType.goal;
  if (raw === "plan") return PlannerType.plan;
  return PlannerType.task;
}

// New top-level rows must never be plans — a plan needs a fixed `starts`,
// which the draft contract doesn't carry. The prompt forbids it; this is the
// defensive coercion if the model does it anyway.
function normalizeRootType(
  raw: DraftNode["plannerType"],
  hasChildren: boolean,
): PlannerType {
  if (raw === "goal") return PlannerType.goal;
  if (raw === "task") return PlannerType.task;
  return hasChildren ? PlannerType.goal : PlannerType.task;
}
