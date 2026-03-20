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
  masksToIntervals,
  mergeIntervals,
  PerTemplateMask,
  Interval,
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

    // An "anywhere" (null-location) event inside a category wrapper should adopt the
    // category's location for interval purposes. Without this, findGaps tunnels past
    // the null-location event and picks up the pre-category location as prevLocationId
    // for the gap after the event, which then triggers spurious return-travel.
    const adjustedIntervals = this.applyCategoriesToNullIntervals(
      occupiedIntervals,
      startDate,
      endDate,
    );

    // Find gaps between occupied intervals (gaps now have prevLocationId/nextLocationId)
    const gaps = findGaps(adjustedIntervals, startDate, endDate);

    // Convert gaps to available time slots (location info is preserved)
    let slots = gaps;

    // No leading buffer pre-applied here. Buffers are handled at task placement time:
    // when a task is reserved, the slot is split so [slot.start, taskStart] becomes
    // an explicit buffer slot and [taskEnd, taskEnd+buffer] is the trailing buffer.
    // This allows gap travel (return trips) to start at slot.start = eventEnd directly.

    // Travel injection pipeline:
    // 1. Fix stale prevLocationId on slots following category periods
    // 2. Split slots at category boundaries to embed location transitions in the chain
    // 3. Walk the chain and carve travel where prevLocationId != nextLocationId
    // 4. Merge adjacent available slots back for the scheduler
    if (plannerLocationMap) {
      slots = this.fixPostCategoryPrevLoc(slots, adjustedIntervals, startDate, endDate);
      slots = this.splitSlotsAtCategoryBoundaries(slots, startDate, endDate);
      slots = this.carveTravelFromChain(slots, startDate);
    }

    return TimeSlotUtils.mergeAdjacentSlots(slots);
  }

  /**
   * Correct stale prevLocationId on slots that start after a category period ends.
   *
   * When an "anywhere" (null) event sits between a category period and a later gap,
   * findGaps walks backward past the null event and lands on whatever was before the
   * category — typically a home-location template — producing an incorrect prevLoc.
   *
   * For each slot whose start is at or after a category period's end, if there is no
   * non-null located interval between that period's end and the slot's start, the most
   * recent category's location is the correct prevLoc (we are still "in context" of
   * having been at that location).
   */
  private fixPostCategoryPrevLoc(
    slots: TimeSlot[],
    occupiedIntervals: Interval[],
    dayStart: Date,
    dayEnd: Date,
  ): TimeSlot[] {
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayEnd.getTime();
    const dayPeriods = this.categoryPeriods.filter(
      (p) =>
        p.locationId !== null &&
        p.start.getTime() < dayEndMs &&
        p.end.getTime() > dayStartMs,
    );
    if (dayPeriods.length === 0) return slots;

    const merged = mergeIntervals([...occupiedIntervals]);

    return slots.map((slot) => {
      if (!slot.isAvailable) return slot;

      const slotStartMs = slot.start.getTime();

      // Find category periods that have already ended before this slot starts,
      // sorted most-recently-ended first.
      const relevantPeriods = dayPeriods
        .filter((p) => slotStartMs >= p.end.getTime())
        .sort((a, b) => b.end.getTime() - a.end.getTime());

      for (const period of relevantPeriods) {
        const periodEndMs = period.end.getTime();
        // If any non-null located interval overlaps with the post-period region
        // [periodEnd, slotStart], it establishes a fresh location context — stop looking.
        // Use overlap check (start < slotStart && end > periodEnd) rather than containment,
        // so events that straddle the category boundary are also detected.
        const hasInterveningLocation = merged.some(
          (interval) =>
            interval.locationId !== null &&
            interval.start.getTime() < slotStartMs &&
            interval.end.getTime() > periodEndMs,
        );
        if (hasInterveningLocation) break;

        return { ...slot, prevLocationId: period.locationId };
      }

      return slot;
    });
  }

  /**
   * For null-location (anywhere) intervals that fall entirely within a category period
   * that has a location, assign the category's location to the interval.
   *
   * Without this, findGaps walks backward past the null-location interval and resolves
   * prevLocationId to whatever was before the category entry — causing carveTravelFromChain
   * to generate spurious return-travel at the start of the next available slot.
   */
  private applyCategoriesToNullIntervals(
    intervals: Interval[],
    dayStart: Date,
    dayEnd: Date,
  ): Interval[] {
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayEnd.getTime();
    const dayPeriods = this.categoryPeriods.filter(
      (p) =>
        p.locationId !== null &&
        p.start.getTime() < dayEndMs &&
        p.end.getTime() > dayStartMs,
    );
    if (dayPeriods.length === 0) return intervals;

    return intervals.map((interval) => {
      if (interval.locationId !== null) return interval;
      for (const period of dayPeriods) {
        if (
          interval.start.getTime() >= period.start.getTime() &&
          interval.end.getTime() <= period.end.getTime()
        ) {
          return { ...interval, locationId: period.locationId };
        }
      }
      return interval;
    });
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

        // When exiting a category at its end boundary, check if another category
        // starts at the same time. If so, the before-fragment's nextLoc should be
        // that adjacent category's location so carveTravelFromChain can place travel
        // between the two categories (e.g. gap slot inside catA → catB transition).
        const adjacentCatLoc = !entering
          ? (dayPeriods.find(
              (p) =>
                p.categoryId !== period.categoryId &&
                p.locationId !== null &&
                p.start.getTime() === boundaryMs,
            )?.locationId ?? null)
          : null;

        for (const slot of result) {
          if (!slot.isAvailable) {
            newResult.push(slot);
            continue;
          }

          const slotStartMs = slot.start.getTime();
          const slotEndMs = slot.end.getTime();

          if (boundaryMs >= slotStartMs && boundaryMs < slotEndMs) {
            const beforeDuration = Math.floor((boundaryMs - slotStartMs) / 60000);
            const afterDuration = Math.floor((slotEndMs - boundaryMs) / 60000);

            // Before-fragment is inside the period only when exiting (at period end).
            // Use the adjacent category's location as nextLoc when one starts here,
            // so the transition is visible to carveTravelFromChain.
            if (beforeDuration > 0) {
              const isInside = !entering;
              const beforeNextLoc = adjacentCatLoc ?? (catLoc !== null ? catLoc : slot.nextLocationId);
              newResult.push({
                start: slot.start,
                end: new Date(boundaryMs),
                durationMinutes: beforeDuration,
                isAvailable: true,
                prevLocationId: slot.prevLocationId,
                nextLocationId: beforeNextLoc,
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

    // Tracks locations from which gap travel has already departed on this day.
    // If the current travel's destination (nextLoc) is in this set, it means we've
    // previously left from that location — so this is a return trip and travel is placed
    // at START (depart immediately). Otherwise travel is placed at END (depart as late as possible).
    const departureLocations = new Set<string>();

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

      // Place at start if a previous gap travel departed FROM nextLoc (our current destination),
      // meaning this travel is a return trip to a place we've already left from.
      const placeAtStart = departureLocations.has(nextLoc);
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

      // When a pre-category slot (prevLoc→catLoc) is immediately followed by a category
      // slot that transitions to a foreign location (catLoc→planLoc), check two cases:
      //
      // (a) catSlotTooSmall: the category slot is too small to hold the catLoc→planLoc
      //     travel. Skip both hops and travel direct prevLoc→planLoc, placed at END so
      //     departure is as late as possible (maximum available time before the event).
      //
      // (b) combinedTooSmall: the two-hop route doesn't fit in the combined span at all.
      //     Same direct bypass but placed at START (depart immediately from prev event).
      if (!placeAtStart && !slot.categoryId) {
        const nextSlot = i + 1 < slots.length ? slots[i + 1] : null;
        // nextLoc is only a plan *inside* catB when catB slot ends before the period boundary.
        // If catB slot runs to the period end, nextLoc is simply the post-catB event location
        // and normal travel (prevLoc→catLoc) should be placed instead.
        const catPeriodEnd = nextSlot?.categoryId
          ? this.categoryPeriods.find(
              (p) =>
                p.categoryId === nextSlot.categoryId &&
                p.start.getTime() <= nextSlot.start.getTime() &&
                p.end.getTime() >= nextSlot.end.getTime(),
            )?.end
          : undefined;
        const nextLocIsInsideCatB =
          catPeriodEnd !== undefined &&
          nextSlot!.end.getTime() < catPeriodEnd.getTime();
        if (
          nextLocIsInsideCatB &&
          nextSlot?.isAvailable &&
          nextSlot.categoryId &&
          nextSlot.start.getTime() === slot.end.getTime() &&
          nextSlot.nextLocationId &&
          nextSlot.nextLocationId !== nextLoc
        ) {
          const bLoc = nextSlot.nextLocationId;
          const travelCatToB = this.travelManager.getTravelTime(nextLoc, bLoc, nextSlot.end);
          if (travelCatToB > 0) {
            const catSlotTooSmall = travelCatToB > nextSlot.durationMinutes;
            const availableMinutes = slot.durationMinutes + nextSlot.durationMinutes;
            const combinedMinutes = travelMinutes + this.bufferTimeMinutes + travelCatToB;
            const combinedTooSmall = combinedMinutes > availableMinutes;

            if (catSlotTooSmall || combinedTooSmall) {
              const spanEnd = nextSlot.end;
              if (catSlotTooSmall) {
                // Travel at END: depart as late as possible, arrive just before the plan.
                const directMinutes = this.travelManager.getTravelTime(prevLoc, bLoc, spanEnd);
                const travelStart = new Date(spanEnd.getTime() - directMinutes * 60000);
                if (travelStart.getTime() >= slot.start.getTime()) {
                  occupiedSlots.push(TimeSlotUtils.createTravelSlot(
                    travelStart, spanEnd, prevLoc, bLoc,
                    `travel-gap-${slot.start.getTime()}`,
                  ));
                  const availEnd = new Date(travelStart.getTime() - bufferMs);
                  if (availEnd.getTime() > slot.start.getTime()) {
                    result.push({
                      start: slot.start,
                      end: availEnd,
                      durationMinutes: Math.floor(
                        (availEnd.getTime() - slot.start.getTime()) / 60000,
                      ),
                      isAvailable: true,
                      prevLocationId: slot.prevLocationId,
                      nextLocationId: bLoc,
                      categoryId: slot.categoryId,
                      isStrictCategory: slot.isStrictCategory,
                    });
                  }
                } else {
                  occupiedSlots.push(TimeSlotUtils.createTravelSlot(
                    slot.start, spanEnd, prevLoc, bLoc,
                    `travel-insufficient-${slot.start.getTime()}`,
                    { insufficientTravel: true, requiredTravelMinutes: directMinutes },
                  ));
                }
                skipNextSlot = true;
              } else {
                // combinedTooSmall: travel at START, depart immediately from previous event.
                const directMinutes = this.travelManager.getTravelTime(prevLoc, bLoc, slot.start);
                const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);
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
                      durationMinutes: Math.floor(
                        (spanEnd.getTime() - newCatStart.getTime()) / 60000,
                      ),
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
              }
              departureLocations.add(prevLoc);
              continue;
            }
          }
        }
      }

      // Double-transition inside a category: both prevLoc and nextLoc are foreign
      // (e.g. slot follows Plan A at varmdo and precedes Plan B at gym, inside work window).
      // Place travel-at-START (return to category home) and travel-at-END (depart for
      // next event) as two separate events if both fit; otherwise fall through to the
      // single merged prevLoc→nextLoc travel below.
      if (slot.categoryId) {
        const categoryPeriod = this.categoryPeriods.find(
          (p) => p.categoryId === slot.categoryId,
        );
        const catLoc = categoryPeriod?.locationId ?? null;
        if (catLoc && prevLoc !== catLoc && nextLoc !== catLoc) {
          const travelBeforeMinutes = this.travelManager.getTravelTime(prevLoc, catLoc, slot.start);
          const travelAfterMinutes = this.travelManager.getTravelTime(catLoc, nextLoc, slot.end);
          const travelBeforeMs = travelBeforeMinutes * 60000;
          const travelAfterMs = travelAfterMinutes * 60000;
          const slotMs = slot.end.getTime() - slot.start.getTime();

          if (travelBeforeMs + travelAfterMs <= slotMs) {
            const travelBeforeEnd = new Date(slot.start.getTime() + travelBeforeMs);
            occupiedSlots.push(TimeSlotUtils.createTravelSlot(
              slot.start, travelBeforeEnd, prevLoc, catLoc,
              `travel-gap-${slot.start.getTime()}`,
            ));

            const travelAfterStart = new Date(slot.end.getTime() - travelAfterMs);
            occupiedSlots.push(TimeSlotUtils.createTravelSlot(
              travelAfterStart, slot.end, catLoc, nextLoc,
              `travel-gap-${slot.end.getTime()}`,
            ));

            const availStart = new Date(travelBeforeEnd.getTime() + bufferMs);
            const availEnd = new Date(travelAfterStart.getTime() - bufferMs);
            if (availEnd.getTime() > availStart.getTime()) {
              result.push({
                start: availStart,
                end: availEnd,
                durationMinutes: Math.floor(
                  (availEnd.getTime() - availStart.getTime()) / 60000,
                ),
                isAvailable: true,
                prevLocationId: catLoc,
                nextLocationId: catLoc,
                categoryId: slot.categoryId,
                isStrictCategory: slot.isStrictCategory,
              });
            }
            departureLocations.add(prevLoc);
            departureLocations.add(catLoc);
            continue;
          }
          // Both don't fit — fall through to single merged travel (prevLoc→nextLoc).
        }
      }

      // Mirror of catSlotTooSmall: last category slot returning from a foreign plan is
      // fully consumed by return travel (planLoc→catLoc >= slot duration). Skip the
      // intermediate catLoc stop and travel direct planLoc→destLoc from slot.start,
      // absorbing the immediately-following post-category slot.
      if (placeAtStart && slot.categoryId) {
        const nextSlot = i + 1 < slots.length ? slots[i + 1] : null;
        if (
          travelMinutes >= slot.durationMinutes &&
          nextSlot?.isAvailable &&
          !nextSlot.categoryId &&
          nextSlot.start.getTime() === slot.end.getTime() &&
          nextSlot.prevLocationId === nextLoc &&
          nextSlot.nextLocationId
        ) {
          const dLoc = nextSlot.nextLocationId;
          const directMinutes = this.travelManager.getTravelTime(prevLoc, dLoc, slot.start);
          const spanEnd = nextSlot.end;
          const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);

          if (travelEnd.getTime() <= spanEnd.getTime()) {
            occupiedSlots.push(TimeSlotUtils.createTravelSlot(
              slot.start, travelEnd, prevLoc, dLoc,
              `travel-gap-${slot.start.getTime()}`,
            ));
            const availStart = new Date(travelEnd.getTime() + bufferMs);
            if (availStart.getTime() < spanEnd.getTime()) {
              result.push({
                start: availStart,
                end: spanEnd,
                durationMinutes: Math.floor((spanEnd.getTime() - availStart.getTime()) / 60000),
                isAvailable: true,
                prevLocationId: dLoc,
                nextLocationId: nextSlot.nextLocationId,
                categoryId: null,
                isStrictCategory: false,
              });
            }
          } else {
            occupiedSlots.push(TimeSlotUtils.createTravelSlot(
              slot.start, spanEnd, prevLoc, dLoc,
              `travel-insufficient-${slot.start.getTime()}`,
              { insufficientTravel: true, requiredTravelMinutes: directMinutes },
            ));
          }
          skipNextSlot = true;
          departureLocations.add(prevLoc);
          continue;
        }
      }

      if (placeAtStart) {
        // Travel at START: depart immediately when the preceding event ends.
        // slot.start = eventEnd (no pre-baked buffer), so travel starts right here.
        departureLocations.add(prevLoc);
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
            travelStart,
            slot.end,
            prevLoc,
            nextLoc,
            `travel-insufficient-${slot.start.getTime()}`,
            { insufficientTravel: true, requiredTravelMinutes: travelMinutes },
          ));
        }
      } else {
        // Travel at END: departing from prevLoc toward a new destination.
        departureLocations.add(prevLoc);
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
            // the next fixed event). Check for backward bleed into adjacent slot.
            const lastResult = result.length > 0 ? result[result.length - 1] : null;
            const newTravelEnd = new Date(slot.end.getTime() - bufferMs);
            const newTravelStart = new Date(newTravelEnd.getTime() - travelMs);
            // Only bleed backward if the travel start lands within the previous slot.
            // If newTravelStart < lastResult.start the travel would cross into occupied
            // time before that slot, creating overlapping events.
            const canBleed = !!(
              lastResult?.isAvailable &&
              lastResult.end.getTime() + bufferMs >= slot.start.getTime() &&
              newTravelStart.getTime() >= lastResult.start.getTime()
            );
            if (!slot.categoryId && canBleed && lastResult?.categoryId) {
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
            } else if (canBleed) {
              occupiedSlots.push(TimeSlotUtils.createTravelSlot(
                newTravelStart, newTravelEnd, prevLoc, nextLoc,
                `travel-gap-${slot.start.getTime()}`,
              ));
              const newLastEnd = new Date(newTravelStart.getTime() - bufferMs);
              if (newLastEnd.getTime() > lastResult!.start.getTime()) {
                result[result.length - 1] = {
                  ...lastResult!,
                  end: newLastEnd,
                  durationMinutes: Math.floor(
                    (newLastEnd.getTime() - lastResult!.start.getTime()) / 60000,
                  ),
                };
              } else {
                result.pop();
              }
              // Slot fully consumed by travel — not pushed to result.
            } else {
              // No adjacent slot or bleed would cross into occupied time: place travel as-is.
              occupiedSlots.push(TimeSlotUtils.createTravelSlot(
                travelStart, travelEnd, prevLoc, nextLoc,
                `travel-gap-${slot.start.getTime()}`,
              ));
            }
          }
        } else {
          // Travel doesn't fit in the slot at all.
          // Check for backward bleed into an adjacent preceding slot.
          const lastResult = result.length > 0 ? result[result.length - 1] : null;
          const newTravelEnd = new Date(slot.end.getTime() - bufferMs);
          const newTravelStart = new Date(newTravelEnd.getTime() - travelMs);
          // Only bleed backward if the travel start lands within the previous slot.
          const canBleed = !!(
            lastResult?.isAvailable &&
            lastResult.end.getTime() + bufferMs >= slot.start.getTime() &&
            newTravelStart.getTime() >= lastResult.start.getTime()
          );
          if (!slot.categoryId && canBleed && lastResult?.categoryId) {
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
          } else if (slot.categoryId && canBleed) {
            occupiedSlots.push(TimeSlotUtils.createTravelSlot(
              newTravelStart, newTravelEnd, prevLoc, nextLoc,
              `travel-gap-${slot.start.getTime()}`,
            ));
            const newLastEnd = new Date(newTravelStart.getTime() - bufferMs);
            if (newLastEnd.getTime() > lastResult!.start.getTime()) {
              result[result.length - 1] = {
                ...lastResult!,
                end: newLastEnd,
                durationMinutes: Math.floor(
                  (newLastEnd.getTime() - lastResult!.start.getTime()) / 60000,
                ),
              };
            } else {
              result.pop();
            }
            // Slot consumed by travel — not pushed to result.
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
