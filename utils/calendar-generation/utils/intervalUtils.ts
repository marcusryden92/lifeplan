/**
 * Interval Utilities
 *
 * Efficient operations on time intervals for scheduling.
 * Uses interval tree concepts for O(log n) lookups.
 */

import { SimpleEvent } from "@/types/prisma";
import { TimeSlot } from "../models/TimeSlot";

export interface Interval {
  start: Date;
  end: Date;
  locationId?: string | null; // Location of the event occupying this interval
}


/**
 * Merge overlapping intervals into non-overlapping ranges
 * Useful for consolidating occupied time blocks
 */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  // Sort by start time
  const sorted = [...intervals].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const merged: Interval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // If current interval overlaps with the last merged interval
    if (current.start <= last.end) {
      // Extend the last interval
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
    } else {
      // No overlap, add as new interval
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Represents a location transition between adjacent events that may require travel
 */
export interface LocationTransition {
  /** End time of the first event */
  fromEventEnd: Date;
  /** Start time of the second event */
  toEventStart: Date;
  /** Location of the first event */
  fromLocationId: string | null;
  /** Location of the second event */
  toLocationId: string | null;
  /** Gap in minutes (negative if events overlap) */
  gapMinutes: number;
  /** True if events overlap or touch exactly */
  isTrespassing: boolean;
}

/**
 * Find all location transitions between adjacent events with different locations
 * This includes overlapping events (trespassing) and events with insufficient gaps
 * Does NOT merge intervals, so overlaps are preserved
 */
export function findLocationTransitions(
  intervals: Interval[],
): LocationTransition[] {
  if (intervals.length <= 1) return [];

  // Sort by start time
  const sorted = [...intervals].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const transitions: LocationTransition[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Only create transitions when locations differ
    // Skip if either location is null ("everywhere" - no travel needed)
    if (
      current.locationId &&
      next.locationId &&
      current.locationId !== next.locationId
    ) {
      const gapMs = next.start.getTime() - current.end.getTime();
      const gapMinutes = Math.floor(gapMs / 60000);

      transitions.push({
        fromEventEnd: current.end,
        toEventStart: next.start,
        fromLocationId: current.locationId,
        toLocationId: next.locationId,
        gapMinutes,
        isTrespassing: gapMinutes <= 0,
      });
    }
  }

  return transitions;
}

/**
 * Extended interval with optional event ID for tracking
 */
export interface IntervalWithId extends Interval {
  eventId?: string;
}

/**
 * Trespassing info for an event - which borders should be red
 */
export interface TrespassingInfo {
  eventId: string;
  /** True if the event's start border should be red (overlaps at start) */
  trespassingStart: boolean;
  /** True if the event's end border should be red (overlaps at end) */
  trespassingEnd: boolean;
}

/**
 * Detect trespassing (overlapping) events with different locations
 * Returns a map of event IDs to their trespassing border info
 *
 * Rules:
 * - Event A ends after Event B starts (A infringes on B): A gets red BOTTOM border
 * - Event B nested inside Event A: B gets BOTH red top AND bottom borders
 * - Start times equal: Both events get red TOP border
 * - End times equal: Both events get red BOTTOM border
 */
export function detectTrespassingEvents(
  intervals: IntervalWithId[],
): Map<string, TrespassingInfo> {
  const trespassingMap = new Map<string, TrespassingInfo>();

  if (intervals.length <= 1) return trespassingMap;

  // Helper to get or create trespassing info for an event
  const getOrCreate = (eventId: string): TrespassingInfo => {
    if (!trespassingMap.has(eventId)) {
      trespassingMap.set(eventId, {
        eventId,
        trespassingStart: false,
        trespassingEnd: false,
      });
    }
    return trespassingMap.get(eventId)!;
  };

  // Sort by start time, then by end time (longer events first for same start)
  const sorted = [...intervals].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    // For same start time, put longer events first
    return b.end.getTime() - a.end.getTime();
  });

  // Check each pair of events for overlaps with different locations
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const eventA = sorted[i];
      const eventB = sorted[j];

      // Skip if no event IDs (can't track)
      if (!eventA.eventId || !eventB.eventId) continue;

      // Skip if same location or either is null ("everywhere")
      if (
        !eventA.locationId ||
        !eventB.locationId ||
        eventA.locationId === eventB.locationId
      ) {
        continue;
      }

      const aStart = eventA.start.getTime();
      const aEnd = eventA.end.getTime();
      const bStart = eventB.start.getTime();
      const bEnd = eventB.end.getTime();

      // Check for overlaps
      const startsEqual = aStart === bStart;
      const endsEqual = aEnd === bEnd;
      const aContainsB = aStart <= bStart && aEnd >= bEnd;
      const bStartsDuringA = bStart < aEnd && bStart > aStart;
      const aEndsDuringB = aEnd > bStart && aEnd < bEnd;

      // Case: Start times equal - both get red START border
      if (startsEqual) {
        getOrCreate(eventA.eventId).trespassingStart = true;
        getOrCreate(eventB.eventId).trespassingStart = true;
      }

      // Case: End times equal - both get red END border
      if (endsEqual) {
        getOrCreate(eventA.eventId).trespassingEnd = true;
        getOrCreate(eventB.eventId).trespassingEnd = true;
      }

      // Case: B is nested inside A (A contains B completely)
      // B gets both red borders (if not already handled by equal start/end)
      if (aContainsB && !startsEqual && !endsEqual) {
        getOrCreate(eventB.eventId).trespassingStart = true;
        getOrCreate(eventB.eventId).trespassingEnd = true;
      }

      // Case: A ends during B (A infringes on B) - A gets red END border
      // (but not if it's a nesting case already handled)
      if (aEndsDuringB && !startsEqual) {
        getOrCreate(eventA.eventId).trespassingEnd = true;
      }

      // Case: B starts during A (A infringes on B from before)
      // Same as above but checking from B's perspective
      if (bStartsDuringA && !aContainsB) {
        getOrCreate(eventA.eventId).trespassingEnd = true;
      }
    }
  }

  return trespassingMap;
}

