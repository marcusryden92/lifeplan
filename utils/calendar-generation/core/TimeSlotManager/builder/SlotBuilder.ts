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
    categoryId: string;
    isStrict: boolean;
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
    periods: Array<{ start: Date; end: Date; locationId: string | null; categoryId: string; isStrict: boolean }>,
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
   * Split available slots at category boundaries so that:
   * 1. Category location transitions are visible in the prevLocationId/nextLocationId chain
   * 2. Each slot fragment is tagged with the categoryId it falls within
   *
   * For each period boundary, we distinguish entering (period start) vs exiting (period end):
   * - Entering: before-fragment is outside, after-fragment is inside
   * - Exiting:  before-fragment is inside, after-fragment is outside
   *
   * After boundary splits, a second pass tags any slots that were entirely inside
   * a category period and never hit a boundary.
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
        p.end.getTime() > dayStartMs,
    );

    if (dayPeriods.length === 0) return slots;

    let result = slots;

    for (const period of dayPeriods) {
      const catLoc = period.locationId;
      const boundaries: Array<{ time: Date; entering: boolean }> = [];

      if (period.start.getTime() > dayStartMs && period.start.getTime() < dayEndMs) {
        boundaries.push({ time: period.start, entering: true });
      }
      if (period.end.getTime() > dayStartMs && period.end.getTime() < dayEndMs) {
        boundaries.push({ time: period.end, entering: false });
      }

      for (const { time: boundary, entering } of boundaries) {
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
            const beforeDuration = Math.floor((boundaryMs - slotStartMs) / 60000);
            const afterDuration = Math.floor((slotEndMs - boundaryMs) / 60000);

            // Before-fragment is inside the period only when exiting (at period end)
            if (beforeDuration > 0) {
              const isInside = !entering;
              newResult.push({
                start: slot.start,
                end: new Date(boundaryMs),
                durationMinutes: beforeDuration,
                isAvailable: true,
                prevLocationId: slot.prevLocationId,
                nextLocationId: catLoc !== null ? catLoc : slot.nextLocationId,
                categoryId: isInside ? period.categoryId : null,
                isStrictCategory: isInside ? period.isStrict : false,
              });
            }

            // After-fragment is inside the period only when entering (at period start)
            if (afterDuration > 0) {
              const isInside = entering;
              newResult.push({
                start: new Date(boundaryMs),
                end: slot.end,
                durationMinutes: afterDuration,
                isAvailable: true,
                prevLocationId: catLoc !== null ? catLoc : slot.prevLocationId,
                nextLocationId: slot.nextLocationId,
                categoryId: isInside ? period.categoryId : null,
                isStrictCategory: isInside ? period.isStrict : false,
              });
            }
          } else {
            newResult.push(slot);
          }
        }

        result = newResult;
      }
    }

    // Second pass: tag slots that were entirely inside a category period and never
    // hit a boundary (categoryId is still undefined on them).
    result = result.map((slot) => {
      if (!slot.isAvailable || slot.categoryId !== undefined) return slot;

      const slotMidMs = (slot.start.getTime() + slot.end.getTime()) / 2;
      for (const period of dayPeriods) {
        if (slotMidMs >= period.start.getTime() && slotMidMs < period.end.getTime()) {
          return {
            ...slot,
            categoryId: period.categoryId,
            isStrictCategory: period.isStrict,
          };
        }
      }

      return { ...slot, categoryId: null, isStrictCategory: false };
    });

    return result;
  }

  /**
   * Walk the slot chain and carve travel slots where prevLocationId != nextLocationId.
   *
   * Direction of travel placement:
   * - "Going to" a foreign event: travel at END of slot (depart as late as possible).
   * - "Returning from" a foreign event inside a category window: travel at START of slot
   *   (return to the category's home location immediately, so subsequent tasks are
   *   back in the home-location context rather than in the foreign-location transition zone).
   *
   * Returns only the remaining available slots; travel slots go to occupiedSlots.
   */
  private carveTravelFromChain(
    slots: TimeSlot[],
    dayStart: Date,
  ): TimeSlot[] {
    const dayKey = this.getDayKeyFn(dayStart);
    // Remove any previously carved gap-travel for this day so rebuilding a day
    // doesn't accumulate duplicate entries in occupiedSlots.
    const occupiedSlots = (this.occupiedSlots.get(dayKey) || []).filter(
      (s) =>
        !s.eventId?.startsWith("travel-gap-") &&
        !s.eventId?.startsWith("travel-insufficient-"),
    );
    const result: TimeSlot[] = [];

    // The location where the day starts (before the first event) — used to identify
    // "returning home" transitions in non-category slots.
    const dayHomeLoc = slots.find((s) => s.isAvailable)?.prevLocationId ?? null;

    let skipNextSlot = false;
    for (let i = 0; i < slots.length; i++) {
      if (skipNextSlot) { skipNextSlot = false; continue; }
      const slot = slots[i];
      const bufferMs = this.bufferTimeMinutes * 60000;

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

      if (slot.durationMinutes <= 0) {
        result.push(slot);
        continue;
      }

      const placeAtStart = this.shouldPlaceTravelAtStart(slot, prevLoc, nextLoc, dayHomeLoc);
      const travelDepartureTime = placeAtStart ? slot.start : slot.end;

      const travelMinutes = this.travelManager.getTravelTime(
        prevLoc,
        nextLoc,
        travelDepartureTime,
      );

      if (travelMinutes <= 0) {
        result.push(slot);
        continue;
      }

      const travelMs = travelMinutes * 60000;

      // Detect "A → cat → B" double-travel chains where combined travel exceeds the gap.
      // When Plan A returns to category and the category slot immediately goes to Plan B,
      // replace both hops with a single direct A→B travel if the two-hop route doesn't fit.
      if (!placeAtStart && !slot.categoryId) {
        const nextSlot = i + 1 < slots.length ? slots[i + 1] : null;
        if (
          nextSlot?.isAvailable &&
          nextSlot.categoryId &&
          nextSlot.start.getTime() === slot.end.getTime() &&
          nextSlot.nextLocationId &&
          nextSlot.nextLocationId !== nextLoc
        ) {
          const bLoc = nextSlot.nextLocationId;
          const travelCatToB = this.travelManager.getTravelTime(nextLoc, bLoc, nextSlot.end);
          if (travelCatToB > 0) {
            const availableMinutes = slot.durationMinutes + nextSlot.durationMinutes;
            const combinedMinutes = travelMinutes + this.bufferTimeMinutes + travelCatToB;
            if (combinedMinutes > availableMinutes) {
              const directMinutes = this.travelManager.getTravelTime(prevLoc, bLoc, slot.start);
              const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);
              const spanEnd = nextSlot.end;
              if (travelEnd.getTime() <= spanEnd.getTime()) {
                occupiedSlots.push(TimeSlotUtils.createTravelSlot(
                  slot.start, travelEnd, prevLoc, bLoc,
                  `travel-gap-${slot.start.getTime()}`,
                ));
                const newCatStart = new Date(travelEnd.getTime() + bufferMs);
                if (newCatStart.getTime() < spanEnd.getTime()) {
                  slots[i + 1] = {
                    ...nextSlot,
                    start: newCatStart,
                    durationMinutes: Math.floor((spanEnd.getTime() - newCatStart.getTime()) / 60000),
                    prevLocationId: bLoc,
                  };
                } else {
                  skipNextSlot = true;
                }
              } else {
                occupiedSlots.push(TimeSlotUtils.createTravelSlot(
                  slot.start, spanEnd, prevLoc, bLoc,
                  `travel-insufficient-${slot.start.getTime()}`,
                  { insufficientTravel: true, requiredTravelMinutes: directMinutes },
                ));
                skipNextSlot = true;
              }
              continue;
            }
          }
        }
      }

      if (placeAtStart) {
        // Travel at START: immediately after preceding fixed event
        const travelStart = new Date(slot.start.getTime());
        const travelEnd = new Date(travelStart.getTime() + travelMs);

        if (travelEnd.getTime() <= slot.end.getTime()) {
          occupiedSlots.push(TimeSlotUtils.createTravelSlot(
            travelStart,
            travelEnd,
            prevLoc,
            nextLoc,
            `travel-gap-${slot.start.getTime()}`,
          ));

          const availableStartMs = travelEnd.getTime() + bufferMs;
          if (availableStartMs < slot.end.getTime()) {
            result.push({
              start: new Date(availableStartMs),
              end: slot.end,
              durationMinutes: Math.floor((slot.end.getTime() - availableStartMs) / 60000),
              isAvailable: true,
              prevLocationId: nextLoc,
              nextLocationId: slot.nextLocationId,
              categoryId: slot.categoryId,
              isStrictCategory: slot.isStrictCategory,
            });
          }
        } else {
          occupiedSlots.push(TimeSlotUtils.createTravelSlot(
            slot.start,
            slot.end,
            prevLoc,
            nextLoc,
            `travel-insufficient-${slot.start.getTime()}`,
            { insufficientTravel: true, requiredTravelMinutes: travelMinutes },
          ));
        }
      } else {
        // Travel at END: depart as late as possible (going to a foreign event)
        const travelEnd = new Date(slot.end.getTime());
        const travelStart = new Date(travelEnd.getTime() - travelMs);

        if (travelStart.getTime() >= slot.start.getTime()) {
          const availableEndMs = Math.max(
            slot.start.getTime(),
            travelStart.getTime() - bufferMs,
          );

          if (availableEndMs > slot.start.getTime()) {
            // Normal fit: space remains before the travel block.
            occupiedSlots.push(TimeSlotUtils.createTravelSlot(
              travelStart,
              travelEnd,
              prevLoc,
              nextLoc,
              `travel-gap-${slot.start.getTime()}`,
            ));
            result.push({
              start: slot.start,
              end: new Date(availableEndMs),
              durationMinutes: Math.floor(
                (availableEndMs - slot.start.getTime()) / 60000,
              ),
              isAvailable: true,
              prevLocationId: slot.prevLocationId,
              nextLocationId: nextLoc,
              categoryId: slot.categoryId,
              isStrictCategory: slot.isStrictCategory,
            });
          } else {
            // Slot fully consumed by travel (no task space, no trailing buffer before
            // the next fixed event). Check for backward bleed into adjacent category.
            const lastResult = result.length > 0 ? result[result.length - 1] : null;
            if (
              !slot.categoryId &&
              lastResult?.isAvailable &&
              lastResult.categoryId &&
              lastResult.end.getTime() + bufferMs >= slot.start.getTime()
            ) {
              const newTravelEnd = new Date(slot.end.getTime() - bufferMs);
              const newTravelStart = new Date(newTravelEnd.getTime() - travelMs);
              occupiedSlots.push(TimeSlotUtils.createTravelSlot(
                newTravelStart, newTravelEnd, prevLoc, nextLoc,
                `travel-gap-${slot.start.getTime()}`,
              ));
              const newCatEnd = new Date(newTravelStart.getTime() - bufferMs);
              if (newCatEnd.getTime() > lastResult.start.getTime()) {
                result[result.length - 1] = {
                  ...lastResult,
                  end: newCatEnd,
                  durationMinutes: Math.floor(
                    (newCatEnd.getTime() - lastResult.start.getTime()) / 60000,
                  ),
                };
              } else {
                result.pop();
              }
              // Post-category slot fully consumed — not pushed to result.
            } else {
              // No adjacent category to absorb: place travel as-is.
              occupiedSlots.push(TimeSlotUtils.createTravelSlot(
                travelStart, travelEnd, prevLoc, nextLoc,
                `travel-gap-${slot.start.getTime()}`,
              ));
            }
          }
        } else {
          // Travel doesn't fit in the slot at all.
          // Check for backward bleed into an adjacent preceding category slot first.
          const lastResult = result.length > 0 ? result[result.length - 1] : null;
          if (
            !slot.categoryId &&
            lastResult?.isAvailable &&
            lastResult.categoryId &&
            lastResult.end.getTime() + bufferMs >= slot.start.getTime()
          ) {
            const newTravelEnd = new Date(slot.end.getTime() - bufferMs);
            const newTravelStart = new Date(newTravelEnd.getTime() - travelMs);
            occupiedSlots.push(TimeSlotUtils.createTravelSlot(
              newTravelStart, newTravelEnd, prevLoc, nextLoc,
              `travel-gap-${slot.start.getTime()}`,
            ));
            const newCatEnd = new Date(newTravelStart.getTime() - bufferMs);
            if (newCatEnd.getTime() > lastResult.start.getTime()) {
              result[result.length - 1] = {
                ...lastResult,
                end: newCatEnd,
                durationMinutes: Math.floor(
                  (newCatEnd.getTime() - lastResult.start.getTime()) / 60000,
                ),
              };
            } else {
              result.pop();
            }
            // Post-category slot consumed — not pushed to result.
          } else {
            // If the very next slot is an adjacent category slot, start the travel
            // adjacent to the plan and let it bleed through the boundary (Fix 2).
            const nextSlot = i + 1 < slots.length ? slots[i + 1] : null;
            if (
              !slot.categoryId &&
              nextSlot?.isAvailable &&
              nextSlot.categoryId &&
              nextSlot.start.getTime() === slot.end.getTime()
            ) {
              const bleedEnd = new Date(slot.start.getTime() + travelMs);
              occupiedSlots.push(TimeSlotUtils.createTravelSlot(
                slot.start, bleedEnd, prevLoc, nextLoc,
                `travel-gap-${slot.start.getTime()}`,
              ));
              // Shrink the category slot's start to after the bleeding travel.
              const newCatStart = new Date(bleedEnd.getTime() + bufferMs);
              if (newCatStart.getTime() < nextSlot.end.getTime()) {
                slots[i + 1] = {
                  ...nextSlot,
                  start: newCatStart,
                  durationMinutes: Math.floor((nextSlot.end.getTime() - newCatStart.getTime()) / 60000),
                  prevLocationId: nextLoc,
                };
              }
              // Pre-category slot fully consumed by travel — not pushed to result.
            } else {
              occupiedSlots.push(TimeSlotUtils.createTravelSlot(
                slot.start,
                slot.end,
                prevLoc,
                nextLoc,
                `travel-insufficient-${slot.start.getTime()}`,
                { insufficientTravel: true, requiredTravelMinutes: travelMinutes },
              ));
            }
          }
        }
      }
    }

    this.occupiedSlots.set(dayKey, occupiedSlots);
    return result;
  }

  /**
   * Returns true if pre-carved gap travel should be placed at the START of the slot
   * (return immediately after the preceding event) rather than at the end.
   *
   * Two cases trigger this:
   *
   * Case 1 — inside a category window: prevLoc is a foreign location and nextLoc
   * matches the category's base location (returning to category home after a detour).
   *
   * Case 2 — outside any category: prevLoc is a foreign location and nextLoc matches
   * the day's starting location (returning to the "home" location after a round trip,
   * e.g. a standalone plan at a foreign location on a day with no formal category).
   *
   * In both cases placing travel at the start ensures subsequent tasks resume in the
   * correct home-location context rather than filling the foreign-location gap.
   */
  private shouldPlaceTravelAtStart(
    slot: TimeSlot,
    prevLoc: string,
    nextLoc: string,
    dayHomeLoc: string | null,
  ): boolean {
    if (slot.categoryId) {
      // Case 1: within a category window
      const categoryPeriod = this.categoryPeriods.find(
        (p) => p.categoryId === slot.categoryId,
      );
      if (categoryPeriod?.locationId) {
        return prevLoc !== categoryPeriod.locationId && nextLoc === categoryPeriod.locationId;
      }
    } else if (dayHomeLoc && prevLoc !== dayHomeLoc && nextLoc === dayHomeLoc) {
      // Case 2: outside any category, returning to the day's starting location
      return true;
    }

    return false;
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
