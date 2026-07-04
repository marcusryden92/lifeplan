import { Slot } from "../../models/TimeSlot";
import {
  findTravelShardSpan,
  lowerBoundSlotIndexByStart,
  type TravelShardSpan,
} from "../../utils/timeSlotUtils";

// Upper bound on a single travel shard's duration, used to bound the
// binary-searched scan window when matching on slot END times (end = start +
// duration, so start >= windowStart - MAX_TRAVEL_SPAN_MS). Real travel legs
// are priced from the Distance Matrix and never approach this.
const MAX_TRAVEL_SPAN_MS = 24 * 60 * 60 * 1000;

// Locate the outbound travel whose END sits near `nearTime` and whose
// origin matches `fromLocationId`. Returns the FULL multi-shard span (not
// just the matched shard) so callers that absorb or reclaim the travel
// see the whole logical unit — `span.travelEnd` for proximity comparisons,
// `span.travelStart` for the freed-up region's start, etc.
export function findAdjacentTravelFrom(
  slots: Slot[],
  bufferTimeMinutes: number,
  nearTime: Date,
  fromLocationId: string,
): TravelShardSpan | null {
  const searchWindowMs = bufferTimeMinutes * 60000 + 10 * 60 * 1000;
  const nearMs = nearTime.getTime();
  const scanEndMs = nearMs + searchWindowMs;

  for (
    let i = lowerBoundSlotIndexByStart(
      slots,
      nearMs - searchWindowMs - MAX_TRAVEL_SPAN_MS,
    );
    i < slots.length && slots[i].start.getTime() <= scanEndMs;
    i++
  ) {
    const slot = slots[i];
    if (
      slot.type === "travel" &&
      slot.travelFromLocationId === fromLocationId &&
      slot.travelType === "outbound" &&
      Math.abs(slot.end.getTime() - nearMs) <= searchWindowMs
    ) {
      return findTravelShardSpan(slots, i);
    }
  }

  return null;
}

// Locate an inbound travel whose START sits near `nearTime` and whose
// destination matches `toLocationId`. Returns the FULL multi-shard span
// so callers see the logical travel's true start (`span.travelStart`),
// not just the matched shard's start.
export function findAdjacentTravelTo(
  slots: Slot[],
  bufferTimeMinutes: number,
  nearTime: Date,
  toLocationId: string,
): TravelShardSpan | null {
  const searchWindowMs = bufferTimeMinutes * 60000 + 10 * 60 * 1000;
  const nearMs = nearTime.getTime();
  const scanEndMs = nearMs + searchWindowMs;

  for (
    let i = lowerBoundSlotIndexByStart(slots, nearMs - searchWindowMs);
    i < slots.length && slots[i].start.getTime() <= scanEndMs;
    i++
  ) {
    const slot = slots[i];
    if (
      slot.type === "travel" &&
      slot.travelToLocationId === toLocationId &&
      Math.abs(slot.start.getTime() - nearMs) <= searchWindowMs
    ) {
      return findTravelShardSpan(slots, i);
    }
  }

  return null;
}

// Locate a preliminary or outbound travel that ENDS just before slotStart
// (within a buffer-aware tolerance). Returns the FULL multi-shard span so
// reclaim logic sees the logical travel's start and removes all shards
// together — not just the first one found.
export function findPrecedingGapTravel(
  slots: Slot[],
  bufferTimeMinutes: number,
  slotStart: Date,
): TravelShardSpan | null {
  const bufferMs = bufferTimeMinutes * 60000;
  const expectedEnd = slotStart.getTime() - bufferMs;
  const toleranceMs = bufferMs + 10 * 60 * 1000;
  const scanEndMs = expectedEnd + toleranceMs;

  for (
    let i = lowerBoundSlotIndexByStart(
      slots,
      expectedEnd - toleranceMs - MAX_TRAVEL_SPAN_MS,
    );
    i < slots.length && slots[i].start.getTime() <= scanEndMs;
    i++
  ) {
    const slot = slots[i];
    if (slot.type !== "travel") continue;
    if (slot.travelType !== "preliminary" && slot.travelType !== "outbound")
      continue;
    if (!slot.travelFromLocationId) continue;
    if (Math.abs(slot.end.getTime() - expectedEnd) <= toleranceMs) {
      return findTravelShardSpan(slots, i);
    }
  }
  return null;
}
