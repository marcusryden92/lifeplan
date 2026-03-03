/**
 * Initial Slot Builder
 *
 * Builds initial time slots for scheduling
 */

import { SimpleEvent } from "@/types/prisma";
import { TimeSlotManager } from "../../TimeSlotManager";
import { PerTemplateMask } from "../../TemplateExpander";

export function buildInitialSlots(
  slotManager: TimeSlotManager,
  currentDate: Date,
  initialWeeks: number,
  eventArray: SimpleEvent[],
  perTemplateMasks: PerTemplateMask[],
  plannerLocationMap: Map<string, string | null>,
  wrapperPeriods: Array<{ start: Date; end: Date; locationId: string | null }>,
  enableLogging: boolean
): void {
  slotManager.clear();

  // Debug: Check what events are blocking slots
  if (enableLogging) {
    const workHourEvents = eventArray.filter((e) => {
      const start = new Date(e.start);
      const hour = start.getHours();
      return hour >= 9 && hour < 17;
    });

    console.log("Building slots from events:", {
      totalEvents: eventArray.length,
      workHourEvents: workHourEvents.length,
      workHourDetails: workHourEvents.slice(0, 5).map((e) => ({
        title: e.title,
        start: new Date(e.start).toLocaleTimeString(),
        end: new Date(e.end).toLocaleTimeString(),
        type: e.extendedProps?.itemType,
      })),
      eventTypes: eventArray.reduce(
        (acc, e) => {
          const type = e.extendedProps?.itemType || "unknown";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  }

  // Set category periods if they exist
  if (wrapperPeriods.length > 0) {
    if (enableLogging) {
      const uniqueLocations = [...new Set(wrapperPeriods.map((w) => w.locationId))];
      console.log("Category wrapper periods for slot manager:", {
        count: wrapperPeriods.length,
        uniqueLocations,
        firstFew: wrapperPeriods.slice(0, 3).map((w) => ({
          start: w.start.toISOString(),
          end: w.end.toISOString(),
          locationId: w.locationId,
        })),
      });
    }
    slotManager.setCategoryPeriods(wrapperPeriods);
  }

  // Build daily slots
  slotManager.buildDailySlots(
    currentDate,
    initialWeeks * 7,
    eventArray,
    perTemplateMasks,
    plannerLocationMap
  );
}
