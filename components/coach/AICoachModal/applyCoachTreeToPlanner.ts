import { v4 as uuidv4 } from "uuid";
import type { Planner } from "@/types/prisma";
import { PlannerType } from "@/generated/client";
import {
  getSortedTreeBottomLayer,
  getTaskTreeIds,
} from "@/utils/goalPageHandlers";
import type { CoachNode } from "./plannerTreeToJson";

interface ApplyArgs {
  planner: Planner[];
  rootId: string;
  workingTree: CoachNode;
  userId: string;
}

// Reverse of plannerTreeToJson: takes an accepted CoachNode tree and produces
// the full Planner[] the app should now hold. Preserves existing planner UUIDs
// for retained nodes, mints fresh UUIDs for new ones, re-threads the
// dependency linked list through the bottom layer, and fixes up the
// outer-chain neighbor whose dependency pointed at the old last leaf of this
// subtree.
export function applyCoachTreeToPlanner({
  planner,
  rootId,
  workingTree,
  userId,
}: ApplyArgs): Planner[] {
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

  const now = new Date().toISOString();
  const newRows: Planner[] = [];
  const newRowById = new Map<string, Planner>();
  // Cursor for the dependency linked list; starts at whatever came before the
  // root in schedule order (root's own dep — an id outside this subtree, or
  // null if root has no predecessor).
  let cursor: string | null = rootRow.dependency ?? null;

  function inheritCategoryId(parentId: string): string | null {
    const parentRow = newRowById.get(parentId) ?? canonicalById.get(parentId);
    if (!parentRow) return null;
    if (parentRow.categoryId) return parentRow.categoryId;
    if (parentRow.parentId) return inheritCategoryId(parentRow.parentId);
    return null;
  }

  // Preorder traversal that both (a) mints/reuses ids and builds Planner rows
  // and (b) threads the dependency cursor at each node. Intermediate nodes
  // record their cursor value at visit time; leaves advance the cursor.
  function processAndThread(node: CoachNode, parentId: string): string {
    const canRetain =
      typeof node.id === "string" &&
      node.id.length > 0 &&
      oldDescendantIds.has(node.id);
    const nodeId = canRetain ? node.id : uuidv4();
    const nodeDep = cursor;

    const isLeaf = node.children.length === 0;
    if (isLeaf) cursor = nodeId;

    for (const child of node.children) {
      processAndThread(child, nodeId);
    }

    const existing = canonicalById.get(nodeId);
    const row: Planner = existing
      ? {
          ...existing,
          title: node.title,
          plannerType: normalizePlannerType(node.plannerType),
          duration: Math.max(1, Math.floor(node.duration)),
          deadline: node.deadline,
          priority: node.priority,
          isReady: node.isReady,
          parentId,
          dependency: nodeDep,
          updatedAt: now,
        }
      : {
          id: nodeId,
          title: node.title,
          parentId,
          plannerType: normalizePlannerType(node.plannerType),
          isReady: node.isReady,
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
          categoryId: inheritCategoryId(parentId),
          createdAt: now,
          updatedAt: now,
        };
    newRows.push(row);
    newRowById.set(nodeId, row);
    return nodeId;
  }

  for (const child of workingTree.children) {
    processAndThread(child, rootId);
  }

  // If the new tree has no children, root itself is the bottom layer, so the
  // outer neighbor's dependency should point at root. Otherwise, cursor now
  // holds the id of the deepest last leaf of the new subtree.
  const newLastLeafId = workingTree.children.length === 0 ? rootId : cursor!;

  // Root row: update the fields the coach may have changed. Preserve
  // dependency, parentId, categoryId, locationId, color — those are part of
  // root's position/identity in the outer tree, not its subtask structure.
  const updatedRoot: Planner = {
    ...rootRow,
    title: workingTree.title,
    duration: Math.max(1, Math.floor(workingTree.duration)),
    deadline: workingTree.deadline,
    priority: workingTree.priority,
    isReady: workingTree.isReady,
    updatedAt: now,
  };

  // Rebuild the planner array: keep everything outside the subtree, patch the
  // outer-chain neighbor if the last leaf changed, then append root + new rows.
  const outsideSubtree: Planner[] = [];
  for (const p of planner) {
    if (p.id === rootId) continue;
    if (oldDescendantIds.has(p.id)) continue;
    if (
      oldLastLeafId !== newLastLeafId &&
      p.dependency === oldLastLeafId
    ) {
      outsideSubtree.push({ ...p, dependency: newLastLeafId, updatedAt: now });
    } else {
      outsideSubtree.push(p);
    }
  }

  return [...outsideSubtree, updatedRoot, ...newRows];
}

function normalizePlannerType(raw: CoachNode["plannerType"]): PlannerType {
  if (raw === "goal") return PlannerType.goal;
  if (raw === "plan") return PlannerType.plan;
  return PlannerType.task;
}
