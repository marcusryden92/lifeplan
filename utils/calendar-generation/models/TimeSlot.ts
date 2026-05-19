import { PlannerType, EventType } from "@/types/prisma";

type BaseSlot = {
  start: Date;
  end: Date;
  durationMinutes: number;
};

export type SlotType = "available" | "category" | "occupied" | "travel";

export type AvailableSlot = BaseSlot & {
  type: "available";
  prevLocationId?: string | null;
  nextLocationId?: string | null;
};

export type CategorySlot = BaseSlot & {
  type: "category";
  currentLocationId: string | null;
  prevLocationId: string | null;
  nextLocationId: string | null;
  categoryId: string;
  isStrictCategory: boolean;
  // Set by the travel pass when travel into/out of this category would have
  // fully consumed the slot's interior. The wrapper event's top/bottom border
  // is stamped red downstream; no visible travel slot is emitted.
  trespassingStart?: boolean;
  trespassingEnd?: boolean;
};

export type OccupiedSlot = BaseSlot & {
  type: "occupied";
  eventId: string;
  plannerType: PlannerType;
  eventType: Exclude<EventType, "travel">;
};

export type TravelSlot = BaseSlot & {
  type: "travel";
  eventId: string;
  eventType: Extract<EventType, "travel">;
  travelFromLocationId: string | null;
  travelToLocationId: string | null;
  travelType: "preliminary" | "inbound" | "outbound";
  insufficientTravel: boolean;
  requiredTravelMinutes: number;
  categoryId?: string | null;
  isStrictCategory?: boolean;
};

export type Slot = AvailableSlot | CategorySlot | OccupiedSlot | TravelSlot;
export type TimeSlot = Slot;

// Slots that a task can land in — free time or category interior.
export type PlaceableSlot = AvailableSlot | CategorySlot;

export interface TimeSlotBlock {
  /** Start of the day */
  date: Date;
  /** All slots for this day */
  slots: TimeSlot[];
  /** Quick lookup for available slots */
  availableSlots: AvailableSlot[];
}
