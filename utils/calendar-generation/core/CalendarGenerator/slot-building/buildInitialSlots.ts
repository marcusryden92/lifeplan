import { Planner, SimpleEvent } from "@/types/prisma";
import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlotManager } from "../../TimeSlotManager";
import { PerTemplateMask } from "../../TemplateExpander";
import { weeksNeededForPlans } from "@/utils/calendar-generation/helpers/slot-building/SlotBuildingHelpers";
import { logInitialSlotContext } from "../../../utils/loggingUtils";

export function buildInitialSlots(
  slotManager: TimeSlotManager,
  currentDate: Date,
  initialWeeks: number,
  planners: Planner[],
  eventArray: SimpleEvent[],
  perTemplateMasks: PerTemplateMask[],
  plannerLocationMap: Map<string, string | null>,
  wrapperPeriods: CategoryPeriod[],
  enableLogging: boolean
): void {
  slotManager.clear();

  if (enableLogging) {
    logInitialSlotContext(eventArray);
  }

  const weeks = Math.max(initialWeeks, weeksNeededForPlans(planners, currentDate));
  slotManager.buildDailySlots(
    currentDate,
    weeks * 7,
    eventArray,
    perTemplateMasks,
    wrapperPeriods,
    plannerLocationMap
  );
}
