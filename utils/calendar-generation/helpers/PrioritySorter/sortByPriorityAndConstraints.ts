import { Planner, ItemType } from "@/types/prisma";
import { calculateTaskUrgency } from "./calculateTaskUrgency";

function hasCategoryConstraint(
  item: Planner,
  allPlanners: Planner[],
  plannerCategoryMap?: Map<string, string | null>
): boolean {
  const effectiveCategoryId =
    plannerCategoryMap?.get(item.id) ?? item.categoryId;
  if (effectiveCategoryId !== null) return true;

  if (item.itemType === ItemType.goal) {
    return hasChildWithCategoryConstraint(item.id, allPlanners, plannerCategoryMap);
  }

  return false;
}

function hasChildWithCategoryConstraint(
  parentId: string,
  allPlanners: Planner[],
  plannerCategoryMap?: Map<string, string | null>
): boolean {
  const children = allPlanners.filter((p) => p.parentId === parentId);

  for (const child of children) {
    const effectiveCategoryId =
      plannerCategoryMap?.get(child.id) ?? child.categoryId;
    if (effectiveCategoryId !== null) return true;

    if (hasChildWithCategoryConstraint(child.id, allPlanners, plannerCategoryMap)) {
      return true;
    }
  }

  return false;
}

export function sortByPriorityAndConstraints(
  allPlanners: Planner[],
  goalsAndTasks: Planner[],
  currentDate: Date,
  plannerCategoryMap?: Map<string, string | null>
): Planner[] {
  const totalPlannerTime = allPlanners.reduce(
    (acc, p) => acc + p.duration,
    0
  );

  const withUrgency = goalsAndTasks.map((item) => {
    const itemHasCategoryConstraint = hasCategoryConstraint(
      item,
      allPlanners,
      plannerCategoryMap
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
