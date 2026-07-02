import type { CoachNode } from "./plannerTreeToJson";

// Partial-JSON parses of a streaming tool input can hand back nodes with
// missing fields — most commonly `children` still undefined because the array
// hasn't started yet. Normalize the tree at the ingestion seam so downstream
// code (renderer, diff, save) can rely on a complete CoachNode shape.
export function normalizeCoachTree(raw: unknown): CoachNode | null {
  if (!raw || typeof raw !== "object") return null;
  const node = raw as Record<string, unknown>;

  const title = typeof node.title === "string" ? node.title : "";
  const plannerType =
    node.plannerType === "task" ||
    node.plannerType === "plan" ||
    node.plannerType === "goal"
      ? node.plannerType
      : "task";
  const duration = typeof node.duration === "number" ? node.duration : 0;
  const priority = typeof node.priority === "number" ? node.priority : 0;
  const id = typeof node.id === "string" ? node.id : "";
  const deadline = typeof node.deadline === "string" ? node.deadline : null;
  const isReady = typeof node.isReady === "boolean" ? node.isReady : null;

  const rawChildren = Array.isArray(node.children) ? node.children : [];
  const children = rawChildren
    .map((child) => normalizeCoachTree(child))
    .filter((child): child is CoachNode => child !== null);

  return {
    id,
    title,
    plannerType,
    duration,
    deadline,
    priority,
    isReady,
    children,
  };
}
