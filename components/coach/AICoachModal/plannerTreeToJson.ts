import type { Planner } from "@/types/prisma";
import type { PlannerType } from "@/generated/client";
import {
  getSubtasksById,
  sortTasksByDependencies,
} from "@/utils/goalPageHandlers";

// The JSON shape sent to the AI and rendered in the right pane of the coach
// modal. `dependency` is intentionally omitted — sibling order is array order,
// and the linked list is re-threaded from the goal-handlers utilities on save.
export interface CoachNode {
  id: string;
  title: string;
  plannerType: PlannerType;
  duration: number;
  deadline: string | null;
  priority: number;
  isReady: boolean | null;
  children: CoachNode[];
}

export function plannerTreeToJson(
  planner: Planner[],
  rootId: string,
): CoachNode | null {
  const root = planner.find((p) => p.id === rootId);
  if (!root) return null;
  return buildNode(planner, root);
}

function buildNode(planner: Planner[], node: Planner): CoachNode {
  const orderedChildren = sortTasksByDependencies(
    planner,
    getSubtasksById(planner, node.id),
  );
  return {
    id: node.id,
    title: node.title,
    plannerType: node.plannerType,
    duration: node.duration,
    deadline: node.deadline ?? null,
    priority: node.priority,
    isReady: node.isReady ?? null,
    children: orderedChildren.map((child) => buildNode(planner, child)),
  };
}
