import { Planner, PlannerType } from "@/types/prisma";

// Completion never applies to plans. The item-detail type picker can retype
// a completed item to plan, leaving stale completion times on the row, so
// completion checks must gate on type rather than the timestamps alone.
export function plannerIsCompleted(item: Planner): boolean {
  if (item.plannerType === PlannerType.plan) return false;
  return !!(item.completedStartTime && item.completedEndTime);
}

export function plannerCompletedEnd(item: Planner): string | null {
  return item.plannerType === PlannerType.plan ? null : item.completedEndTime;
}
