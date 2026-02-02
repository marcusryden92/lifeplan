/**
 * Final Event Assembly
 *
 * Assembles all events into final calendar output
 */

import { SimpleEvent } from "@/types/prisma";
import { TimeSlotManager } from "../../TimeSlotManager";
import { SchedulingContext } from "../../../models/SchedulingModels";
import { EventAssembler } from "../../../helpers/events/EventAssembler";

interface CategoryPeriod {
  start: Date;
  end: Date;
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  isStrict: boolean;
}

export function assembleFinalEvents(
  userId: string,
  slotManager: TimeSlotManager,
  context: SchedulingContext,
  categoryPeriodsStatic: CategoryPeriod[],
  plannerLocationMap: Map<string, string | null>
): SimpleEvent[] {
  // Generate travel events from stored travel slots
  const travelEvents = slotManager.generateTravelEvents(userId);

  // Generate category wrapper events
  const categoryWrapperEvents = EventAssembler.buildCategoryWrapperEvents(
    userId,
    categoryPeriodsStatic
  );

  // Assemble final event list
  const allEvents = EventAssembler.assembleFinalEvents(
    context.scheduledEvents,
    travelEvents,
    categoryWrapperEvents
  );

  // Mark trespassing events
  EventAssembler.markTrespassingEvents(allEvents, plannerLocationMap);

  return allEvents;
}
