/**
 * Final Event Assembly
 *
 * Assembles all events into final calendar output
 */

import { SimpleEvent } from "@/types/prisma";
import type { CategoryConstraint } from "@/types/categoryTypes";
import { TravelManager } from "../../core/TravelManager";
import {
  LoggingConfig,
  SchedulingContext,
} from "../../models/SchedulingModels";
import { EventAssembler } from "../../core/EventAssembler";
import { CategoryBoundaryTrespass } from "../TravelManager/categoryBoundaryTrespass";
import { markCategoryBoundaryTrespasses } from "../EventAssembler/markCategoryBoundaryTrespasses";
import { filterEventsByLogRange } from "../../utils/loggingUtils";

export function assembleFinalEvents(
  userId: string,
  travelManager: TravelManager,
  context: SchedulingContext,
  categoryConstraintsList: CategoryConstraint[],
  startDate: Date,
  endDate: Date,
  plannerLocationMap: Map<string, string | null>,
  categoryBoundaryTrespasses: CategoryBoundaryTrespass[] = [],
  logging?: LoggingConfig,
): SimpleEvent[] {
  // Generate travel events from stored travel slots
  const travelEvents = travelManager.generateTravelEvents(userId);

  // Debug: group travel events by date to spot duplicates. Respects the
  // logging date range so noisy days can be filtered out.
  const travelEventsForLog = filterEventsByLogRange(travelEvents, logging);
  const travelByDate = new Map<string, typeof travelEventsForLog>();
  for (const te of travelEventsForLog) {
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
    categoryConstraintsList,
    startDate,
    endDate,
  );

  // Assemble final event list
  const allEvents = EventAssembler.assembleFinalEvents(
    context.scheduledEvents,
    travelEvents,
    categoryWrapperEvents
  );

  // Mark trespassing events (overlapping items with different locations)
  EventAssembler.markTrespassingEvents(allEvents, plannerLocationMap);

  // Mark category wrapper events whose travel-pass placement would have
  // consumed the entire wrapper — renders the wrapper's top/bottom red.
  markCategoryBoundaryTrespasses(allEvents, categoryBoundaryTrespasses);

  return allEvents;
}
