import { Planner, SimpleEvent, EventType, Category } from "@/types/prisma";
import {
  eventsToIntervals,
  findGaps,
  masksToIntervals,
} from "../../utils/intervalUtils";
import { PerTemplateMask } from "../../models/TemplateModels";
import { dateTimeService } from "../../utils/dateTimeService";
import { logInitialSlotContext } from "../../utils/loggingUtils";
import { daysNeededForPlans } from "./daysNeededForPlans";
import { inheritLocationFromCategoryPeriods } from "./inheritLocationFromCategoryPeriods";
import { splitSlotsAtCategoryBoundaries } from "./splitSlotsAtCategoryBoundaries";

interface BuildSlotsOptions {
  planners: Planner[];
  startDate: Date;
  existingEvents: SimpleEvent[];
  templateMasks: PerTemplateMask[];
  categoryConstraints: Category[];
  plannerLocationMap?: Map<string, string | null>;
  enableLogging?: boolean;
  endDateOverride?: Date;
}

export function buildAvailableSlots({
  planners,
  startDate,
  existingEvents,
  templateMasks,
  categoryConstraints,
  plannerLocationMap,
  enableLogging = false,
  endDateOverride,
}: BuildSlotsOptions) {
  if (enableLogging) logInitialSlotContext(existingEvents);

  // How many days (rounded up to whole weeks) until furthest away plan?
  const numDays = daysNeededForPlans(planners, startDate);
  const endDate =
    endDateOverride ?? dateTimeService.shiftDays(startDate, numDays);

  const relevantEvents = existingEvents.filter((event) => {
    if (event.extendedProps?.eventType === EventType.template) return false;
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart < endDate && eventEnd > startDate;
  });

  const eventIntervals = eventsToIntervals(relevantEvents, plannerLocationMap);
  const templateIntervals = masksToIntervals(templateMasks, startDate, endDate);

  const occupiedIntervals = [...eventIntervals, ...templateIntervals];

  // Assign location to locationless intervals that fall within a category period
  // that has a location. Checked day-by-day to avoid global period expansion.
  const adjustedIntervals = inheritLocationFromCategoryPeriods(
    categoryConstraints,
    occupiedIntervals,
  );

  const lastEventBeforeRange = existingEvents
    .filter(
      (e) =>
        e.extendedProps?.eventType !== EventType.template &&
        new Date(e.end) <= startDate,
    )
    .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())[0];

  const startingLocation = lastEventBeforeRange
    ? (plannerLocationMap?.get(lastEventBeforeRange.id) ?? null)
    : null;

  const gaps = findGaps(
    adjustedIntervals,
    startDate,
    endDate,
    startingLocation,
  );

  return splitSlotsAtCategoryBoundaries(categoryConstraints, gaps);
}
