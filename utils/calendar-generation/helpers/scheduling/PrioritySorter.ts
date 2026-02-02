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
    currentDate: Date
  ): Planner[] {
    // Calculate total time estimate
    const totalPlannerTime = allPlanners.reduce(
      (acc, p) => acc + p.duration,
      0
    );

    // Map each item to include urgency score and category constraint flag
    const withUrgency = goalsAndTasks.map((item) => {
      const hasCategoryConstraint = this.hasCategoryConstraint(
        item,
        allPlanners
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

    // Sort by:
    // 1. Category constraint (tasks with constraints first)
    // 2. Urgency score (highest first)
    return withUrgency.sort((a, b) => {
      if (a.hasCategoryConstraint && !b.hasCategoryConstraint) return -1;
      if (!a.hasCategoryConstraint && b.hasCategoryConstraint) return 1;
      return b.urgencyScore - a.urgencyScore;
    });
  }

  /**
   * Check if a planner or any of its children have a category constraint
   */
  private static hasCategoryConstraint(
    item: Planner,
    allPlanners: Planner[]
  ): boolean {
    // Direct category constraint
    if (item.categoryId !== null) return true;

    // For goals, check if any child tasks have category constraints
    if (item.itemType === "goal") {
      return this.hasChildWithCategoryConstraint(item.id, allPlanners);
    }

    return false;
  }

  /**
   * Recursively check if any descendants have a category constraint
   */
  private static hasChildWithCategoryConstraint(
    parentId: string,
    allPlanners: Planner[]
  ): boolean {
    const children = allPlanners.filter((p) => p.parentId === parentId);

    for (const child of children) {
      if (child.categoryId !== null) return true;

      // Recurse into child's descendants
      if (this.hasChildWithCategoryConstraint(child.id, allPlanners)) {
        return true;
      }
    }

    return false;
  }
}
