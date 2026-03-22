import { Planner } from "@/types/prisma";

export function weeksNeededForPlans(planners: Planner[], currentDate: Date): number {
  const furthestPlanMs = planners
    .filter((p) => p.itemType === "plan" && p.starts)
    .reduce((max, p) => Math.max(max, new Date(p.starts!).getTime()), currentDate.getTime());
  const days = Math.ceil((furthestPlanMs - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.ceil(days / 7);
}
