/**
 * Category Travel Injector
 *
 * Injects travel time for category boundaries
 */

import { SimpleEvent } from "@/types/prisma";
import { TimeSlotManager } from "../../TimeSlotManager";
import { CategoryConstraint } from "../../../models/SchedulingModels";
import { CategoryTravelManager } from "../../../helpers/category/CategoryTravelManager";

interface CategoryPeriod {
  start: Date;
  end: Date;
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  isStrict: boolean;
}

export function injectCategoryTravel(
  slotManager: TimeSlotManager,
  categoryPeriodsStatic: CategoryPeriod[],
  categoryConstraintMap: Map<string, CategoryConstraint>,
  eventArray: SimpleEvent[],
  plannerLocationMap: Map<string, string | null>
): void {
  if (categoryPeriodsStatic.length === 0) return;

  const categoryTravelManager = new CategoryTravelManager(
    slotManager,
    plannerLocationMap
  );

  categoryTravelManager.injectCategoryTravel(
    categoryPeriodsStatic,
    categoryConstraintMap,
    eventArray
  );
}
