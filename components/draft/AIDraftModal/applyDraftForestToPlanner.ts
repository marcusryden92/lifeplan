import { v4 as uuidv4 } from "uuid";
import type { Planner } from "@/types/prisma";
import { PlannerType } from "@/generated/client";
import { getTaskTreeIds } from "@/utils/goalPageHandlers";
import { SORT_ORDER_STEP } from "@/utils/goal-handlers/sortOrderKeys";
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
// deleted roots first (a pure subtree filter), then retained goals (only
// those that actually changed, so untouched goals see zero updatedAt churn),
// then new roots. Sibling order is stamped as fractional sortOrder keys from
// array position. Preserves existing planner UUIDs for retained nodes and
// mints fresh ones for new nodes; that invariant is load-bearing for future
// inter-goal dependencies.
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
      const treeIds = new Set(getTaskTreeIds(current, rootId));
      current = current.filter((p) => !treeIds.has(p.id));
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

  return current;
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
// planner UUIDs for retained nodes, mints fresh UUIDs for new ones, and
// stamps sibling sortOrder keys from array position.
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

  // Preorder traversal that mints/reuses ids, builds Planner rows, and stamps
  // sibling sortOrder from array position. The effective category is passed
  // down: a retained node's own category wins, otherwise the inherited one
  // flows on.
  function processNode(
    node: DraftNode,
    parentId: string,
    sortOrder: number,
    inheritedCategoryId: string | null,
  ): void {
    const canRetain = node.id.length > 0 && oldDescendantIds.has(node.id);
    const nodeId = canRetain ? node.id : uuidv4();
    const existing = canonicalById.get(nodeId);
    const effectiveCategoryId = existing?.categoryId ?? inheritedCategoryId;

    node.children.forEach((child, i) => {
      processNode(child, nodeId, (i + 1) * SORT_ORDER_STEP, effectiveCategoryId);
    });

    const row: Planner = existing
      ? {
          ...existing,
          title: node.title,
          plannerType: normalizePlannerType(
            node.plannerType,
            node.children.length > 0,
          ),
          duration: Math.max(1, Math.floor(node.duration)),
          deadline: node.deadline,
          priority: node.priority,
          // Readiness cascades from the root: the subtree is ready or
          // unready as one, matching the manual toggle's semantics.
          isReady: workingTree.isReady,
          parentId,
          sortOrder,
          updatedAt: now,
        }
      : {
          id: nodeId,
          title: node.title,
          parentId,
          plannerType: normalizePlannerType(
            node.plannerType,
            node.children.length > 0,
          ),
          isReady: workingTree.isReady,
          isTriaged: true,
          duration: Math.max(1, Math.floor(node.duration)),
          deadline: node.deadline,
          starts: null,
          sortOrder,
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
  }

  workingTree.children.forEach((child, i) => {
    processNode(child, rootId, (i + 1) * SORT_ORDER_STEP, rootEffectiveCategoryId);
  });

  // Root row: update the fields the assistant may have changed. Preserve
  // sortOrder, parentId, locationId, color — those are part of root's
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

  const outsideSubtree = planner.filter(
    (p) => p.id !== rootId && !oldDescendantIds.has(p.id),
  );

  return [...outsideSubtree, updatedRoot, ...newRows];
}

// Build the rows for a brand-new top-level goal. The root gets top-level
// creation semantics (parentId null, sortOrder 0 — top-level order is
// non-semantic, matching Capture's behavior). Children are stamped with
// sibling sortOrder keys from array position, with the same defaults as new
// nodes inside an existing goal.
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

  // The app's manual gate only allows readying a goal with subtasks and a
  // deadline; hold AI-created goals to the same rule. Readiness cascades
  // from the root: every row in the subtree carries the same value.
  const canBeReady = node.children.length > 0 && node.deadline !== null;
  const rootIsReady = node.isReady === true && canBeReady;

  function build(child: DraftNode, parentId: string, sortOrder: number): void {
    const childId = uuidv4();

    child.children.forEach((grandchild, i) => {
      build(grandchild, childId, (i + 1) * SORT_ORDER_STEP);
    });

    rows.push({
      id: childId,
      title: child.title,
      parentId,
      plannerType: normalizePlannerType(
        child.plannerType,
        child.children.length > 0,
      ),
      isReady: rootIsReady,
      isTriaged: true,
      duration: Math.max(1, Math.floor(child.duration)),
      deadline: child.deadline,
      starts: null,
      sortOrder,
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
    sortOrder: 0,
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

  node.children.forEach((child, i) => {
    build(child, rootId, (i + 1) * SORT_ORDER_STEP);
  });

  return rows;
}

// Structure wins over the model's label: any node that holds children is a
// goal (goals hold subtasks; tasks and plans are leaves). This keeps a nested
// item from persisting as a "task" just because the assistant mislabeled it.
function normalizePlannerType(
  raw: DraftNode["plannerType"],
  hasChildren: boolean,
): PlannerType {
  if (hasChildren) return PlannerType.goal;
  if (raw === "goal") return PlannerType.goal;
  if (raw === "plan") return PlannerType.plan;
  return PlannerType.task;
}

// New top-level rows must never be plans — a plan needs a fixed `starts`,
// which the draft contract doesn't carry. A root with children is a goal; a
// leaf root falls back to task (goal only when explicitly labeled).
function normalizeRootType(
  raw: DraftNode["plannerType"],
  hasChildren: boolean,
): PlannerType {
  if (hasChildren) return PlannerType.goal;
  if (raw === "goal") return PlannerType.goal;
  return PlannerType.task;
}
