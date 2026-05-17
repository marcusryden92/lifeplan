import type {
  AvailableSlot,
  TimeSlot,
  TravelSlot,
} from "../models/TimeSlot";
import { PlannerType, EventType } from "@/types/prisma";

export function getDurationMinutes(slot: TimeSlot): number {
  return Math.floor((slot.end.getTime() - slot.start.getTime()) / (1000 * 60));
}

export function canFitDuration(
  slot: TimeSlot,
  requiredMinutes: number,
): boolean {
  return slot.type === "available" && slot.durationMinutes >= requiredMinutes;
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

  if (slot.type === "available") {
    return [
      {
        start: slot.start,
        end: splitTime,
        durationMinutes: beforeDuration,
        type: "available",
        prevLocationId: slot.prevLocationId,
        nextLocationId: slot.nextLocationId,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
      },
      {
        start: splitTime,
        end: slot.end,
        durationMinutes: afterDuration,
        type: "available",
        prevLocationId: slot.prevLocationId,
        nextLocationId: slot.nextLocationId,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
      },
    ];
  }

  if (slot.eventType === EventType.travel) {
    return [
      {
        start: slot.start,
        end: splitTime,
        durationMinutes: beforeDuration,
        type: "travel",
        eventId: slot.eventId,
        eventType: EventType.travel,
        travelFromLocationId: slot.travelFromLocationId,
        travelToLocationId: slot.travelToLocationId,
        travelType: slot.travelType,
        insufficientTravel: slot.insufficientTravel,
        requiredTravelMinutes: slot.requiredTravelMinutes,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
      },
      {
        start: splitTime,
        end: slot.end,
        durationMinutes: afterDuration,
        type: "travel",
        eventId: slot.eventId,
        eventType: EventType.travel,
        travelFromLocationId: slot.travelFromLocationId,
        travelToLocationId: slot.travelToLocationId,
        travelType: slot.travelType,
        insufficientTravel: slot.insufficientTravel,
        requiredTravelMinutes: slot.requiredTravelMinutes,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
      },
    ];
  }

  return [
    {
      start: slot.start,
      end: splitTime,
      durationMinutes: beforeDuration,
      type: "occupied",
      eventId: slot.eventId,
      eventType: slot.eventType,
      plannerType: slot.plannerType,
    },
    {
      start: splitTime,
      end: slot.end,
      durationMinutes: afterDuration,
      type: "occupied",
      eventId: slot.eventId,
      eventType: slot.eventType,
      plannerType: slot.plannerType,
    },
  ];
}

export function occupySlot(
  slot: AvailableSlot,
  start: Date,
  end: Date,
  eventId: string,
  eventType: Exclude<EventType, "travel" | "category">,
  plannerType: PlannerType,
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
      type: "available",
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
    type: "occupied",
    eventId,
    eventType,
    plannerType,
  });

  if (end < slot.end) {
    result.push({
      start: end,
      end: slot.end,
      durationMinutes: Math.floor(
        (slot.end.getTime() - end.getTime()) / (1000 * 60),
      ),
      type: "available",
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
    categoryId?: string | null;
    isStrictCategory?: boolean;
  },
): TravelSlot {
  return {
    start,
    end,
    durationMinutes: Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60),
    ),
    type: "travel",
    eventId,
    eventType: EventType.travel,
    travelType,
    travelFromLocationId: fromLocationId,
    travelToLocationId: toLocationId,
    insufficientTravel: options?.insufficientTravel ?? false,
    requiredTravelMinutes: options?.requiredTravelMinutes ?? 0,
    categoryId: options?.categoryId,
    isStrictCategory: options?.isStrictCategory,
  };
}

export function isTravelSlot(slot: TimeSlot): slot is TravelSlot {
  return slot.type === "travel";
}


export function reclaimTravelSlot(travelSlot: TravelSlot): AvailableSlot {
  return {
    start: travelSlot.start,
    end: travelSlot.end,
    durationMinutes: travelSlot.durationMinutes,
    type: "available",
    prevLocationId: travelSlot.travelFromLocationId,
    nextLocationId: travelSlot.travelToLocationId,
    categoryId: travelSlot.categoryId,
    isStrictCategory: travelSlot.isStrictCategory,
  };
}
