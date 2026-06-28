import { TravelEvent } from "@/types/prisma";
import { Slot, TravelSlot } from "../../models/TimeSlot";

// Merge shards of one logical travel into a single rendered event. Shards
// share a travelId and are contiguous in the slot array; we collapse them
// here so downstream renders one block per logical travel.
function mergeShardsIntoLogicalTravels(travelSlots: TravelSlot[]): TravelSlot[] {
  if (travelSlots.length === 0) return [];
  // Sort by start so contiguous shards from the same travelId end up adjacent.
  const sorted = [...travelSlots].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const merged: TravelSlot[] = [];
  for (const shard of sorted) {
    const key = shard.travelId ?? shard.eventId;
    const last = merged[merged.length - 1];
    const lastKey = last && (last.travelId ?? last.eventId);
    if (
      last &&
      lastKey === key &&
      last.end.getTime() === shard.start.getTime()
    ) {
      // Extend the in-flight merged entry. Markers OR across shards.
      last.end = shard.end;
      last.durationMinutes = Math.floor(
        (last.end.getTime() - last.start.getTime()) / 60000,
      );
      last.travelToLocationId = shard.travelToLocationId;
      last.insufficientTravel =
        last.insufficientTravel || shard.insufficientTravel;
      last.overconstrained =
        (last.overconstrained ?? false) || (shard.overconstrained ?? false);
      last.requiredTravelMinutes = Math.max(
        last.requiredTravelMinutes,
        shard.requiredTravelMinutes,
      );
      // Concatenate consumedCategoryIds without duplicates.
      const ids = new Set([
        ...(last.consumedCategoryIds ?? []),
        ...(shard.consumedCategoryIds ?? []),
      ]);
      last.consumedCategoryIds = [...ids];
    } else {
      // Start a new entry — clone so we don't mutate the source shard.
      merged.push({ ...shard });
    }
  }
  return merged;
}

// Produces materialized TravelEvent rows for persistence. Deterministic id
// (`${fromLocationId ?? "anywhere"}-${toLocationId ?? "anywhere"}-${startISO}`)
// keeps the same travel idempotent across regens — unchanged placements diff
// as a no-op; shifted placements produce a destroy + create pair.
export function generateTravelEvents(
  slots: Slot[],
  userId: string,
): TravelEvent[] {
  const travelSlots = mergeShardsIntoLogicalTravels(
    slots.filter((s): s is TravelSlot => s.type === "travel"),
  );
  const now = new Date().toISOString();

  return travelSlots.map((slot: TravelSlot): TravelEvent => {
    const startISO = slot.start.toISOString();
    const fromKey = slot.travelFromLocationId ?? "anywhere";
    const toKey = slot.travelToLocationId ?? "anywhere";

    return {
      id: `${fromKey}-${toKey}-${startISO}`,
      start: startISO,
      end: slot.end.toISOString(),
      fromLocationId: slot.travelFromLocationId,
      toLocationId: slot.travelToLocationId,
      travelMinutes: slot.durationMinutes,
      requiredTravelMinutes:
        slot.requiredTravelMinutes > 0 ? slot.requiredTravelMinutes : null,
      insufficientTravel: slot.insufficientTravel,
      overconstrained: slot.overconstrained ?? false,
      userId,
      createdAt: now,
      updatedAt: now,
    };
  });
}
