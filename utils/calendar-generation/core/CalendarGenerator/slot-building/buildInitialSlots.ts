/**
 * Initial Slot Builder
 *
 * Builds initial time slots for scheduling
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { TimeSlotManager } from "../../TimeSlotManager";
import { PerTemplateMask } from "../../TemplateExpander";

function weeksNeededForPlans(planners: Planner[], currentDate: Date): number {
  const furthestPlanMs = planners
    .filter((p) => p.itemType === "plan" && p.starts)
    .reduce((max, p) => Math.max(max, new Date(p.starts!).getTime()), currentDate.getTime());
  const days = Math.ceil((furthestPlanMs - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.ceil(days / 7);
}

export function buildInitialSlots(
  slotManager: TimeSlotManager,
  currentDate: Date,
  initialWeeks: number,
  planners: Planner[],
  eventArray: SimpleEvent[],
  perTemplateMasks: PerTemplateMask[],
  plannerLocationMap: Map<string, string | null>,
  wrapperPeriods: Array<{ start: Date; end: Date; locationId: string | null; categoryId: string; categoryName?: string; categoryColor?: string | null; isStrict: boolean }>,
  enableLogging: boolean
): void {
  slotManager.clear();

  // Debug: Check what events are blocking slots
  if (enableLogging) {
    const workHourEvents = eventArray.filter((e) => {
      const start = new Date(e.start);
      const hour = start.getHours();
      return hour >= 9 && hour < 17;
    });

    console.log("Building slots from events:", {
      totalEvents: eventArray.length,
      workHourEvents: workHourEvents.length,
      workHourDetails: workHourEvents.slice(0, 5).map((e) => ({
        title: e.title,
        start: new Date(e.start).toLocaleTimeString(),
        end: new Date(e.end).toLocaleTimeString(),
        type: e.extendedProps?.itemType,
      })),
      eventTypes: eventArray.reduce(
        (acc, e) => {
          const type = e.extendedProps?.itemType || "unknown";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  }

  // Set category periods if they exist
  if (wrapperPeriods.length > 0) {
    slotManager.setCategoryPeriods(wrapperPeriods);
  }

  // Build daily slots
  const weeks = Math.max(initialWeeks, weeksNeededForPlans(planners, currentDate));
  slotManager.buildDailySlots(
    currentDate,
    weeks * 7,
    eventArray,
    perTemplateMasks,
    plannerLocationMap
  );
}
