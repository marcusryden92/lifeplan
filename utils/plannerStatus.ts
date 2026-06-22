import type { Planner } from "@/types/prisma";
import { startOfDay } from "@/utils/dateUtils";

/**
 * Items needing triage in the capture queue: top-level, not completed, no
 * duration set. Goals enter the queue too — their duration is 0 by default
 * and triage is where the user assigns a deadline + category before opening
 * them up for subtasks.
 */
export function isUnprocessed(item: Planner): boolean {
  if (item.parentId) return false;
  if (item.completedEndTime) return false;
  return !item.duration || item.duration === 0;
}

export function isItemOverdue(item: Planner, now: Date): boolean {
  if (!item.deadline) return false;
  if (item.completedEndTime) return false;
  return new Date(item.deadline) < startOfDay(now);
}
