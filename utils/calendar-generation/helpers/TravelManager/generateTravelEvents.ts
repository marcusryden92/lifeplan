import { SimpleEvent, EventType } from "@/types/prisma";
import { Slot, TravelSlot } from "../../models/TimeSlot";
import { getAllTravelSlots } from "./getAllTravelSlots";

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

export function generateTravelEvents(
  slots: Slot[],
  userId: string,
): SimpleEvent[] {
  const travelSlots = mergeShardsIntoLogicalTravels(getAllTravelSlots(slots));
  const now = new Date();

  return travelSlots.map((slot: TravelSlot) => {
    // Color priority: insufficient (red) outranks overconstrained (yellow);
    // a travel that's both gets the red treatment since the harder failure
    // wins. Default grey for clean placements.
    let backgroundColor = "#9CA3AF";
    let borderColor = "#6B7280";
    if (slot.insufficientTravel) {
      backgroundColor = "#F87171";
      borderColor = "#DC2626";
    } else if (slot.overconstrained) {
      backgroundColor = "#FDE68A";
      borderColor = "#D97706";
    }

    return {
      userId,
      id: slot.eventId,
      title: `Travel_${slot.travelFromLocationId ?? "unknown"}_${slot.travelToLocationId ?? "unknown"}`,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      backgroundColor,
      borderColor,
      duration: null,
      rrule: null,
      extendedProps: {
        id: slot.eventId,
        eventId: slot.eventId,
        PlannerType: null,
        eventType: EventType.travel,
        parentId: null,
        completedEndTime: null,
        completedStartTime: null,
        fromLocationId: slot.travelFromLocationId,
        toLocationId: slot.travelToLocationId,
        travelMinutes: slot.durationMinutes,
        insufficientTravel: slot.insufficientTravel,
        overconstrained: slot.overconstrained ?? false,
        requiredTravelMinutes:
          slot.requiredTravelMinutes > 0 ? slot.requiredTravelMinutes : null,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    } as unknown as SimpleEvent;
  });
}
