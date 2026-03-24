import type { AvailableSlot, TimeSlot, TravelSlot } from "../models/TimeSlot";

export function getDurationMinutes(slot: TimeSlot): number {
  return Math.floor((slot.end.getTime() - slot.start.getTime()) / (1000 * 60));
}

export function canFitDuration(
  slot: TimeSlot,
  requiredMinutes: number,
): boolean {
  return slot.isAvailable && slot.durationMinutes >= requiredMinutes;
}

export function doSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return slot1.start < slot2.end && slot2.start < slot1.end;
}

export function splitSlot(
  slot: TimeSlot,
  splitTime: Date,
): [TimeSlot | null, TimeSlot | null] {
  if (splitTime <= slot.start || splitTime >= slot.end) {
    return [slot, null];
  }

  const beforeDuration = Math.floor(
    (splitTime.getTime() - slot.start.getTime()) / (1000 * 60),
  );
  const afterDuration = Math.floor(
    (slot.end.getTime() - splitTime.getTime()) / (1000 * 60),
  );

  if (slot.isAvailable) {
    return [
      {
        start: slot.start,
        end: splitTime,
        durationMinutes: beforeDuration,
        isAvailable: true,
        prevLocationId: slot.prevLocationId,
        nextLocationId: slot.nextLocationId,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
      },
      {
        start: splitTime,
        end: slot.end,
        durationMinutes: afterDuration,
        isAvailable: true,
        prevLocationId: slot.prevLocationId,
        nextLocationId: slot.nextLocationId,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
      },
    ];
  }

  if (slot.eventType === "travel") {
    return [
      {
        start: slot.start,
        end: splitTime,
        durationMinutes: beforeDuration,
        isAvailable: false,
        eventId: slot.eventId,
        eventType: "travel",
        travelFromLocationId: slot.travelFromLocationId,
        travelToLocationId: slot.travelToLocationId,
        travelType: slot.travelType,
        insufficientTravel: slot.insufficientTravel,
        requiredTravelMinutes: slot.requiredTravelMinutes,
      },
      {
        start: splitTime,
        end: slot.end,
        durationMinutes: afterDuration,
        isAvailable: false,
        eventId: slot.eventId,
        eventType: "travel",
        travelFromLocationId: slot.travelFromLocationId,
        travelToLocationId: slot.travelToLocationId,
        travelType: slot.travelType,
        insufficientTravel: slot.insufficientTravel,
        requiredTravelMinutes: slot.requiredTravelMinutes,
      },
    ];
  }

  return [
    {
      start: slot.start,
      end: splitTime,
      durationMinutes: beforeDuration,
      isAvailable: false,
      eventId: slot.eventId,
      eventType: slot.eventType,
    },
    {
      start: splitTime,
      end: slot.end,
      durationMinutes: afterDuration,
      isAvailable: false,
      eventId: slot.eventId,
      eventType: slot.eventType,
    },
  ];
}

export function occupySlot(
  slot: AvailableSlot,
  start: Date,
  end: Date,
  eventId: string,
  eventType: "task" | "goal" | "plan" | "template",
  locationId?: string | null,
): TimeSlot[] {
  const result: TimeSlot[] = [];

  const afterSlotPrevLocation = locationId ?? slot.prevLocationId;

  if (start > slot.start) {
    result.push({
      start: slot.start,
      end: start,
      durationMinutes: Math.floor(
        (start.getTime() - slot.start.getTime()) / (1000 * 60),
      ),
      isAvailable: true,
      prevLocationId: slot.prevLocationId,
      nextLocationId: locationId ?? null,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    });
  }

  result.push({
    start,
    end,
    durationMinutes: Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60),
    ),
    isAvailable: false,
    eventId,
    eventType,
  });

  if (end < slot.end) {
    result.push({
      start: end,
      end: slot.end,
      durationMinutes: Math.floor(
        (slot.end.getTime() - end.getTime()) / (1000 * 60),
      ),
      isAvailable: true,
      prevLocationId: afterSlotPrevLocation,
      nextLocationId: slot.nextLocationId,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    });
  }

  return result;
}

export function createTravelSlot(
  start: Date,
  end: Date,
  fromLocationId: string,
  toLocationId: string,
  travelType: "preliminary" | "inbound" | "outbound",
  eventId: string,
  options?: {
    insufficientTravel?: boolean;
    requiredTravelMinutes?: number;
  },
): TravelSlot {
  return {
    start,
    end,
    durationMinutes: Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60),
    ),
    isAvailable: false,
    eventId,
    eventType: "travel",
    travelType,
    travelFromLocationId: fromLocationId,
    travelToLocationId: toLocationId,
    insufficientTravel: options?.insufficientTravel ?? false,
    requiredTravelMinutes: options?.requiredTravelMinutes ?? 0,
  };
}

export function isTravelSlot(slot: TimeSlot): slot is TravelSlot {
  return !slot.isAvailable && slot.eventType === "travel";
}

export function reclaimTravelSlot(travelSlot: TravelSlot): AvailableSlot {
  return {
    start: travelSlot.start,
    end: travelSlot.end,
    durationMinutes: travelSlot.durationMinutes,
    isAvailable: true,
    prevLocationId: travelSlot.travelFromLocationId,
    nextLocationId: travelSlot.travelToLocationId,
  };
}
