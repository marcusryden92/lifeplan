import type { Planner } from "@/types/prisma";
import type { PlannerType } from "@/generated/client";
import { getSubtasksById } from "@/utils/goalPageHandlers";
import { sortSiblings } from "@/utils/goal-handlers/sortOrderKeys";

// The JSON shape sent to the AI and rendered in the right pane of the draft
// modal. `sortOrder` is intentionally omitted — sibling order is array order,
// and fractional keys are stamped from array position on save.
// `categoryId` is meaningful on top-level goal roots only; children inherit
// via the existing category-inheritance logic and always carry null here.
export interface DraftNode {
  id: string;
  title: string;
  plannerType: PlannerType;
  duration: number;
  deadline: string | null;
  priority: number;
  isReady: boolean | null;
  categoryId: string | null;
  children: DraftNode[];
}

export function plannerTreeToJson(
  planner: Planner[],
  rootId: string,
): DraftNode | null {
  const root = planner.find((p) => p.id === rootId);
  if (!root) return null;
  const node = buildDraftNode(planner, root);
  return { ...node, categoryId: root.categoryId ?? null };
}

export function buildDraftNode(planner: Planner[], node: Planner): DraftNode {
  const orderedChildren = sortSiblings(getSubtasksById(planner, node.id));
  return {
    id: node.id,
    title: node.title,
    plannerType: node.plannerType,
    duration: node.duration,
    deadline: node.deadline ?? null,
    priority: node.priority,
    isReady: node.isReady ?? null,
    categoryId: null,
    children: orderedChildren.map((child) => buildDraftNode(planner, child)),
  };
}
