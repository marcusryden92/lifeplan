/**
 * SlotBuilder
 *
 * Responsible for building available time slots from existing events and templates.
 * Handles gap detection, buffer application, and travel transition processing.
 */

import { SimpleEvent } from "@/types/prisma";
import { TimeSlot, TimeSlotUtils } from "../../../models/TimeSlot";
import { TravelManager } from "../travel/TravelManager";
import {
  eventsToIntervals,
  findGaps,
  gapsToTimeSlots,
  masksToIntervals,
  PerTemplateMask,
} from "../../../utils/intervalUtils";
import { dateTimeService } from "../../../utils/dateTimeService";
import { WeekDayIntegers } from "@/types/calendarTypes";

export class SlotBuilder {
  private categoryPeriods: Array<{
    start: Date;
    end: Date;
    locationId: string | null;
  }> = [];

  constructor(
    private availableSlots: Map<string, TimeSlot[]>,
    private occupiedSlots: Map<string, TimeSlot[]>,
    private travelManager: TravelManager,
    private getDayKeyFn: (date: Date) => string,
    private weekStartDay: WeekDayIntegers,
    private bufferTimeMinutes: number,
  ) {}

  setCategoryPeriods(
    periods: Array<{ start: Date; end: Date; locationId: string | null }>,
  ): void {
    this.categoryPeriods = periods;
  }

