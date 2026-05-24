import { Slot } from "../../models/TimeSlot";
import {
  findTravelShardSpan,
  type TravelShardSpan,
} from "../../utils/timeSlotUtils";

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

  for (let i = 0; i < slots.length; i++) {
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
