import { Planner, SimpleEvent, EventType } from "@/types/prisma";
import { CategoryPeriod } from "@/types/categoryTypes";
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
import { splitSlotsAtCategoryBoundaries } from "./splitSlotsAtCategoryBoundaries";

interface BuildSlotsOptions {
  planners: Planner[];
  startDate: Date;
  existingEvents: SimpleEvent[];
  templateMasks: PerTemplateMask[];
  categoryPeriods: CategoryPeriod[];
  plannerLocationMap?: Map<string, string | null>;
  enableLogging?: boolean;
  endDateOverride?: Date;
}

export function buildAvailableSlots({
  planners,
  startDate,
  existingEvents,
  templateMasks,
  categoryPeriods,
  plannerLocationMap,
  enableLogging = false,
  endDateOverride,
}: BuildSlotsOptions) {
  if (enableLogging) logInitialSlotContext(existingEvents);

  // Determine end date
  const numDays = daysNeededForPlans(planners, startDate);
  const endDate =
    endDateOverride ?? dateTimeService.shiftDays(startDate, numDays);

  // Filter out template events and events outside the date range
  const relevantEvents = existingEvents.filter((event) => {
    if (event.extendedProps?.eventType === EventType.template) return false;
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart < endDate && eventEnd > startDate;
  });

  // Convert events and template masks into intervals
  const eventIntervals = eventsToIntervals(relevantEvents, plannerLocationMap);
  const templateIntervals = masksToIntervals(templateMasks, startDate, endDate);

  const occupiedIntervals = [...eventIntervals, ...templateIntervals];

  // Apply category periods to intervals that have null categories
  const adjustedIntervals = applyCategoriesToNullIntervals(
    categoryPeriods,
    occupiedIntervals,
    startDate,
    endDate,
  );

  // Determine last known location before start date
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

  // Find gaps between occupied intervals
  const gaps = findGaps(
    adjustedIntervals,
    startDate,
    endDate,
    startingLocation,
  );

  // Split gaps by category boundaries
  return splitSlotsAtCategoryBoundaries(
    categoryPeriods,
    gaps,
    startDate,
    endDate,
  );
}
