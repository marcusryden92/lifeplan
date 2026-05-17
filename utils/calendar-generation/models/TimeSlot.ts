import { PlannerType, EventType } from "@/types/prisma";

type BaseSlot = {
  start: Date;
  end: Date;
  durationMinutes: number;
};

export type SlotType = "available" | "occupied" | "travel";

export type AvailableSlot = BaseSlot & {
  type: "available";
  prevLocationId?: string | null;
  nextLocationId?: string | null;
  categoryId?: string | null;
  isStrictCategory?: boolean;
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

export type Slot = AvailableSlot | OccupiedSlot | TravelSlot;
export type TimeSlot = Slot;

export interface TimeSlotBlock {
  /** Start of the day */
  date: Date;
  /** All slots for this day */
  slots: TimeSlot[];
  /** Quick lookup for available slots */
  availableSlots: AvailableSlot[];
}
