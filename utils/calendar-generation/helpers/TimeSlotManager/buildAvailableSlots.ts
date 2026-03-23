import { Planner, SimpleEvent } from "@/types/prisma";
import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlot } from "../../models/TimeSlot";
import { mergeAdjacentSlots } from "../../utils/timeSlotUtils";
import {
  eventsToIntervals,
  findGaps,
  masksToIntervals,
} from "../../utils/intervalUtils";
import { PerTemplateMask } from "../../models/TemplateModels";
import { dateTimeService } from "../../utils/dateTimeService";
import { logInitialSlotContext } from "../../utils/loggingUtils";
import { daysNeededForPlans } from "./daysNeededForPlans";
import { applyCategoriesToNullIntervals } from "./applyCategoriesToNullIntervals";
import { fixPostCategoryPrevLoc } from "./fixPostCategoryPrevLoc";
import { splitSlotsAtCategoryBoundaries } from "./splitSlotsAtCategoryBoundaries";

export function buildAvailableSlots(
  planners: Planner[],
  startDate: Date,
  existingEvents: SimpleEvent[],
  templateMasks: PerTemplateMask[],
  categoryPeriods: CategoryPeriod[],
  plannerLocationMap?: Map<string, string | null>,
  enableLogging?: boolean,
  endDateOverride?: Date,
): TimeSlot[] {
  if (enableLogging) logInitialSlotContext(existingEvents);

  const numDays = daysNeededForPlans(planners, startDate);
  const endDate =
    endDateOverride ?? dateTimeService.shiftDays(startDate, numDays);

  const relevantEvents = existingEvents.filter((event) => {
    if (event.extendedProps?.itemType === "template") return false;

    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    return eventStart < endDate && eventEnd > startDate;
  });

  const eventIntervals = eventsToIntervals(relevantEvents, plannerLocationMap);

  const templateIntervals = masksToIntervals(templateMasks, startDate, endDate);

  const occupiedIntervals = [...eventIntervals, ...templateIntervals];
  const adjustedIntervals = applyCategoriesToNullIntervals(
    categoryPeriods,
    occupiedIntervals,
    startDate,
    endDate,
  );

  const gaps = findGaps(adjustedIntervals, startDate, endDate);
  let slots = gaps;

  if (plannerLocationMap) {
    slots = fixPostCategoryPrevLoc(
      categoryPeriods,
      slots,
      adjustedIntervals,
      startDate,
      endDate,
    );
    slots = splitSlotsAtCategoryBoundaries(
      categoryPeriods,
      slots,
      startDate,
      endDate,
    );
  }

  return mergeAdjacentSlots(slots);
}