  /**
   * Build available time slots for a date range
   * @param templateMasks - Template masks for determining occupied time (no SimpleEvent generation needed)
   * @param plannerLocationMap - Optional map of planner ID to location ID for tracking slot neighbors
   */
  buildAvailableSlots(
    startDate: Date, // Comment: Why start and end date when this function
    // is only used to calculate slots for one day?
    endDate: Date,
    existingEvents: SimpleEvent[],
    templateMasks: PerTemplateMask[],
    plannerLocationMap?: Map<string, string | null>,
  ): TimeSlot[] {
    // Filter existing events to only those that overlap with this date range
    // Exclude template events since we create intervals from masks instead
    const relevantEvents = existingEvents.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const isTemplate = event.extendedProps?.itemType === "template";
      // Event overlaps if it starts before range ends AND ends after range starts
      return !isTemplate && eventStart < endDate && eventEnd > startDate;
    });

    // Convert existing events to intervals with location info
    const eventIntervals = eventsToIntervals(
      relevantEvents,
      plannerLocationMap,
    );

    // Convert template masks directly to intervals for this date
    // Templates are handled via masks to avoid duplication
    const templateIntervals = masksToIntervals(templateMasks, startDate);

    // Combine all occupied intervals
    const occupiedIntervals = [...eventIntervals, ...templateIntervals];

    // Find gaps between occupied intervals (gaps now have prevLocationId/nextLocationId)
    const gaps = findGaps(occupiedIntervals, startDate, endDate);

    // Convert gaps to available time slots (location info is preserved)
    let slots = gapsToTimeSlots(gaps);

    // Apply leading buffer to slots that follow templates/fixed events
    // This ensures scheduled tasks don't start immediately after templates.
    // NOTE: This is NOT double-buffering - it handles different scenarios:
    // - Leading buffer: Applied once during initial slot building (after templates)
    // - Trailing buffer: Applied when scheduling tasks (via reserveSlotWithTravel)
    // When a task is scheduled, the slot is split and the "after" slot starts
    // at taskEnd + buffer, so subsequent tasks get proper spacing automatically.
    // We identify "start of range" slots by comparing slot.start to startDate
    if (this.bufferTimeMinutes > 0) {
      const rangeStartTime = startDate.getTime();
      slots = slots
        .map((slot) => {
          // Only apply leading buffer if this slot doesn't start at the range beginning
          // (meaning there's a preceding event/template before this slot)
          const isStartOfRange = slot.start.getTime() === rangeStartTime;
          if (!isStartOfRange) {
            const newStart = new Date(
              slot.start.getTime() + this.bufferTimeMinutes * 60000,
            );
            const newDuration = Math.floor(
              (slot.end.getTime() - newStart.getTime()) / 60000,
            );
            // Only shrink if there's still usable time left
            if (newDuration > 0) {
              return {
                ...slot,
                start: newStart,
                durationMinutes: newDuration,
              };
            }
          }
          return slot;
        })
        .filter((slot) => slot.durationMinutes > 0);
    }

    // Single-pass travel injection:
    // 1. Split slots at category boundaries to embed location transitions in the chain
    // 2. Walk the chain and carve travel where prevLocationId != nextLocationId
    // 3. Merge adjacent available slots back for the scheduler
    if (plannerLocationMap) {
      slots = this.splitSlotsAtCategoryBoundaries(slots, startDate, endDate);
      slots = this.carveTravelFromChain(slots, startDate);
    }

    return TimeSlotUtils.mergeAdjacentSlots(slots);
  }

  /**
   * Split available slots at category boundaries so that category location
   * transitions are visible in the prevLocationId/nextLocationId chain.
   *
   * At each boundary (start or end of a category period), if an available slot
   * spans that boundary, it is split into two slots:
   * - Before portion: nextLocationId = categoryLocationId
   * - After portion: prevLocationId = categoryLocationId
   */
  private splitSlotsAtCategoryBoundaries(
    slots: TimeSlot[],
    dayStart: Date,
    dayEnd: Date,
  ): TimeSlot[] {
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayEnd.getTime();

    const dayPeriods = this.categoryPeriods.filter(
      (p) =>
        p.start.getTime() < dayEndMs &&
        p.end.getTime() > dayStartMs &&
        p.locationId !== null,
    );

    if (dayPeriods.length === 0) return slots;

    let result = slots;

    for (const period of dayPeriods) {
      const catLoc = period.locationId!;
      // DEBUG: Log category boundary splits
      console.log("CATEGORY SPLIT:", {
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
        catLoc,
      });
      const boundaries = [period.start, period.end].filter(
        (b) => b.getTime() > dayStartMs && b.getTime() < dayEndMs,
      );

      for (const boundary of boundaries) {
        const boundaryMs = boundary.getTime();
        const newResult: TimeSlot[] = [];

        for (const slot of result) {
          if (!slot.isAvailable) {
            newResult.push(slot);
            continue;
          }

          const slotStartMs = slot.start.getTime();
          const slotEndMs = slot.end.getTime();

          if (boundaryMs > slotStartMs && boundaryMs < slotEndMs) {
            const beforeDuration = Math.floor(
              (boundaryMs - slotStartMs) / 60000,
            );
            const afterDuration = Math.floor(
              (slotEndMs - boundaryMs) / 60000,
            );

            if (beforeDuration > 0) {
              newResult.push({
                start: slot.start,
                end: new Date(boundaryMs),
                durationMinutes: beforeDuration,
                isAvailable: true,
                prevLocationId: slot.prevLocationId,
                nextLocationId: catLoc,
              });
            }

            if (afterDuration > 0) {
              newResult.push({
                start: new Date(boundaryMs),
                end: slot.end,
                durationMinutes: afterDuration,
                isAvailable: true,
                prevLocationId: catLoc,
                nextLocationId: slot.nextLocationId,
              });
            }
          } else {
            newResult.push(slot);
          }
        }

        result = newResult;
      }
    }

    return result;
  }

  /**
   * Walk the slot chain and carve travel slots where prevLocationId != nextLocationId.
   * Travel is placed at the END of the available slot (right before the next event/boundary).
   * Returns only the remaining available slots; travel slots go to occupiedSlots.
   */
  private carveTravelFromChain(
    slots: TimeSlot[],
    dayStart: Date,
  ): TimeSlot[] {
    const dayKey = this.getDayKeyFn(dayStart);
    const occupiedSlots = this.occupiedSlots.get(dayKey) || [];
    const result: TimeSlot[] = [];

    for (const slot of slots) {
      if (!slot.isAvailable) {
        result.push(slot);
        continue;
      }

      const prevLoc = slot.prevLocationId;
      const nextLoc = slot.nextLocationId;

      if (!prevLoc || !nextLoc || prevLoc === nextLoc) {
        result.push(slot);
        continue;
      }

      // DEBUG: Log travel-triggering slots
      console.log("CARVE TRAVEL:", {
        slotStart: slot.start.toISOString(),
        slotEnd: slot.end.toISOString(),
        prevLoc,
        nextLoc,
        duration: slot.durationMinutes,
      });

      const travelMinutes = this.travelManager.getTravelTime(
        prevLoc,
        nextLoc,
        slot.end,
      );

      if (travelMinutes <= 0) {
        result.push(slot);
        continue;
      }

      if (slot.durationMinutes <= 0) {
        result.push(slot);
        continue;
      }

      const travelMs = travelMinutes * 60000;
      const bufferMs = this.bufferTimeMinutes * 60000;
      const travelEnd = new Date(slot.end.getTime());
      const travelStart = new Date(travelEnd.getTime() - travelMs);

      if (travelStart.getTime() >= slot.start.getTime()) {
        // Normal: enough room for full travel
        const travelSlot = TimeSlotUtils.createTravelSlot(
          travelStart,
          travelEnd,
          prevLoc,
          nextLoc,
          `travel-gap-${slot.start.getTime()}`,
        );
        occupiedSlots.push(travelSlot);

        const availableEndMs = Math.max(
          slot.start.getTime(),
          travelStart.getTime() - bufferMs,
        );

        if (availableEndMs > slot.start.getTime()) {
          result.push({
            start: slot.start,
            end: new Date(availableEndMs),
            durationMinutes: Math.floor(
              (availableEndMs - slot.start.getTime()) / 60000,
            ),
            isAvailable: true,
            prevLocationId: slot.prevLocationId,
            nextLocationId: prevLoc,
          });
        }
      } else {
        // Insufficient: not enough room for full travel, fill entire slot
        const travelSlot = TimeSlotUtils.createTravelSlot(
          slot.start,
          slot.end,
          prevLoc,
          nextLoc,
          `travel-insufficient-${slot.start.getTime()}`,
          {
            insufficientTravel: true,
            requiredTravelMinutes: travelMinutes,
          },
        );
        occupiedSlots.push(travelSlot);
      }
    }

    this.occupiedSlots.set(dayKey, occupiedSlots);
    return result;
  }

  /**
   * Build slots for multiple days at once
   * @param plannerLocationMap - Optional map of planner ID to location ID for tracking slot neighbors
   */
  buildDailySlots(
    startDate: Date,
    numDays: number,
    existingEvents: SimpleEvent[],
    templateMasks: PerTemplateMask[],
    plannerLocationMap?: Map<string, string | null>,
  ): Map<string, TimeSlot[]> {
    const dailySlots = new Map<string, TimeSlot[]>();

    for (let i = 0; i < numDays; i++) {
      const date = dateTimeService.shiftDays(startDate, i);
      const dayKey = this.getDayKeyFn(date);
      const dayStart = dateTimeService.startOfDay(date);
      const dayEnd = dateTimeService.endOfDay(date);

      const daySlots = this.buildAvailableSlots(
        dayStart,
        dayEnd,
        existingEvents,
        templateMasks,
        plannerLocationMap,
      );

      dailySlots.set(dayKey, daySlots);
      this.availableSlots.set(dayKey, daySlots);
    }

    return dailySlots;
  }
}
