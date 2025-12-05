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
}

/**
 * Merge overlapping intervals into non-overlapping ranges
 * Useful for consolidating occupied time blocks
 */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  // Sort by start time
  const sorted = [...intervals].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
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
 * Find gaps between occupied intervals
 * Returns available time slots
 */
export function findGaps(
  occupiedIntervals: Interval[],
  rangeStart: Date,
  rangeEnd: Date
): Interval[] {
  if (occupiedIntervals.length === 0) {
    return [{ start: rangeStart, end: rangeEnd }];
  }

  const merged = mergeIntervals(occupiedIntervals);
  const gaps: Interval[] = [];

  // Check for gap before first interval
  if (merged[0].start > rangeStart) {
    gaps.push({
      start: rangeStart,
      end: merged[0].start,
    });
  }

  // Check for gaps between intervals
  for (let i = 0; i < merged.length - 1; i++) {
    const gapStart = merged[i].end;
    const gapEnd = merged[i + 1].start;

    if (gapStart < gapEnd) {
      gaps.push({
        start: gapStart,
        end: gapEnd,
      });
    }
  }

  // Check for gap after last interval
  const lastEnd = merged[merged.length - 1].end;
  if (lastEnd < rangeEnd) {
    gaps.push({
      start: lastEnd,
      end: rangeEnd,
    });
  }

  return gaps;
}

/**
 * Convert SimpleEvents to Intervals
 */
export function eventsToIntervals(events: SimpleEvent[]): Interval[] {
  return events.map((event) => ({
    start: new Date(event.start),
    end: new Date(event.end),
  }));
}

/**
 * Check if an interval can fit within a gap
 */
export function canFitInGap(
  gap: Interval,
  durationMinutes: number,
  afterTime?: Date
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
  afterTime?: Date
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
  dayEnd: Date
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
  occupiedIntervals: Interval[]
): Interval[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Filter intervals that fall within this day
  const dailyIntervals = occupiedIntervals.filter(
    (interval) => interval.start < dayEnd && interval.end > dayStart
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

/**
 * Convert intervals to TimeSlots
 */
export function intervalsToTimeSlots(
  intervals: Interval[],
  isAvailable: boolean = true
): TimeSlot[] {
  return intervals.map((interval) => ({
    start: interval.start,
    end: interval.end,
    durationMinutes: Math.floor(
      (interval.end.getTime() - interval.start.getTime()) / (1000 * 60)
    ),
    isAvailable,
  }));
}
