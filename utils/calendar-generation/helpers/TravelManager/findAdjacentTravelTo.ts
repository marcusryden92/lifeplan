import { Slot } from "../../models/TimeSlot";
import {
  findTravelShardSpan,
  type TravelShardSpan,
} from "../../utils/timeSlotUtils";

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

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (
      slot.type === "travel" &&
      slot.travelToLocationId === toLocationId &&
      Math.abs(slot.start.getTime() - nearTime.getTime()) <= searchWindowMs
    ) {
      return findTravelShardSpan(slots, i);
    }
  }

  return null;
}
