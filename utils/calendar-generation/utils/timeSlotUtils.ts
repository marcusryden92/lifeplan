import type {
  AvailableSlot,
  CategorySlot,
  PlaceableSlot,
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
  return (
    (slot.type === "available" || slot.type === "category") &&
    slot.durationMinutes >= requiredMinutes
  );
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
      },
      {
        start: splitTime,
        end: slot.end,
        durationMinutes: afterDuration,
        type: "available",
        prevLocationId: slot.prevLocationId,
        nextLocationId: slot.nextLocationId,
      },
    ];
  }

  if (slot.type === "category") {
    return [
      {
        start: slot.start,
        end: splitTime,
        durationMinutes: beforeDuration,
        type: "category",
        currentLocationId: slot.currentLocationId,
        prevLocationId: slot.prevLocationId,
        nextLocationId: slot.nextLocationId,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
        trespassingStart: slot.trespassingStart,
      },
      {
        start: splitTime,
        end: slot.end,
        durationMinutes: afterDuration,
        type: "category",
        currentLocationId: slot.currentLocationId,
        prevLocationId: slot.prevLocationId,
        nextLocationId: slot.nextLocationId,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
        trespassingEnd: slot.trespassingEnd,
        isFinal: slot.isFinal,
      },
    ];
  }

  if (slot.type === "travel") {
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

// Slice an occupied event out of a placeable slot, preserving the slot's
// type (available vs. category) on the surrounding leftovers. Category
// leftovers keep currentLocationId / categoryId so the dispatcher still sees
// them as inside the category.
export function occupySlot(
  slot: PlaceableSlot,
  start: Date,
  end: Date,
  eventId: string,
  eventType: Exclude<EventType, "travel" | "category">,
  plannerType: PlannerType,
  locationId?: string | null,
): TimeSlot[] {
  const result: TimeSlot[] = [];

  const afterSlotPrevLocation = locationId ?? slot.prevLocationId ?? null;

  if (start > slot.start) {
    result.push(
      makePlaceableLeftover(
        slot,
        slot.start,
        start,
        slot.prevLocationId ?? null,
        locationId ?? null,
      ),
    );
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
    result.push(
      makePlaceableLeftover(
        slot,
        end,
        slot.end,
        afterSlotPrevLocation,
        slot.nextLocationId ?? null,
      ),
    );
  }

  return result;
}

function makePlaceableLeftover(
  source: PlaceableSlot,
  start: Date,
  end: Date,
  prevLocationId: string | null,
  nextLocationId: string | null,
): AvailableSlot | CategorySlot {
  const durationMinutes = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60),
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
      // Boundary flags only carry over to the fragment that still touches
      // the original boundary.
      trespassingStart:
        start.getTime() === source.start.getTime()
          ? source.trespassingStart
          : undefined,
      trespassingEnd:
        end.getTime() === source.end.getTime()
          ? source.trespassingEnd
          : undefined,
      // isFinal applies to whichever fragment still ends at the original
      // slot's end — that's the "tail" piece of a slot at the array's end.
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

export function createTravelSlot(
  start: Date,
  end: Date,
  fromLocationId: string | null,
  toLocationId: string | null,
  travelType: "preliminary" | "inbound" | "outbound",
  eventId: string,
  options?: {
    insufficientTravel?: boolean;
    requiredTravelMinutes?: number;
    overconstrained?: boolean;
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
    overconstrained: options?.overconstrained,
    categoryId: options?.categoryId,
    isStrictCategory: options?.isStrictCategory,
  };
}

export function isTravelSlot(slot: TimeSlot): slot is TravelSlot {
  return slot.type === "travel";
}

// Convert a travel slot back to its placeable form. If the travel was carved
// out of a category interior, the reclaimed slot stays a CategorySlot so the
// dispatcher's category-edge logic remains consistent.
export function reclaimTravelSlot(
  travelSlot: TravelSlot,
): AvailableSlot | CategorySlot {
  if (travelSlot.categoryId) {
    return {
      start: travelSlot.start,
      end: travelSlot.end,
      durationMinutes: travelSlot.durationMinutes,
      type: "category",
      currentLocationId: null,
      prevLocationId: travelSlot.travelFromLocationId,
      nextLocationId: travelSlot.travelToLocationId,
      categoryId: travelSlot.categoryId,
      isStrictCategory: travelSlot.isStrictCategory ?? false,
    };
  }
  return {
    start: travelSlot.start,
    end: travelSlot.end,
    durationMinutes: travelSlot.durationMinutes,
    type: "available",
    prevLocationId: travelSlot.travelFromLocationId,
    nextLocationId: travelSlot.travelToLocationId,
  };
}
