import { PlannerType, EventType } from "@/types/prisma";

type BaseSlot = {
  start: Date;
  end: Date;
  durationMinutes: number;
};

export type AvailableSlot = BaseSlot & {
  isAvailable: true;
  prevLocationId?: string | null;
  nextLocationId?: string | null;
  categoryId?: string | null;
  isStrictCategory?: boolean;
};

export type OccupiedSlot = BaseSlot & {
  isAvailable: false;
  eventId: string;
  plannerType: PlannerType;
  eventType: Exclude<EventType, "travel">;
};

export type TravelSlot = BaseSlot & {
  isAvailable: false;
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

export type TimeSlot = AvailableSlot | OccupiedSlot | TravelSlot;

export interface TimeSlotBlock {
  /** Start of the day */
  date: Date;
  /** All slots for this day */
  slots: TimeSlot[];
  /** Quick lookup for available slots */
  availableSlots: AvailableSlot[];
}
