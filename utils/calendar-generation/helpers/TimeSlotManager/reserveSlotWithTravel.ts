import {
  AvailableSlot,
  CategorySlot,
  OccupiedSlot,
  Slot,
  TimeSlot,
  TravelSlot,
} from "../../models/TimeSlot";
import { EventType, PlannerType } from "@/types/prisma";
import { isTravelSlot, createTravelSlot } from "../../utils/timeSlotUtils";
import type { TravelShardSpan } from "../../utils/timeSlotUtils";
import { SCHEDULING_CONFIG } from "../../constants";
import { v4 as uuidv4 } from "uuid";

// Remove every shard belonging to a logical travel (identified by travelId)
// from a local filtered view. Returns the span's aggregate start/end so
// callers can recompute the freed-up region. Use this anywhere the
// scheduler "absorbs" or "reclaims" travel — splice(i, 1) only removes one
// shard of a multi-shard span and leaves the rest orphaned.
function removeTravelShards(
  list: (OccupiedSlot | TravelSlot)[],
  travelId: string,
): { spanStart: Date; spanEnd: Date } | null {
  let spanStart: Date | null = null;
  let spanEnd: Date | null = null;
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (s.type !== "travel") continue;
    const key = s.travelId ?? s.eventId;
    if (key !== travelId) continue;
    if (!spanEnd || s.end.getTime() > spanEnd.getTime()) spanEnd = s.end;
    if (!spanStart || s.start.getTime() < spanStart.getTime())
      spanStart = s.start;
    list.splice(i, 1);
  }
  return spanStart && spanEnd ? { spanStart, spanEnd } : null;
}

type PlaceableSlot = AvailableSlot | CategorySlot;

// Build a leftover fragment after a task carves out the middle of a placeable
// slot. Category leftovers keep their currentLocationId / categoryId so the
// dispatcher still sees the fragment as inside the category.
function makeLeftover(
  source: PlaceableSlot,
  start: Date,
  end: Date,
  prevLocationId: string | null,
  nextLocationId: string | null,
): PlaceableSlot {
  const durationMinutes = Math.floor(
    (end.getTime() - start.getTime()) / 60000,
  );
  if (source.type === "category") {
    return {
      start,
      end,
      durationMinutes,
      type: "category",
      currentLocationId: source.currentLocationId,
      prevLocationId,
      nextLocationId,
      categoryId: source.categoryId,
      isStrictCategory: source.isStrictCategory,
      trespassingStart:
        start.getTime() === source.start.getTime()
          ? source.trespassingStart
          : undefined,
      trespassingEnd:
        end.getTime() === source.end.getTime()
          ? source.trespassingEnd
          : undefined,
      isFinal:
        end.getTime() === source.end.getTime() ? source.isFinal : undefined,
    };
  }
  return {
    start,
    end,
    durationMinutes,
    type: "available",
    prevLocationId,
    nextLocationId,
  };
}

