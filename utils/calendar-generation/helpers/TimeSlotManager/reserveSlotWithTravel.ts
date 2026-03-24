import { AvailableSlot, OccupiedSlot, TimeSlot, TravelSlot } from "../../models/TimeSlot";
import { ItemType } from "@/types/prisma";
import { isTravelSlot, createTravelSlot } from "../../utils/timeSlotUtils";
import { TravelManager } from "../../core/TravelManager";
import { SCHEDULING_CONFIG } from "../../constants";
import { v4 as uuidv4 } from "uuid";

export function reserveSlotWithTravel(
  availableSlots: AvailableSlot[],
  occupiedSlots: (OccupiedSlot | TravelSlot)[],
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  start: Date,
  end: Date,
  eventId: string,
  eventType: Exclude<ItemType, "travel" | "category">,
  taskLocationId: string | null,
  travelBefore: number,
  travelAfter: number,
  prevLocationId: string | null,
  nextLocationId: string | null,
  reusableTravelStart?: Date | null,
  absorbPrevTravelAfter?: boolean,
  reclaimPrecedingGapTravel?: TravelSlot | null,
): { success: boolean } {
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
            availSlot.start = occ.start;
            availSlot.durationMinutes = Math.floor(
              (availSlot.end.getTime() - availSlot.start.getTime()) / 60000,
            );
            availSlot.prevLocationId = taskLocationId;
            occupiedSlots.splice(i, 1);
            break;
          }
        }
        break;
      }
    }
  }

  if (reclaimPrecedingGapTravel) {
    const gapTravel = reclaimPrecedingGapTravel;
    const gapIdx = occupiedSlots.findIndex((s) => s.eventId === gapTravel.eventId);
    if (gapIdx !== -1) {
      occupiedSlots.splice(gapIdx, 1);
      const expectedSlotStart = gapTravel.end.getTime() + bufferMs;
      const searchWindowMs = bufferMs + 10 * 60 * 1000;
      for (const availSlot of availableSlots) {
        const diff = Math.abs(availSlot.start.getTime() - expectedSlotStart);
        if (diff <= searchWindowMs) {
          availSlot.start = gapTravel.start;
          availSlot.durationMinutes = Math.floor(
            (availSlot.end.getTime() - availSlot.start.getTime()) / 60000,
          );
          availSlot.prevLocationId =
            gapTravel.travelFromLocationId ?? availSlot.prevLocationId;
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
    newSlots.push({
      start: slot.start,
      end: fullStart,
      durationMinutes: Math.floor((fullStart.getTime() - slot.start.getTime()) / 60000),
      isAvailable: true,
      prevLocationId: slot.prevLocationId,
      nextLocationId: taskLocationId ?? slot.nextLocationId,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    });
  }

  let removedTravelAfterEnd: Date | null = null;

  if (travelBefore > 0 && prevLocationId && taskLocationId) {
    const taskStartTime = start.getTime();
    const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

    for (let i = occupiedSlots.length - 1; i >= 0; i--) {
      const occ = occupiedSlots[i];
      if (
        isTravelSlot(occ) &&
        occ.travelToLocationId === taskLocationId
      ) {
        const travelEndTime = occ.end.getTime();
        if (Math.abs(travelEndTime - taskStartTime) < searchWindowMs) {
          removedTravelAfterEnd = new Date(occ.end.getTime());
          occupiedSlots.splice(i, 1);
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
    isAvailable: false,
    eventId,
    eventType,
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
          reclaimedTravelEnd = new Date(occ.end.getTime());
          occupiedSlots.splice(i, 1);
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

  const freeSlotPrevLocation = travelAfterEnd
    ? (nextLocationId ?? taskLocationId ?? slot.prevLocationId)
    : (taskLocationId ?? slot.prevLocationId);

  if (freeSlotEnd.getTime() > freeSlotStart.getTime()) {
    newSlots.push({
      start: freeSlotStart,
      end: freeSlotEnd,
      durationMinutes: Math.floor((freeSlotEnd.getTime() - freeSlotStart.getTime()) / 60000),
      isAvailable: true,
      prevLocationId: freeSlotPrevLocation,
      nextLocationId: slot.nextLocationId,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    });
  }

  if (travelAfter > 0 && nextLocationId && travelAfterStart) {
    const slotEndTime = slot.end.getTime();
    const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

    for (let i = occupiedSlots.length - 1; i >= 0; i--) {
      const occ = occupiedSlots[i];
      if (
        isTravelSlot(occ) &&
        occ.travelToLocationId === nextLocationId &&
        Math.abs(occ.end.getTime() - slotEndTime) < searchWindowMs
      ) {
        occupiedSlots.splice(i, 1);
      }
    }
  }

  if (travelAfter > 0 && travelAfterStart && travelAfterEnd && taskLocationId && nextLocationId) {
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

  availableSlots.splice(slotIndex, 1, ...newSlots.filter((s): s is AvailableSlot => s.isAvailable));
  occupiedSlots.push(
    ...newSlots.filter((s): s is OccupiedSlot | TravelSlot => !s.isAvailable),
  );

  return { success: true };
}
