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
  // Override for the user's location at startDate. When set, takes precedence
  // over the lastEventBeforeRange inference below. expandSlots passes this so
  // a region rebuilt past an isFinal Cat picks up at the Cat's location
  // instead of defaulting to surrounding template locations.
  startingLocationOverride?: string | null;
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
  startingLocationOverride,
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
  // masksToIntervals emits every mask whose day-of-week matches a day in the
  // range, including masks whose end falls before startDate (e.g. the morning
  // Sleep on the pickup day when expansion picks up mid-day). Drop those — they
  // would poison both findGaps (becoming merged[0] and overriding our
  // startingLocation hint) and templateOccupiedSlots emission below (creating
  // duplicates with whatever preserved slots the caller already has).
  const startDateMs = startDate.getTime();
  const templateIntervals = masksToIntervals(
    templateMasks,
    startDate,
    endDate,
  ).filter((i) => i.end.getTime() > startDateMs);
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

  const startingLocation =
    startingLocationOverride !== undefined
      ? startingLocationOverride
      : lastEventBeforeRange
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
        (event.extendedProps?.eventType as
          | Exclude<EventType, "travel">
          | undefined) ?? EventType.planner,
      locationId: plannerLocationMap?.get(event.id) ?? null,
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
      locationId: interval.startLocationId,
    }),
  );

  const allSlots: Slot[] = [
    ...gapSlots,
    ...eventOccupiedSlots,
    ...templateOccupiedSlots,
  ];
  allSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
  propagateAnywhereLocations(allSlots);
  return allSlots;
}

// When an Anywhere Occupied slot (locationId === null) sits between two
// location-specific slots, propagate the surrounding locations through it
// so adjacent Available / Category slots have honest prev/next fields.
// Without this, the walker's outer guards see null and short-circuit,
// dropping necessary travel placements.
//
// Forward pass: fill missing prev with the last known location.
// Backward pass: fill missing next with the next known location.
// Travels in slots[] should not appear yet (they're emitted by the
// staticEventTravelPass that runs later), but the function handles them
// defensively in case the order changes.
function propagateAnywhereLocations(slots: Slot[]): void {
  let lastKnown: string | null = null;
  for (const slot of slots) {
    if (slot.type === "available") {
      if (slot.prevLocationId == null && lastKnown != null) {
        slot.prevLocationId = lastKnown;
      }
      if (slot.nextLocationId != null) lastKnown = slot.nextLocationId;
    } else if (slot.type === "category") {
      if (slot.prevLocationId == null && lastKnown != null) {
        slot.prevLocationId = lastKnown;
      }
      if (slot.currentLocationId != null) lastKnown = slot.currentLocationId;
    } else if (slot.type === "occupied") {
      if (slot.locationId != null) lastKnown = slot.locationId;
    } else if (slot.type === "travel") {
      if (slot.travelToLocationId != null) lastKnown = slot.travelToLocationId;
    }
  }

  lastKnown = null;
  for (let i = slots.length - 1; i >= 0; i--) {
    const slot = slots[i];
    if (slot.type === "available") {
      if (slot.nextLocationId == null && lastKnown != null) {
        slot.nextLocationId = lastKnown;
      }
      if (slot.prevLocationId != null) lastKnown = slot.prevLocationId;
    } else if (slot.type === "category") {
      if (slot.nextLocationId == null && lastKnown != null) {
        slot.nextLocationId = lastKnown;
      }
      if (slot.currentLocationId != null) lastKnown = slot.currentLocationId;
    } else if (slot.type === "occupied") {
      if (slot.locationId != null) lastKnown = slot.locationId;
    } else if (slot.type === "travel") {
      if (slot.travelFromLocationId != null)
        lastKnown = slot.travelFromLocationId;
    }
  }
}