/**
 * Find gaps between occupied intervals
 * Returns available time slots with location context from adjacent events
 */
export function findGaps(
  occupiedIntervals: Interval[],
  rangeStart: Date,
  rangeEnd: Date,
): TimeSlot[] {
  if (occupiedIntervals.length === 0) {
    const durationMinutes = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 60000);
    return [
      {
        start: rangeStart,
        end: rangeEnd,
        durationMinutes,
        isAvailable: true,
        prevLocationId: null,
        nextLocationId: null,
      },
    ];
  }

  const merged = mergeIntervals(occupiedIntervals);
  const gaps: TimeSlot[] = [];

  // Check for gap before first interval
  if (merged[0].start > rangeStart) {
    const end = merged[0].start;
    gaps.push({
      start: rangeStart,
      end,
      durationMinutes: Math.floor((end.getTime() - rangeStart.getTime()) / 60000),
      isAvailable: true,
      prevLocationId: null,
      nextLocationId: merged[0].locationId ?? null,
    });
  }

  // Check for gaps between intervals
  for (let i = 0; i < merged.length - 1; i++) {
    const gapStart = merged[i].end;
    const gapEnd = merged[i + 1].start;

    if (gapStart < gapEnd) {
      // Walk backward to find the nearest located event (skip "anywhere" items with null location)
      let prevLoc: string | null = null;
      for (let j = i; j >= 0; j--) {
        if (merged[j].locationId != null) { prevLoc = merged[j].locationId!; break; }
      }

      gaps.push({
        start: gapStart,
        end: gapEnd,
        durationMinutes: Math.floor((gapEnd.getTime() - gapStart.getTime()) / 60000),
        isAvailable: true,
        prevLocationId: prevLoc,
        nextLocationId: merged[i + 1].locationId ?? null,
      });
    }
  }

  // Check for gap after last interval
  const lastInterval = merged[merged.length - 1];
  if (lastInterval.end < rangeEnd) {
    // Walk backward to find the nearest located event
    let prevLoc: string | null = null;
    for (let j = merged.length - 1; j >= 0; j--) {
      if (merged[j].locationId != null) { prevLoc = merged[j].locationId!; break; }
    }

    gaps.push({
      start: lastInterval.end,
      end: rangeEnd,
      durationMinutes: Math.floor((rangeEnd.getTime() - lastInterval.end.getTime()) / 60000),
      isAvailable: true,
      prevLocationId: prevLoc,
      nextLocationId: null,
    });
  }

  return gaps;
}

/**
 * Convert SimpleEvents to Intervals
 * @param events - Events to convert
 * @param plannerLocationMap - Optional map of planner/event ID to location ID
 */