export function reserveSlotWithTravel(
  slots: Slot[],
  bufferTimeMinutes: number,
  start: Date,
  end: Date,
  eventId: string,
  plannerType: PlannerType,
  taskLocationId: string | null,
  travelBefore: number,
  travelAfter: number,
  prevLocationId: string | null,
  nextLocationId: string | null,
  reusableTravelStart?: Date | null,
  absorbPrevTravelAfter?: boolean,
  reclaimPrecedingGapTravel?: TravelShardSpan | null,
): { success: boolean } {
  // Operate on local typed views of the unified slots array. Items are shared
  // by reference, so in-place mutations propagate; only structural changes
  // (splice/push) need a merge step at the end.
  const availableSlots: PlaceableSlot[] = slots.filter(
    (s): s is PlaceableSlot => s.type === "available" || s.type === "category",
  );
  const occupiedSlots: (OccupiedSlot | TravelSlot)[] = slots.filter(
    (s): s is OccupiedSlot | TravelSlot =>
      s.type === "occupied" || s.type === "travel",
  );

  const bufferMs = bufferTimeMinutes * 60000;

  if (absorbPrevTravelAfter && taskLocationId) {
    const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;
    for (let i = occupiedSlots.length - 1; i >= 0; i--) {
      const occ = occupiedSlots[i];
      if (
        isTravelSlot(occ) &&
        occ.travelFromLocationId === taskLocationId &&
        occ.travelType === "outbound"
      ) {
        const travelEndTime = occ.end.getTime();
        for (const availSlot of availableSlots) {
          const timeDiff = Math.abs(availSlot.start.getTime() - travelEndTime);
          if (timeDiff <= searchWindowMs) {
            // Remove the entire multi-shard span, not just the matched
            // shard, then extend availSlot back to the span's true start.
            const travelId = occ.travelId ?? occ.eventId;
            const removed = removeTravelShards(occupiedSlots, travelId);
            if (removed) {
              availSlot.start = removed.spanStart;
              availSlot.durationMinutes = Math.floor(
                (availSlot.end.getTime() - availSlot.start.getTime()) / 60000,
              );
              availSlot.prevLocationId = taskLocationId;
            }
            break;
          }
        }
        break;
      }
    }
  }

  if (reclaimPrecedingGapTravel) {
    const gapSpan = reclaimPrecedingGapTravel;
    // Remove every shard of the gap travel (it's a multi-shard span by
    // travelId). Findindex-by-eventId would only catch the first.
    const removed = removeTravelShards(occupiedSlots, gapSpan.travelId);
    if (removed) {
      const expectedSlotStart = removed.spanEnd.getTime() + bufferMs;
      const searchWindowMs = bufferMs + 10 * 60 * 1000;
      for (const availSlot of availableSlots) {
        const diff = Math.abs(availSlot.start.getTime() - expectedSlotStart);
        if (diff <= searchWindowMs) {
          availSlot.start = removed.spanStart;
          availSlot.durationMinutes = Math.floor(
            (availSlot.end.getTime() - availSlot.start.getTime()) / 60000,
          );
          availSlot.prevLocationId =
            gapSpan.travelFromLocationId ?? availSlot.prevLocationId;
          break;
        }
      }
    }
  }

  const travelBeforeEnd =
    travelBefore > 0 ? new Date(start.getTime() - bufferMs) : start;
  const travelBeforeStart =
    travelBefore > 0
      ? new Date(travelBeforeEnd.getTime() - travelBefore * 60000)
      : start;

  const fullStart = travelBefore > 0 ? travelBeforeStart : start;
  const taskReserveEnd = new Date(end.getTime() + bufferMs);

  const slotIndex = availableSlots.findIndex(
    (slot) =>
      slot.start.getTime() <= fullStart.getTime() &&
      slot.end.getTime() >= taskReserveEnd.getTime(),
  );

  if (slotIndex === -1) {
    return { success: false };
  }

  const slot = availableSlots[slotIndex];
  const newSlots: TimeSlot[] = [];

  let travelAfterEnd: Date | null = null;
  let travelAfterStart: Date | null = null;

  if (travelAfter > 0 && nextLocationId) {
    travelAfterStart = new Date(end.getTime() + bufferMs);
    travelAfterEnd = new Date(travelAfterStart.getTime() + travelAfter * 60000);
  }

  if (fullStart.getTime() > slot.start.getTime()) {
    newSlots.push(
      makeLeftover(
        slot,
        slot.start,
        fullStart,
        slot.prevLocationId ?? null,
        taskLocationId ?? slot.nextLocationId ?? null,
      ),
    );
  }

  let removedTravelAfterEnd: Date | null = null;

  if (travelBefore > 0 && prevLocationId && taskLocationId) {
    const taskStartTime = start.getTime();
    const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

    // Find every pre-existing inbound travel (across distinct multi-shard
    // spans) whose end sits near the task start, then remove each span
    // wholesale. Iterate via while-restart since each removal mutates the
    // list; in practice only one span matches in normal flow.
    let madeProgress = true;
    while (madeProgress) {
      madeProgress = false;
      for (const occ of occupiedSlots) {
        if (!isTravelSlot(occ)) continue;
        if (occ.travelToLocationId !== taskLocationId) continue;
        if (Math.abs(occ.end.getTime() - taskStartTime) >= searchWindowMs)
          continue;
        const travelId = occ.travelId ?? occ.eventId;
        if (!travelId) continue;
        const removed = removeTravelShards(occupiedSlots, travelId);
        if (removed) {
          if (
            !removedTravelAfterEnd ||
            removed.spanEnd.getTime() > removedTravelAfterEnd.getTime()
          ) {
            removedTravelAfterEnd = removed.spanEnd;
          }
          madeProgress = true;
          break;
        }
      }
    }

    newSlots.push(
      createTravelSlot(
        travelBeforeStart,
        travelBeforeEnd,
        prevLocationId,
        taskLocationId,
        "inbound",
        uuidv4(),
      ),
    );
  }

  newSlots.push({
    start,
    end,
    durationMinutes: Math.floor((end.getTime() - start.getTime()) / 60000),
    type: "occupied",
    eventId,
    plannerType,
    eventType: EventType.planner,
  });

  let reclaimedTravelEnd: Date | null = null;
  if (
    travelAfter === 0 &&
    taskLocationId &&
    nextLocationId &&
    taskLocationId === nextLocationId
  ) {
    const slotEndTime = slot.end.getTime();
    const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

    for (let i = occupiedSlots.length - 1; i >= 0; i--) {
      const occ = occupiedSlots[i];
      if (
        isTravelSlot(occ) &&
        occ.travelToLocationId === nextLocationId &&
        occ.travelType === "preliminary"
      ) {
        const travelEndTime = occ.end.getTime();
        if (
          travelEndTime > slotEndTime &&
          travelEndTime - slotEndTime < searchWindowMs
        ) {
          // Remove the whole multi-shard span so reclaimedTravelEnd
          // reflects the logical travel's true end, not just the first
          // matched shard's.
          const travelId = occ.travelId ?? occ.eventId;
          const removed = removeTravelShards(occupiedSlots, travelId);
          if (removed) {
            reclaimedTravelEnd = removed.spanEnd;
          }
          break;
        }
      }
    }
  }

  let freeSlotStart: Date;
  if (travelAfterEnd) {
    freeSlotStart = travelAfterEnd;
  } else {
    freeSlotStart = end;
  }

  let freeSlotEnd: Date;
  if (reclaimedTravelEnd) {
    freeSlotEnd = reclaimedTravelEnd;
  } else if (removedTravelAfterEnd) {
    freeSlotEnd = removedTravelAfterEnd;
  } else if (reusableTravelStart) {
    freeSlotEnd = reusableTravelStart;
  } else {
    freeSlotEnd = slot.end;
  }

  const freeSlotPrevLocation: string | null = travelAfterEnd
    ? (nextLocationId ?? taskLocationId ?? slot.prevLocationId ?? null)
    : (taskLocationId ?? slot.prevLocationId ?? null);

  if (freeSlotEnd.getTime() > freeSlotStart.getTime()) {
    newSlots.push(
      makeLeftover(
        slot,
        freeSlotStart,
        freeSlotEnd,
        freeSlotPrevLocation,
        slot.nextLocationId ?? null,
      ),
    );
  }

  if (travelAfter > 0 && nextLocationId && travelAfterStart) {
    const slotEndTime = slot.end.getTime();
    const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

    // Remove every pre-existing outbound travel to nextLocationId whose
    // end sits near the slot's end. Same while-restart pattern as the
    // inbound cleanup above — handles distinct multi-shard spans.
    let madeProgress = true;
    while (madeProgress) {
      madeProgress = false;
      for (const occ of occupiedSlots) {
        if (!isTravelSlot(occ)) continue;
        if (occ.travelToLocationId !== nextLocationId) continue;
        if (Math.abs(occ.end.getTime() - slotEndTime) >= searchWindowMs)
          continue;
        const travelId = occ.travelId ?? occ.eventId;
        if (!travelId) continue;
        if (removeTravelShards(occupiedSlots, travelId)) {
          madeProgress = true;
          break;
        }
      }
    }
  }

  if (
    travelAfter > 0 &&
    travelAfterStart &&
    travelAfterEnd &&
    taskLocationId &&
    nextLocationId
  ) {
    newSlots.push(
      createTravelSlot(
        travelAfterStart,
        travelAfterEnd,
        taskLocationId,
        nextLocationId,
        "outbound",
        uuidv4(),
      ),
    );
  }

  availableSlots.splice(
    slotIndex,
    1,
    ...newSlots.filter(
      (s): s is PlaceableSlot => s.type === "available" || s.type === "category",
    ),
  );
  occupiedSlots.push(
    ...newSlots.filter(
      (s): s is OccupiedSlot | TravelSlot =>
        s.type === "occupied" || s.type === "travel",
    ),
  );

  // Merge local views back into the unified slots array.
  slots.length = 0;
  const merged: Slot[] = [];
  merged.push(...availableSlots, ...occupiedSlots);
  merged.sort((a, b) => a.start.getTime() - b.start.getTime());
  slots.push(...merged);

  return { success: true };
}
