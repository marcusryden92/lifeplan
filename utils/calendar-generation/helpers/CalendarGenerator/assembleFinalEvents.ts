/**
 * Final Event Assembly
 *
 * Assembles all events into final calendar output
 */

import { SimpleEvent } from "@/types/prisma";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { SchedulingContext, CategoryPeriod } from "../../models/SchedulingModels";
import { EventAssembler } from "../../core/EventAssembler";

export function assembleFinalEvents(
  userId: string,
  slotManager: TimeSlotManager,
  context: SchedulingContext,
  categoryPeriodsStatic: CategoryPeriod[],
  plannerLocationMap: Map<string, string | null>
): SimpleEvent[] {
  // Generate travel events from stored travel slots
  const travelEvents = slotManager.generateTravelEvents(userId);

  // Debug: group travel events by date to spot duplicates
  const travelByDate = new Map<string, typeof travelEvents>();
  for (const te of travelEvents) {
    const dateKey = te.start.slice(0, 10);
    if (!travelByDate.has(dateKey)) travelByDate.set(dateKey, []);
    travelByDate.get(dateKey)!.push(te);
  }
  for (const [date, travels] of [...travelByDate.entries()].sort()) {
    console.log(`[travel] ${date}:`);
    for (const t of travels.sort((a, b) => a.start.localeCompare(b.start))) {
      const from = t.extendedProps?.fromLocationId ?? "?";
      const to = t.extendedProps?.toLocationId ?? "?";
      console.log(`  ${t.start.slice(11, 16)}-${t.end.slice(11, 16)} ${from} → ${to}`);
    }
  }

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
