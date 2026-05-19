import {
  Planner,
  SimpleEvent,
  EventType,
  PlannerType,
  Category,
} from "@/types/prisma";
import {
  eventsToIntervals,
  findGaps,
  masksToIntervals,
} from "../../utils/intervalUtils";
import { PerTemplateMask } from "../../models/TemplateModels";
import { OccupiedSlot, Slot } from "../../models/TimeSlot";
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
  categories: Category[];
  plannerLocationMap?: Map<string, string | null>;
  enableLogging?: boolean;
  endDateOverride?: Date;
}

export function buildAvailableSlots({
  planners,
  startDate,
  existingEvents,
  templateMasks,
  categories,
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
    categories,
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

  const gapSlots = splitSlotsAtCategoryBoundaries(categories, gaps);

  // Emit Occupied slots so the dispatcher sees the full slot stream.
  // Without these the walker would treat non-contiguous Category fragments
  // (split by an event) as if they abut, causing bleedAcrossCategoryBoundary
  // to produce a single travel slot that wraps the missing Occupied span.
  const eventOccupiedSlots: OccupiedSlot[] = relevantEvents.map((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return {
      type: "occupied",
      start,
      end,
      durationMinutes: Math.floor((end.getTime() - start.getTime()) / 60000),
      eventId: event.id,
      plannerType:
        (event.extendedProps?.plannerType as PlannerType | undefined) ??
        PlannerType.plan,
      eventType:
        (event.extendedProps?.eventType as Exclude<EventType, "travel"> | undefined) ??
        EventType.planner,
    };
  });

  const templateOccupiedSlots: OccupiedSlot[] = templateIntervals.map(
    (interval, idx) => ({
      type: "occupied",
      start: interval.start,
      end: interval.end,
      durationMinutes: Math.floor(
        (interval.end.getTime() - interval.start.getTime()) / 60000,
      ),
      eventId: `template-${idx}-${interval.start.getTime()}`,
      // Templates aren't planner items, but OccupiedSlot.plannerType is
      // required by the model. The dispatcher doesn't read this field;
      // pick a placeholder.
      plannerType: PlannerType.plan,
      eventType: EventType.template,
    }),
  );

  const allSlots: Slot[] = [
    ...gapSlots,
    ...eventOccupiedSlots,
    ...templateOccupiedSlots,
  ];
  allSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return allSlots;
}
