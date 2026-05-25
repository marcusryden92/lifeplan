import { Planner, PlannerType } from "@/types/prisma";
import { URGENCY_CONFIG } from "../../constants";

function calculateTaskUrgency(
  task: Planner,
  context: { currentDate: Date; totalEstimatedTime: number },
): number {
  if (!task.deadline) {
    return task.priority * URGENCY_CONFIG.MIN_URGENCY_MULTIPLIER;
  }

  const deadline = new Date(task.deadline);
  const minutesUntilDeadline =
    (deadline.getTime() - context.currentDate.getTime()) / (1000 * 60);

  let timeRatio = minutesUntilDeadline / context.totalEstimatedTime;
  timeRatio = Math.max(0, Math.min(1, timeRatio));

  const sigmoid =
    1 /
    (1 +
      Math.exp(
        -URGENCY_CONFIG.CURVE_STEEPNESS *
          (timeRatio - URGENCY_CONFIG.CRITICAL_THRESHOLD),
      ));
  const urgencyMultiplier = 1 - sigmoid;

  const scaledUrgency =
    URGENCY_CONFIG.URGENCY_SCALE_MIN +
    (URGENCY_CONFIG.URGENCY_SCALE_MAX - URGENCY_CONFIG.URGENCY_SCALE_MIN) *
      urgencyMultiplier;

  return task.priority * scaledUrgency;
}

function hasCategoryConstraint(
  item: Planner,
  allPlanners: Planner[],
  plannerCategoryMap?: Map<string, string | null>,
): boolean {
  const effectiveCategoryId =
    plannerCategoryMap?.get(item.id) ?? item.categoryId;
  if (effectiveCategoryId !== null) return true;

  if (item.plannerType === PlannerType.goal) {
    return hasChildWithCategoryConstraint(
      item.id,
      allPlanners,
      plannerCategoryMap,
    );
  }

  return false;
}

function hasChildWithCategoryConstraint(
  parentId: string,
  allPlanners: Planner[],
  plannerCategoryMap?: Map<string, string | null>,
): boolean {
  const children = allPlanners.filter((p) => p.parentId === parentId);

  for (const child of children) {
    const effectiveCategoryId =
      plannerCategoryMap?.get(child.id) ?? child.categoryId;
    if (effectiveCategoryId !== null) return true;

    if (
      hasChildWithCategoryConstraint(child.id, allPlanners, plannerCategoryMap)
    ) {
      return true;
    }
  }

  return false;
}

export function sortByPriorityAndConstraints(
  allPlanners: Planner[],
  goalsAndTasks: Planner[],
  currentDate: Date,
  plannerCategoryMap?: Map<string, string | null>,
): Planner[] {
  const totalPlannerTime = allPlanners.reduce((acc, p) => acc + p.duration, 0);

  const withUrgency = goalsAndTasks.map((item) => {
    const itemHasCategoryConstraint = hasCategoryConstraint(
      item,
      allPlanners,
      plannerCategoryMap,
    );

    const urgencyScore = calculateTaskUrgency(item, {
      currentDate,
      totalEstimatedTime: totalPlannerTime,
    });

    return {
      ...item,
      urgencyScore,
      hasCategoryConstraint: itemHasCategoryConstraint,
    };
  });

  return withUrgency.sort((a, b) => {
    if (a.hasCategoryConstraint && !b.hasCategoryConstraint) return -1;
    if (!a.hasCategoryConstraint && b.hasCategoryConstraint) return 1;
    return b.urgencyScore - a.urgencyScore;
  });
}
