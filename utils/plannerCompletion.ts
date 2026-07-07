import { Planner, PlannerType } from "@/types/prisma";
import { parseCompletedSegments, splitIsExhausted } from "./taskSplitting";

// Completion never applies to plans. The item-detail type picker can retype
// a completed item to plan, leaving stale completion times on the row, so
// completion checks must gate on type rather than the timestamps alone.
// Split tasks auto-complete when their completed segments cover the duration.
export function plannerIsCompleted(item: Planner): boolean {
  if (item.plannerType === PlannerType.plan) return false;
  if (item.completedStartTime && item.completedEndTime) return true;
  return splitIsExhausted(item);
}

export function plannerCompletedEnd(item: Planner): string | null {
  if (item.plannerType === PlannerType.plan) return null;
  if (item.completedEndTime) return item.completedEndTime;
  if (!splitIsExhausted(item)) return null;
  const segments = parseCompletedSegments(item.completedSegments);
  if (!segments.length) return null;
  return segments.reduce(
    (latest, s) => (s.end > latest ? s.end : latest),
    segments[0].end,
  );
}
