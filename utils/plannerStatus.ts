import type { Planner } from "@/types/prisma";
import { startOfDay } from "@/utils/dateUtils";

/**
 * Items needing triage in the capture queue: top-level, not completed, not
 * yet triaged. `isTriaged` is the explicit signal set by Capture on save,
 * which works uniformly across task/plan/goal regardless of duration.
 */
export function isUnprocessed(item: Planner): boolean {
  if (item.parentId) return false;
  if (item.completedEndTime) return false;
  return !item.isTriaged;
}

export function isItemOverdue(item: Planner, now: Date): boolean {
  if (!item.deadline) return false;
  if (item.completedEndTime) return false;
  return new Date(item.deadline) < startOfDay(now);
}
