import { TimeSlot } from "../../models/TimeSlot";
import { isTravelSlot, createTravelSlot } from "../../utils/timeSlotUtils";
import { TravelManager } from "../../core/TravelManager";
import { dateTimeService } from "../../utils/dateTimeService";
import { SCHEDULING_CONFIG } from "../../constants";
import { v4 as uuidv4 } from "uuid";

export function reserveSlotWithTravel(
  availableSlots: Map<string, TimeSlot[]>,
  occupiedSlots: Map<string, TimeSlot[]>,
  travelManager: TravelManager,
  bufferTimeMinutes: number,
  start: Date,
  end: Date,
  eventId: string,
  eventType: "task" | "goal" | "plan" | "template",
  taskLocationId: string | null,
  travelBefore: number,
  travelAfter: number,
  prevLocationId: string | null,
  nextLocationId: string | null,
  reusableTravelStart?: Date | null,
  absorbPrevTravelAfter?: boolean,
  reclaimPrecedingGapTravel?: TimeSlot | null,
): { success: boolean } {
  const dayKey = dateTimeService.getDayKey(start);
  const slots = availableSlots.get(dayKey);

  if (!slots) {
    return { success: false };
  }

  const bufferMinutes = bufferTimeMinutes;
  const occupied = occupiedSlots.get(dayKey) || [];

  if (absorbPrevTravelAfter && taskLocationId) {
    const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;
    for (let i = occupied.length - 1; i >= 0; i--) {
      const occ = occupied[i];
      if (
        isTravelSlot(occ) &&
        occ.travelFromLocationId === taskLocationId &&
        occ.travelType === "outbound"
      ) {
        const travelEndTime = occ.end.getTime();
        for (const availSlot of slots) {
          if (!availSlot.isAvailable) continue;
          const timeDiff = Math.abs(availSlot.start.getTime() - travelEndTime);
          if (timeDiff <= searchWindowMs) {
            availSlot.start = occ.start;
            availSlot.durationMinutes = Math.floor(
              (availSlot.end.getTime() - availSlot.start.getTime()) / 60000,
            );
            availSlot.prevLocationId = taskLocationId;
            occupied.splice(i, 1);
            break;
          }
        }
        break;
      }
    }
  }

  if (reclaimPrecedingGapTravel) {
    const gapTravel = reclaimPrecedingGapTravel;
    const gapIdx = occupied.findIndex((s) => s.eventId === gapTravel.eventId);
    if (gapIdx !== -1) {
      occupied.splice(gapIdx, 1);
      const expectedSlotStart = gapTravel.end.getTime() + bufferMinutes * 60000;
      const searchWindowMs = bufferMinutes * 60000 + 10 * 60 * 1000;
      for (const availSlot of slots) {
        if (!availSlot.isAvailable) continue;
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
    travelBefore > 0
      ? new Date(start.getTime() - bufferMinutes * 60000)
      : start;
  const travelBeforeStart =
    travelBefore > 0
      ? new Date(travelBeforeEnd.getTime() - travelBefore * 60000)
      : start;

  const fullStart = travelBefore > 0 ? travelBeforeStart : start;

  const taskReserveEnd = new Date(end.getTime() + bufferMinutes * 60000);

  const slotIndex = slots.findIndex(
    (slot) =>
      slot.isAvailable &&
      slot.start.getTime() <= fullStart.getTime() &&
      slot.end.getTime() >= taskReserveEnd.getTime(),
  );

  if (slotIndex === -1) {
    return { success: false };
  }

  const slot = slots[slotIndex];
  const newSlots: TimeSlot[] = [];

  let travelAfterEnd: Date | null = null;
  let travelAfterStart: Date | null = null;

  if (travelAfter > 0 && nextLocationId) {
    travelAfterStart = new Date(
      end.getTime() + bufferMinutes * 60000,
    );
    travelAfterEnd = new Date(
      travelAfterStart.getTime() + travelAfter * 60000,
    );
  }

  if (fullStart.getTime() > slot.start.getTime()) {
    newSlots.push({
      start: slot.start,
      end: fullStart,
      durationMinutes: Math.floor(
        (fullStart.getTime() - slot.start.getTime()) / 60000,
      ),
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

    for (let i = occupied.length - 1; i >= 0; i--) {
      const occ = occupied[i];
      if (
        isTravelSlot(occ) &&
        occ.travelToLocationId === taskLocationId
      ) {
        const travelEndTime = occ.end.getTime();
        const isNearTaskStart =
          Math.abs(travelEndTime - taskStartTime) < searchWindowMs;

        if (isNearTaskStart) {
          removedTravelAfterEnd = new Date(occ.end.getTime());
          occupied.splice(i, 1);
        }
      }
    }

    const travelSlot = createTravelSlot(
      travelBeforeStart,
      travelBeforeEnd,
      prevLocationId,
      taskLocationId,
      "inbound",
      uuidv4(),
    );
    newSlots.push(travelSlot);
  }

  const taskSlot: TimeSlot = {
    start,
    end,
    durationMinutes: Math.floor((end.getTime() - start.getTime()) / 60000),
    isAvailable: false,
    eventId,
    eventType,
    prevLocationId: taskLocationId,
    nextLocationId: taskLocationId,
  };

  let reclaimedTravelEnd: Date | null = null;
  if (
    travelAfter === 0 &&
    taskLocationId &&
    nextLocationId &&
    taskLocationId === nextLocationId
  ) {
    const slotEndTime = slot.end.getTime();
    const searchWindowMs = SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS;

    for (let i = occupied.length - 1; i >= 0; i--) {
      const occ = occupied[i];
      if (
        isTravelSlot(occ) &&
        occ.travelToLocationId === nextLocationId
      ) {
        const isPreCarved = occ.travelType === "preliminary";
        if (!isPreCarved) continue;

        const travelEndTime = occ.end.getTime();
        const meetsCondition =
          travelEndTime > slotEndTime &&
          travelEndTime - slotEndTime < searchWindowMs;
        if (meetsCondition) {
          reclaimedTravelEnd = new Date(occ.end.getTime());
          occupied.splice(i, 1);
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
      durationMinutes: Math.floor(
        (freeSlotEnd.getTime() - freeSlotStart.getTime()) / 60000,
      ),
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

    for (let i = occupied.length - 1; i >= 0; i--) {
      const occ = occupied[i];
      if (isTravelSlot(occ)) {
        const travelEndTime = occ.end.getTime();
        const isNearSlotEnd =
          Math.abs(travelEndTime - slotEndTime) < searchWindowMs;

        if (occ.travelToLocationId === nextLocationId && isNearSlotEnd) {
          occupied.splice(i, 1);
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
    const travelSlot = createTravelSlot(
      travelAfterStart,
      travelAfterEnd,
      taskLocationId,
      nextLocationId,
      "outbound",
      uuidv4(),
    );
    newSlots.push(travelSlot);
  }

  const availableNewSlots = newSlots.filter((s) => s.isAvailable);
  slots.splice(slotIndex, 1, ...availableNewSlots);

  occupied.push(taskSlot);
  occupied.push(...newSlots.filter((s) => !s.isAvailable));
  occupiedSlots.set(dayKey, occupied);

  return { success: true };
}
