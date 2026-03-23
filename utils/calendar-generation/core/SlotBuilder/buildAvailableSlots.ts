import { SimpleEvent } from "@/types/prisma";
import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlot, TimeSlotUtils } from "../../models/TimeSlot";
import { TravelManager } from "../TravelManager";
import {
  eventsToIntervals,
  findGaps,
  masksToIntervals,
  mergeIntervals,
  PerTemplateMask,
} from "../../utils/intervalUtils";
import { applyCategoriesToNullIntervals } from "./applyCategoriesToNullIntervals";
import { fixPostCategoryPrevLoc } from "./fixPostCategoryPrevLoc";
import { splitSlotsAtCategoryBoundaries } from "./splitSlotsAtCategoryBoundaries";
import { carveTravelFromChain } from "./carveTravelFromChain";

export function buildAvailableSlots(
  occupiedSlots: Map<string, TimeSlot[]>,
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  categoryPeriods: CategoryPeriod[],
  startDate: Date,
  endDate: Date,
  existingEvents: SimpleEvent[],
  templateMasks: PerTemplateMask[],
  incomingCategoryPeriods: CategoryPeriod[],
  plannerLocationMap?: Map<string, string | null>,
): TimeSlot[] {
  const activeCategoryPeriods = incomingCategoryPeriods;

  const relevantEvents = existingEvents.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const isTemplate = event.extendedProps?.itemType === "template";
    return !isTemplate && eventStart < endDate && eventEnd > startDate;
  });

  const eventIntervals = eventsToIntervals(
    relevantEvents,
    plannerLocationMap,
  );
  const templateIntervals = masksToIntervals(templateMasks, startDate);
  const occupiedIntervals = [...eventIntervals, ...templateIntervals];

  const adjustedIntervals = applyCategoriesToNullIntervals(
    activeCategoryPeriods,
    occupiedIntervals,
    startDate,
    endDate,
  );

  const gaps = findGaps(adjustedIntervals, startDate, endDate);

  let slots = gaps;

  if (plannerLocationMap) {
    slots = fixPostCategoryPrevLoc(
      activeCategoryPeriods,
      slots,
      adjustedIntervals,
      startDate,
      endDate,
    );
    slots = splitSlotsAtCategoryBoundaries(activeCategoryPeriods, slots, startDate, endDate);
    slots = carveTravelFromChain(
      activeCategoryPeriods,
      occupiedSlots,
      travelManager,
      bufferTimeMinutes,
      slots,
      startDate,
    );
  }

  return TimeSlotUtils.mergeAdjacentSlots(slots);
}
