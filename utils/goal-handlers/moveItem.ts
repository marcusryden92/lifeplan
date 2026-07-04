import { Planner } from "@/types/prisma";

import { getSubtasksById, getTaskTreeIds } from "@/utils/goalPageHandlers";
import {
  insertKeyAt,
  sortSiblings,
} from "@/utils/goal-handlers/sortOrderKeys";

import { ClickedItem } from "@/lib/taskItem";

type UpdatePlannerArray = (
  planner: Planner[] | ((prev: Planner[]) => Planner[]),
) => void;

interface MoveToEdgeProps {
  planner: Planner[];
  updatePlannerArray: UpdatePlannerArray;
  currentlyClickedItem: ClickedItem;
  targetId: string;
  mouseLocationInItem: "top" | "bottom";
}

// Drop on a TaskDivider: the moved subtree becomes a sibling of the target,
// placed just before ("top") or after ("bottom") it. Only the moved root row
// changes, unless the neighboring keys forced a sibling-group reindex.
// Returns true when a move was actually dispatched.
export function moveToEdge({
  planner,
  updatePlannerArray,
  currentlyClickedItem,
  targetId,
  mouseLocationInItem,
}: MoveToEdgeProps): boolean {
  if (!planner || !currentlyClickedItem || !targetId) return false;
  if (targetId === currentlyClickedItem.taskId) return false;

  const movedTask = planner.find((t) => t.id === currentlyClickedItem.taskId);
  const targetTask = planner.find((t) => t.id === targetId);
  if (!movedTask || !targetTask) return false;

  // A subtree can't be moved into itself.
  if (getTaskTreeIds(planner, movedTask.id).includes(targetId)) return false;

  const siblingPool = targetTask.parentId
    ? getSubtasksById(planner, targetTask.parentId)
    : planner.filter((t) => !t.parentId);
  const siblings = sortSiblings(
    siblingPool.filter((t) => t.id !== movedTask.id),
  );
  const targetIndex = siblings.findIndex((t) => t.id === targetId);
  if (targetIndex === -1) return false;

  const insertIndex =
    mouseLocationInItem === "top" ? targetIndex : targetIndex + 1;
  const { key, reindexed } = insertKeyAt(siblings, insertIndex);

  updatePlannerArray(
    applyMove(planner, movedTask.id, targetTask.parentId ?? null, key, reindexed),
  );
  return true;
}

interface MoveToMiddleProps {
  planner: Planner[];
  updatePlannerArray: UpdatePlannerArray;
  currentlyClickedItem: ClickedItem;
  currentlyHoveredItem: string;
}

// Drop into an item: the moved subtree becomes the target's last child —
// matching addSubtask's append, and keeping repeated drag-ins in drag order.
// Returns true when a move was actually dispatched.
export function moveToMiddle({
  planner,
  updatePlannerArray,
  currentlyClickedItem,
  currentlyHoveredItem,
}: MoveToMiddleProps): boolean {
  if (!planner || !currentlyClickedItem || !currentlyHoveredItem) return false;
  if (currentlyClickedItem.taskId === currentlyHoveredItem) return false;

  const movedTask = planner.find((t) => t.id === currentlyClickedItem.taskId);
  const targetTask = planner.find((t) => t.id === currentlyHoveredItem);
  if (!movedTask || !targetTask) return false;

  if (movedTask.parentId === targetTask.id) return false;
  if (getTaskTreeIds(planner, movedTask.id).includes(targetTask.id))
    return false;

  const children = sortSiblings(
    getSubtasksById(planner, targetTask.id).filter(
      (t) => t.id !== movedTask.id,
    ),
  );
  const { key, reindexed } = insertKeyAt(children, children.length);

  updatePlannerArray(
    applyMove(planner, movedTask.id, targetTask.id, key, reindexed),
  );
  return true;
}

function applyMove(
  planner: Planner[],
  movedId: string,
  parentId: string | null,
  key: number,
  reindexed: Map<string, number> | null,
): Planner[] {
  return planner.map((t) => {
    if (t.id === movedId) return { ...t, parentId, sortOrder: key };
    const re = reindexed?.get(t.id);
    return re !== undefined && re !== t.sortOrder ? { ...t, sortOrder: re } : t;
  });
}
