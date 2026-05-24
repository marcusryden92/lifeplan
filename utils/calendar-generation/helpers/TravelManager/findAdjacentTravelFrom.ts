import { Slot } from "../../models/TimeSlot";
import {
  findTravelShardSpan,
  type TravelShardSpan,
} from "../../utils/timeSlotUtils";

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

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (
      slot.type === "travel" &&
      slot.travelFromLocationId === fromLocationId &&
      slot.travelType === "outbound" &&
      Math.abs(slot.end.getTime() - nearTime.getTime()) <= searchWindowMs
    ) {
      return findTravelShardSpan(slots, i);
    }
  }

  return null;
}
