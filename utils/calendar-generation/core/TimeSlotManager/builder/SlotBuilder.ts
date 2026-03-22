/**
 * SlotBuilder
 *
 * Responsible for building available time slots from existing events and templates.
 * Handles gap detection, buffer application, and travel transition processing.
 */

import { SimpleEvent } from "@/types/prisma";
import { CategoryPeriod } from "@/types/categoryTypes";
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
import { v4 as uuidv4 } from "uuid";

export class SlotBuilder {
  private categoryPeriods: CategoryPeriod[] = [];

  constructor(
    private occupiedSlots: Map<string, TimeSlot[]>,
    private travelManager: TravelManager,
    private getDayKeyFn: (date: Date) => string,
    private bufferTimeMinutes: number,
  ) {}

  /**
   * Build available time slots for a date range
   * @param templateMasks - Template masks for determining occupied time (no SimpleEvent generation needed)
   * @param plannerLocationMap - Optional map of planner ID to location ID for tracking slot neighbors
   */
  buildAvailableSlots(
    startDate: Date,
    endDate: Date,
    existingEvents: SimpleEvent[],
    templateMasks: PerTemplateMask[],
    categoryPeriods: CategoryPeriod[],
    plannerLocationMap?: Map<string, string | null>,
  ): TimeSlot[] {
    this.categoryPeriods = categoryPeriods;
    // Filter existing events to only those that overlap with this date range.
    // Exclude template events since we create intervals from masks instead.
    const relevantEvents = existingEvents.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const isTemplate = event.extendedProps?.itemType === "template";
      return !isTemplate && eventStart < endDate && eventEnd > startDate;
    });

    const eventIntervals = eventsToIntervals(
      relevantEvents,
      plannerLocationMap,
    );
    const templateIntervals = masksToIntervals(templateMasks, startDate);
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

    // Find gaps between occupied intervals (gaps now have prevLocationId/nextLocationId).
    const gaps = findGaps(adjustedIntervals, startDate, endDate);

    // No leading buffer pre-applied here. Buffers are handled at task placement time:
    // when a task is reserved, the slot is split so [slot.start, taskStart] becomes
    // an explicit buffer slot and [taskEnd, taskEnd+buffer] is the trailing buffer.
    // This allows gap travel (return trips) to start at slot.start = eventEnd directly.
    let slots = gaps;

    // Travel injection pipeline:
    // 1. Fix stale prevLocationId on slots following category periods
    // 2. Split slots at category boundaries to embed location transitions in the chain
    // 3. Walk the chain and carve travel where prevLocationId != nextLocationId
    // 4. Merge adjacent available slots back for the scheduler
    if (plannerLocationMap) {
      slots = this.fixPostCategoryPrevLoc(
        slots,
        adjustedIntervals,
        startDate,
        endDate,
      );
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
      (p) => p.start.getTime() < dayEndMs && p.end.getTime() > dayStartMs,
    );

    if (dayPeriods.length === 0) return slots;

    let result = slots;

    for (const period of dayPeriods) {
      const catLoc = period.locationId;
      const boundaries: Array<{ time: Date; entering: boolean }> = [];

      if (
        period.start.getTime() > dayStartMs &&
        period.start.getTime() < dayEndMs
      ) {
        boundaries.push({ time: period.start, entering: true });
      }
      if (
        period.end.getTime() > dayStartMs &&
        period.end.getTime() < dayEndMs
      ) {
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
            const beforeDuration = Math.floor(
              (boundaryMs - slotStartMs) / 60000,
            );
            const afterDuration = Math.floor((slotEndMs - boundaryMs) / 60000);

            // Before-fragment is inside the period only when exiting (at period end).
            // Use the adjacent category's location as nextLoc when one starts here,
            // so the transition is visible to carveTravelFromChain.
            if (beforeDuration > 0) {
              const isInside = !entering;
              const beforeNextLoc =
                adjacentCatLoc ??
                (catLoc !== null ? catLoc : slot.nextLocationId);
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
        if (
          slotMidMs >= period.start.getTime() &&
          slotMidMs < period.end.getTime()
        ) {
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
  private carveTravelFromChain(slots: TimeSlot[], dayStart: Date): TimeSlot[] {
    const dayKey = this.getDayKeyFn(dayStart);
    // Remove any previously carved gap-travel for this day so rebuilding a day
    // doesn't accumulate duplicate entries in occupiedSlots.
    const occupiedSlots = (this.occupiedSlots.get(dayKey) || []).filter(
      (s) => s.travelType !== "preliminary",
    );
    const result: TimeSlot[] = [];

    // Tracks locations from which gap travel has already departed on this day.
    // If nextLoc is in this set, this is a return trip and travel is placed at START
    // (depart immediately). Otherwise travel is placed at END (depart as late as possible).
    const departureLocations = new Set<string>();

    let skipNextSlot = false;
    for (let i = 0; i < slots.length; i++) {
      if (skipNextSlot) {
        skipNextSlot = false;
        continue;
      }
      const slot = slots[i];

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

      const placeAtStart = departureLocations.has(nextLoc);
      const travelMinutes = this.travelManager.getTravelTime(
        prevLoc,
        nextLoc,
        placeAtStart ? slot.start : slot.end,
      );
      if (travelMinutes <= 0) {
        result.push(slot);
        continue;
      }

      const nextSlot = i + 1 < slots.length ? slots[i + 1] : null;

      // When going outbound (not a return), check if the next slot is a category slot
      // whose plan destination is only reachable via a two-hop route (prevLoc→catLoc→plan).
      // If the catLoc→plan hop is too large for the category slot, bypass with direct travel.
      if (!placeAtStart && !slot.categoryId) {
        const bypass = this.tryDirectBypass(
          slot,
          nextSlot,
          slots,
          i,
          prevLoc,
          nextLoc,
          travelMinutes,
          occupiedSlots,
          result,
        );
        if (bypass.handled) {
          departureLocations.add(prevLoc);
          if (bypass.skipNext) skipNextSlot = true;
          continue;
        }
      }

      // Double-transition: slot is inside a category, but both prevLoc and nextLoc are
      // foreign to the category's location. Carve return-travel + depart-travel separately.
      if (slot.categoryId) {
        const dbl = this.tryDoubleTransition(
          slot,
          prevLoc,
          nextLoc,
          occupiedSlots,
          result,
        );
        if (dbl.handled) {
          departureLocations.add(prevLoc);
          if (dbl.catLoc) departureLocations.add(dbl.catLoc);
          continue;
        }
      }

      // Return absorption: category slot is fully consumed by return travel.
      // Absorb the immediately-following post-category slot and travel direct prevLoc→dLoc.
      if (placeAtStart && slot.categoryId) {
        const absorb = this.tryReturnAbsorption(
          slot,
          nextSlot,
          prevLoc,
          nextLoc,
          travelMinutes,
          occupiedSlots,
          result,
        );
        if (absorb.handled) {
          departureLocations.add(prevLoc);
          if (absorb.skipNext) skipNextSlot = true;
          continue;
        }
      }

      if (placeAtStart) {
        this.carveAtStart(
          slot,
          prevLoc,
          nextLoc,
          travelMinutes,
          occupiedSlots,
          result,
        );
      } else {
        this.carveAtEnd(
          slot,
          slots,
          i,
          prevLoc,
          nextLoc,
          travelMinutes,
          occupiedSlots,
          result,
        );
      }
      departureLocations.add(prevLoc);
    }

    this.occupiedSlots.set(dayKey, occupiedSlots);
    return result;
  }

  /**
   * When catSlotTooSmall or combinedTooSmall, skip the intermediate catLoc stop and
   * travel direct prevLoc→bLoc. Mutates occupiedSlots and result directly.
   *
   * catSlotTooSmall: travel at END (depart as late as possible).
   * combinedTooSmall: travel at START (depart immediately from previous event).
   */
  private tryDirectBypass(
    slot: TimeSlot,
    nextSlot: TimeSlot | null,
    slots: TimeSlot[],
    slotIndex: number,
    prevLoc: string,
    nextLoc: string,
    travelMinutes: number,
    occupiedSlots: TimeSlot[],
    result: TimeSlot[],
  ): { handled: boolean; skipNext?: boolean } {
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
      !nextLocIsInsideCatB ||
      !nextSlot?.isAvailable ||
      !nextSlot.categoryId ||
      nextSlot.start.getTime() !== slot.end.getTime() ||
      !nextSlot.nextLocationId ||
      nextSlot.nextLocationId === nextLoc
    ) {
      return { handled: false };
    }

    const bLoc = nextSlot.nextLocationId;
    const travelCatToB = this.travelManager.getTravelTime(
      nextLoc,
      bLoc,
      nextSlot.end,
    );
    if (travelCatToB <= 0) return { handled: false };

    const catSlotTooSmall = travelCatToB > nextSlot.durationMinutes;
    const availableMinutes = slot.durationMinutes + nextSlot.durationMinutes;
    const combinedTooSmall =
      travelMinutes + this.bufferTimeMinutes + travelCatToB > availableMinutes;

    if (!catSlotTooSmall && !combinedTooSmall) return { handled: false };

    const spanEnd = nextSlot.end;

    if (catSlotTooSmall) {
      // Travel at END: depart as late as possible, arrive just before the plan.
      const directMinutes = this.travelManager.getTravelTime(
        prevLoc,
        bLoc,
        spanEnd,
      );
      const travelStart = new Date(spanEnd.getTime() - directMinutes * 60000);
      if (travelStart.getTime() >= slot.start.getTime()) {
        occupiedSlots.push(
          TimeSlotUtils.createTravelSlot(
            travelStart,
            spanEnd,
            prevLoc,
            bLoc,
            "preliminary",
            uuidv4(),
          ),
        );
        const availEnd = new Date(travelStart.getTime());
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
        occupiedSlots.push(
          TimeSlotUtils.createTravelSlot(
            slot.start,
            spanEnd,
            prevLoc,
            bLoc,
            "preliminary",
            uuidv4(),
            { insufficientTravel: true, requiredTravelMinutes: directMinutes },
          ),
        );
      }
      return { handled: true, skipNext: true };
    } else {
      // combinedTooSmall: travel at START, depart immediately from previous event.
      const directMinutes = this.travelManager.getTravelTime(
        prevLoc,
        bLoc,
        slot.start,
      );
      const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);
      if (travelEnd.getTime() <= spanEnd.getTime()) {
        occupiedSlots.push(
          TimeSlotUtils.createTravelSlot(
            slot.start,
            travelEnd,
            prevLoc,
            bLoc,
            "preliminary",
            uuidv4(),
          ),
        );
        const newCatStart = new Date(travelEnd.getTime());
        if (newCatStart.getTime() < spanEnd.getTime()) {
          slots[slotIndex + 1] = {
            ...nextSlot,
            start: newCatStart,
            durationMinutes: Math.floor(
              (spanEnd.getTime() - newCatStart.getTime()) / 60000,
            ),
            prevLocationId: bLoc,
          };
          return { handled: true, skipNext: false };
        }
      } else {
        occupiedSlots.push(
          TimeSlotUtils.createTravelSlot(
            slot.start,
            spanEnd,
            prevLoc,
            bLoc,
            "preliminary",
            uuidv4(),
            { insufficientTravel: true, requiredTravelMinutes: directMinutes },
          ),
        );
      }
      return { handled: true, skipNext: true };
    }
  }

  /**
   * Both prevLoc and nextLoc are foreign to the category's location (double-transition).
   * Carve return-travel [prevLoc→catLoc] at START and depart-travel [catLoc→nextLoc] at END
   * if both fit within the slot. Falls through (returns handled: false) if they don't fit,
   * allowing single merged prevLoc→nextLoc travel to be placed instead.
   */
  private tryDoubleTransition(
    slot: TimeSlot,
    prevLoc: string,
    nextLoc: string,
    occupiedSlots: TimeSlot[],
    result: TimeSlot[],
  ): { handled: boolean; catLoc?: string } {
    const categoryPeriod = this.categoryPeriods.find(
      (p) => p.categoryId === slot.categoryId,
    );
    const catLoc = categoryPeriod?.locationId ?? null;
    if (!catLoc || prevLoc === catLoc || nextLoc === catLoc)
      return { handled: false };

    const travelBeforeMinutes = this.travelManager.getTravelTime(
      prevLoc,
      catLoc,
      slot.start,
    );
    const travelAfterMinutes = this.travelManager.getTravelTime(
      catLoc,
      nextLoc,
      slot.end,
    );
    const travelBeforeMs = travelBeforeMinutes * 60000;
    const travelAfterMs = travelAfterMinutes * 60000;
    const slotMs = slot.end.getTime() - slot.start.getTime();

    if (travelBeforeMs + travelAfterMs > slotMs) return { handled: false };

    const travelBeforeEnd = new Date(slot.start.getTime() + travelBeforeMs);
    occupiedSlots.push(
      TimeSlotUtils.createTravelSlot(
        slot.start,
        travelBeforeEnd,
        prevLoc,
        catLoc,
        "preliminary",
        uuidv4(),
      ),
    );

    const travelAfterStart = new Date(slot.end.getTime() - travelAfterMs);
    occupiedSlots.push(
      TimeSlotUtils.createTravelSlot(
        travelAfterStart,
        slot.end,
        catLoc,
        nextLoc,
        "preliminary",
        uuidv4(),
      ),
    );

    const availStart = new Date(travelBeforeEnd.getTime());
    const availEnd = new Date(travelAfterStart.getTime());
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
    return { handled: true, catLoc };
  }

  /**
   * Mirror of catSlotTooSmall: the last category slot is fully consumed by return travel
   * (planLoc→catLoc >= slot duration). Skip the intermediate catLoc stop and travel direct
   * prevLoc→dLoc from slot.start, absorbing the immediately-following post-category slot.
   */
  private tryReturnAbsorption(
    slot: TimeSlot,
    nextSlot: TimeSlot | null,
    prevLoc: string,
    nextLoc: string,
    travelMinutes: number,
    occupiedSlots: TimeSlot[],
    result: TimeSlot[],
  ): { handled: boolean; skipNext?: boolean } {
    if (
      travelMinutes < slot.durationMinutes ||
      !nextSlot?.isAvailable ||
      nextSlot.categoryId ||
      nextSlot.start.getTime() !== slot.end.getTime() ||
      nextSlot.prevLocationId !== nextLoc ||
      !nextSlot.nextLocationId
    ) {
      return { handled: false };
    }

    const dLoc = nextSlot.nextLocationId;
    const directMinutes = this.travelManager.getTravelTime(
      prevLoc,
      dLoc,
      slot.start,
    );
    const spanEnd = nextSlot.end;
    const travelEnd = new Date(slot.start.getTime() + directMinutes * 60000);

    if (travelEnd.getTime() <= spanEnd.getTime()) {
      occupiedSlots.push(
        TimeSlotUtils.createTravelSlot(
          slot.start,
          travelEnd,
          prevLoc,
          dLoc,
          "preliminary",
          uuidv4(),
        ),
      );
      const availStart = new Date(travelEnd.getTime());
      if (availStart.getTime() < spanEnd.getTime()) {
        result.push({
          start: availStart,
          end: spanEnd,
          durationMinutes: Math.floor(
            (spanEnd.getTime() - availStart.getTime()) / 60000,
          ),
          isAvailable: true,
          prevLocationId: dLoc,
          nextLocationId: nextSlot.nextLocationId,
          categoryId: null,
          isStrictCategory: false,
        });
      }
    } else {
      occupiedSlots.push(
        TimeSlotUtils.createTravelSlot(
          slot.start,
          spanEnd,
          prevLoc,
          dLoc,
          "preliminary",
          uuidv4(),
          { insufficientTravel: true, requiredTravelMinutes: directMinutes },
        ),
      );
    }
    return { handled: true, skipNext: true };
  }

  /**
   * Place travel at the START of a slot (return trip — depart immediately when the
   * preceding event ends). slot.start = eventEnd with no pre-baked buffer.
   */
  private carveAtStart(
    slot: TimeSlot,
    prevLoc: string,
    nextLoc: string,
    travelMinutes: number,
    occupiedSlots: TimeSlot[],
    result: TimeSlot[],
  ): void {
    const travelMs = travelMinutes * 60000;
    const travelEnd = new Date(slot.start.getTime() + travelMs);

    if (travelEnd.getTime() <= slot.end.getTime()) {
      occupiedSlots.push(
        TimeSlotUtils.createTravelSlot(
          slot.start,
          travelEnd,
          prevLoc,
          nextLoc,
          "preliminary",
          uuidv4(),
        ),
      );
      const availableStartMs = travelEnd.getTime();
      if (availableStartMs < slot.end.getTime()) {
        result.push({
          start: new Date(availableStartMs),
          end: slot.end,
          durationMinutes: Math.floor(
            (slot.end.getTime() - availableStartMs) / 60000,
          ),
          isAvailable: true,
          prevLocationId: nextLoc,
          nextLocationId: slot.nextLocationId,
          categoryId: slot.categoryId,
          isStrictCategory: slot.isStrictCategory,
        });
      }
    } else {
      occupiedSlots.push(
        TimeSlotUtils.createTravelSlot(
          slot.start,
          slot.end,
          prevLoc,
          nextLoc,
          "preliminary",
          uuidv4(),
          { insufficientTravel: true, requiredTravelMinutes: travelMinutes },
        ),
      );
    }
  }

  /**
   * Place travel at the END of a slot (outbound trip — depart as late as possible).
   * When the slot is too small for the travel block, attempts backward bleed into the
   * preceding available slot, then forward bleed into an adjacent category slot (Fix 2),
   * then falls back to marking the travel as insufficient.
   */
  private carveAtEnd(
    slot: TimeSlot,
    slots: TimeSlot[],
    slotIndex: number,
    prevLoc: string,
    nextLoc: string,
    travelMinutes: number,
    occupiedSlots: TimeSlot[],
    result: TimeSlot[],
  ): void {
    const travelMs = travelMinutes * 60000;
    const bufferMs = this.bufferTimeMinutes * 60000;
    const travelEnd = slot.end;
    const travelStart = new Date(travelEnd.getTime() - travelMs);

    if (travelStart.getTime() >= slot.start.getTime()) {
      if (travelStart.getTime() > slot.start.getTime()) {
        // Normal fit: space remains before the travel block.
        occupiedSlots.push(
          TimeSlotUtils.createTravelSlot(
            travelStart,
            travelEnd,
            prevLoc,
            nextLoc,
            "preliminary",
            uuidv4(),
          ),
        );
        result.push({
          start: slot.start,
          end: new Date(travelStart.getTime()),
          durationMinutes: Math.floor(
            (travelStart.getTime() - slot.start.getTime()) / 60000,
          ),
          isAvailable: true,
          prevLocationId: slot.prevLocationId,
          nextLocationId: nextLoc,
          categoryId: slot.categoryId,
          isStrictCategory: slot.isStrictCategory,
        });
      } else {
        // Slot exactly consumed by travel: try backward bleed, else place as-is.
        if (
          !this.tryBleedBackward(
            slot,
            prevLoc,
            nextLoc,
            travelMinutes,
            bufferMs,
            false,
            occupiedSlots,
            result,
          )
        ) {
          occupiedSlots.push(
            TimeSlotUtils.createTravelSlot(
              travelStart,
              travelEnd,
              prevLoc,
              nextLoc,
              "preliminary",
              uuidv4(),
            ),
          );
        }
      }
    } else {
      // Travel doesn't fit: try backward bleed, then forward bleed (Fix 2), else mark insufficient.
      if (
        !this.tryBleedBackward(
          slot,
          prevLoc,
          nextLoc,
          travelMinutes,
          bufferMs,
          true,
          occupiedSlots,
          result,
        )
      ) {
        const nextSlot =
          slotIndex + 1 < slots.length ? slots[slotIndex + 1] : null;
        if (
          !slot.categoryId &&
          nextSlot?.isAvailable &&
          nextSlot.categoryId &&
          nextSlot.start.getTime() === slot.end.getTime()
        ) {
          // Fix 2: bleed travel forward into the adjacent category slot.
          const bleedEnd = new Date(slot.start.getTime() + travelMs);
          occupiedSlots.push(
            TimeSlotUtils.createTravelSlot(
              slot.start,
              bleedEnd,
              prevLoc,
              nextLoc,
              "preliminary",
              uuidv4(),
            ),
          );
          const newCatStart = new Date(bleedEnd.getTime() + bufferMs);
          if (newCatStart.getTime() < nextSlot.end.getTime()) {
            slots[slotIndex + 1] = {
              ...nextSlot,
              start: newCatStart,
              durationMinutes: Math.floor(
                (nextSlot.end.getTime() - newCatStart.getTime()) / 60000,
              ),
              prevLocationId: nextLoc,
            };
          }
        } else {
          occupiedSlots.push(
            TimeSlotUtils.createTravelSlot(
              slot.start,
              slot.end,
              prevLoc,
              nextLoc,
              "preliminary",
              uuidv4(),
              {
                insufficientTravel: true,
                requiredTravelMinutes: travelMinutes,
              },
            ),
          );
        }
      }
    }
  }

  /**
   * Try to bleed travel backward into the preceding available slot by shifting the
   * travel block earlier (slot.end - buffer - travelMs).
   *
   * Used when the current slot is fully consumed by travel and can't hold it cleanly.
   * The `requireSlotCategoryId` flag controls whether the general bleed branch (second
   * condition) requires the current slot to be inside a category — true when the slot
   * didn't even start with enough room (travelStart < slot.start), false when it was
   * exact (travelStart === slot.start).
   *
   * Returns true if a bleed was performed (travel placed, previous slot shrunk or removed).
   */
  private tryBleedBackward(
    slot: TimeSlot,
    prevLoc: string,
    nextLoc: string,
    travelMinutes: number,
    bufferMs: number,
    requireSlotCategoryId: boolean,
    occupiedSlots: TimeSlot[],
    result: TimeSlot[],
  ): boolean {
    const lastResult = result.length > 0 ? result[result.length - 1] : null;
    const newTravelEnd = new Date(slot.end.getTime() - bufferMs);
    const newTravelStart = new Date(
      newTravelEnd.getTime() - travelMinutes * 60000,
    );
    // Only bleed backward if the travel start lands within the previous slot.
    // If newTravelStart < lastResult.start the travel would cross into occupied
    // time before that slot, creating overlapping events.
    const canBleed = !!(
      lastResult?.isAvailable &&
      lastResult.end.getTime() + bufferMs >= slot.start.getTime() &&
      newTravelStart.getTime() >= lastResult.start.getTime()
    );

    if (!canBleed) return false;

    if (!slot.categoryId && lastResult?.categoryId) {
      // Post-category slot: bleed travel into the preceding category slot.
      occupiedSlots.push(
        TimeSlotUtils.createTravelSlot(
          newTravelStart,
          newTravelEnd,
          prevLoc,
          nextLoc,
          "preliminary",
          uuidv4(),
        ),
      );
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
      return true;
    }

    if (!requireSlotCategoryId || slot.categoryId) {
      occupiedSlots.push(
        TimeSlotUtils.createTravelSlot(
          newTravelStart,
          newTravelEnd,
          prevLoc,
          nextLoc,
          "preliminary",
          uuidv4(),
        ),
      );
      const newLastEnd = new Date(newTravelStart.getTime() - bufferMs);
      if (newLastEnd.getTime() > lastResult.start.getTime()) {
        result[result.length - 1] = {
          ...lastResult,
          end: newLastEnd,
          durationMinutes: Math.floor(
            (newLastEnd.getTime() - lastResult.start.getTime()) / 60000,
          ),
        };
      } else {
        result.pop();
      }
      return true;
    }

    return false;
  }
}
