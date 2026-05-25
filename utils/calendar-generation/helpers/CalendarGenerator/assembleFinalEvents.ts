/**
 * Final Event Assembly
 *
 * Assembles all events into final calendar output
 */

import { SimpleEvent, Category } from "@/types/prisma";
import { TravelManager } from "../../core/TravelManager";
import {
  LoggingConfig,
  SchedulingContext,
} from "../../models/SchedulingModels";
import { Slot } from "../../models/TimeSlot";
import {
  buildCategoryWrapperEvents,
  markTrespassingEvents,
  assembleFinalEventList,
} from "../EventAssembler";
import { stampCategoryWrapperBorders } from "../EventAssembler/stampCategoryWrapperBorders";
import { filterEventsByLogRange } from "../../utils/loggingUtils";

export function assembleFinalEvents(
  userId: string,
  travelManager: TravelManager,
  context: SchedulingContext,
  scheduledCategories: Category[],
  startDate: Date,
  endDate: Date,
  plannerLocationMap: Map<string, string | null>,
  slots: Slot[],
  logging?: LoggingConfig,
): SimpleEvent[] {
  const travelEvents = travelManager.generateTravelEvents(userId);

  if (logging?.travelDebug) {
    // Group travel events by date to spot duplicates. Respects the logging
    // date range so noisy days can be filtered out.
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
  }

  const categoryWrapperEvents = buildCategoryWrapperEvents(
    userId,
    scheduledCategories,
    startDate,
    endDate,
  );

  const allEvents = assembleFinalEventList(
    context.scheduledEvents,
    travelEvents,
    categoryWrapperEvents,
  );

  markTrespassingEvents(allEvents, plannerLocationMap);

  // Mark category wrapper events whose travel-pass placement would have
  // consumed the entire wrapper — renders the wrapper's top/bottom red.
  stampCategoryWrapperBorders(allEvents, slots);

  return allEvents;
}