export function eventsToIntervals(
  events: SimpleEvent[],
  plannerLocationMap?: Map<string, string | null>,
): Interval[] {
  return events.map((event) => {
    const locationId = plannerLocationMap?.get(event.id) ?? null;
    return {
      start: new Date(event.start),
      end: new Date(event.end),
      locationId,
    };
  });
}

/**
 * Check if an interval can fit within a gap
 */
export function canFitInGap(
  gap: Interval,
  durationMinutes: number,
  afterTime?: Date,
): boolean {
  const startTime = afterTime && afterTime > gap.start ? afterTime : gap.start;
  const availableMs = gap.end.getTime() - startTime.getTime();
  const requiredMs = durationMinutes * 60 * 1000;
  return availableMs >= requiredMs;
}

/**
 * Find the first gap that can fit a duration
 */
export function findFirstFittingGap(
  gaps: Interval[],
  durationMinutes: number,
  afterTime?: Date,
): Interval | null {
  for (const gap of gaps) {
    if (canFitInGap(gap, durationMinutes, afterTime)) {
      return gap;
    }
  }
  return null;
}

/**
 * Calculate total available minutes in gaps
 */
export function totalAvailableMinutes(gaps: Interval[]): number {
  return gaps.reduce((total, gap) => {
    const minutes = (gap.end.getTime() - gap.start.getTime()) / (1000 * 60);
    return total + minutes;
  }, 0);
}

/**
 * Split a day into hourly intervals for analysis
 */
export function splitIntoHourlyIntervals(
  dayStart: Date,
  dayEnd: Date,
): Interval[] {
  const intervals: Interval[] = [];
  const current = new Date(dayStart);

  while (current < dayEnd) {
    const intervalEnd = new Date(current);
    intervalEnd.setHours(intervalEnd.getHours() + 1);

    intervals.push({
      start: new Date(current),
      end: intervalEnd > dayEnd ? dayEnd : intervalEnd,
    });

    current.setHours(current.getHours() + 1);
  }

  return intervals;
}

/**
 * Find all gaps within a specific day
 */
export function findDailyGaps(
  date: Date,
  occupiedIntervals: Interval[],
): TimeSlot[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Filter intervals that fall within this day
  const dailyIntervals = occupiedIntervals.filter(
    (interval) => interval.start < dayEnd && interval.end > dayStart,
  );

  return findGaps(dailyIntervals, dayStart, dayEnd);
}

/**
 * Get the largest gap in a set of intervals
 */
export function getLargestGap(gaps: Interval[]): Interval | null {
  if (gaps.length === 0) return null;

  return gaps.reduce((largest, current) => {
    const currentSize = current.end.getTime() - current.start.getTime();
    const largestSize = largest.end.getTime() - largest.start.getTime();
    return currentSize > largestSize ? current : largest;
  });
}

/**
 * Calculate the size of the largest gap in minutes
 */
export function getLargestGapMinutes(gaps: Interval[]): number {
  const largest = getLargestGap(gaps);
  if (!largest) return 0;
  return (largest.end.getTime() - largest.start.getTime()) / (1000 * 60);
}


import type { TemplateTimeWithExceptions, TemplateDayDef, PerTemplateMask } from "../models/TemplateModels";
export type { TemplateTimeWithExceptions, TemplateDayDef, PerTemplateMask };

/**
 * Convert PerTemplateMasks to Intervals for a specific date
 * Directly uses mask data without creating SimpleEvent objects
 */
export function masksToIntervals(
  masks: PerTemplateMask[],
  date: Date,
): Interval[] {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const intervals: Interval[] = [];

  for (const mask of masks) {
    // Find occurrences for this day of week
    const dayDef = mask.occurrences.find((occ) => occ.day === dayOfWeek);
    if (!dayDef) continue;

    for (const time of dayDef.times) {
      // Check if this date is an exception
      const dateISO = date.toISOString().split("T")[0];
      if (time.exceptions?.includes(dateISO)) continue;

      // Parse time strings and create Date objects
      const [startH, startM] = time.startTime.split(":").map(Number);
      const [endH, endM] = time.endTime.split(":").map(Number);

      const start = new Date(date);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(date);
      end.setHours(endH, endM, 0, 0);

      // Handle "24:00" as end of day
      if (time.endTime === "24:00") {
        end.setHours(23, 59, 59, 999);
      }

      intervals.push({
        start,
        end,
        locationId: mask.locationId ?? null,
      });
    }
  }

  return intervals;
}
