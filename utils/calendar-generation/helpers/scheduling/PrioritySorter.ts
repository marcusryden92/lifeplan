/**
 * PrioritySorter
 *
 * Handles task/goal priority sorting with urgency calculations.
 * Consolidates logic from both sortPlannersByPriority and CalendarGenerator.
 */

import { Planner } from "@/types/prisma";
import { calculateTaskUrgency } from "../../calendar-logic-helpers/sortPlannersByPriority";

export class PrioritySorter {
  /**
   * Sort tasks and goals by priority with category constraint precedence
   * Tasks with category constraints are prioritized, then sorted by urgency
   */
  static sortByPriorityAndConstraints(
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
      const hasCategoryConstraint = this.hasCategoryConstraint(
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
        hasCategoryConstraint,
      };
    });

    return withUrgency.sort((a, b) => {
      if (a.hasCategoryConstraint && !b.hasCategoryConstraint) return -1;
      if (!a.hasCategoryConstraint && b.hasCategoryConstraint) return 1;
      return b.urgencyScore - a.urgencyScore;
    });
  }

  /**
   * Check if a planner or any of its descendants have an effective category constraint
   */
  private static hasCategoryConstraint(
    item: Planner,
    allPlanners: Planner[],
    plannerCategoryMap?: Map<string, string | null>
  ): boolean {
    const effectiveCategoryId =
      plannerCategoryMap?.get(item.id) ?? item.categoryId;
    if (effectiveCategoryId !== null) return true;

    if (item.itemType === "goal") {
      return this.hasChildWithCategoryConstraint(
        item.id,
        allPlanners,
        plannerCategoryMap
      );
    }

    return false;
  }

  private static hasChildWithCategoryConstraint(
    parentId: string,
    allPlanners: Planner[],
    plannerCategoryMap?: Map<string, string | null>
  ): boolean {
    const children = allPlanners.filter((p) => p.parentId === parentId);

    for (const child of children) {
      const effectiveCategoryId =
        plannerCategoryMap?.get(child.id) ?? child.categoryId;
      if (effectiveCategoryId !== null) return true;

      if (
        this.hasChildWithCategoryConstraint(
          child.id,
          allPlanners,
          plannerCategoryMap
        )
      ) {
        return true;
      }
    }

    return false;
  }
}
