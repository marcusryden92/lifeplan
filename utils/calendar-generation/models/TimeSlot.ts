export interface TimeSlot {
  /** Start time of the slot */
  start: Date;
  /** End time of the slot */
  end: Date;
  /** Duration in minutes */
  durationMinutes: number;
  /** Whether this slot is available for scheduling */
  isAvailable: boolean;
  /** ID of the event occupying this slot (if any) */
  eventId?: string;
  /** Type of event occupying this slot (if any) */
  eventType?: "task" | "goal" | "plan" | "template" | "travel";
  /** Location ID of the event immediately before this slot (null if none or unknown) */
  prevLocationId?: string | null;
  /** Location ID of the event immediately after this slot (null if none or unknown) */
  nextLocationId?: string | null;
  /** For travel slots: the location ID of the task this travel is associated with */
  travelFromLocationId?: string | null;
  /** For travel slots: the destination location ID */
  travelToLocationId?: string | null;
  /** For travel slots: discriminates between preliminary (first-pass), inbound (before task), and outbound (after task) */
  travelType?: "preliminary" | "inbound" | "outbound";
  /** For travel slots: true if actual travel time is less than required */
  insufficientTravel?: boolean;
  /** For travel slots: the original required travel time in minutes */
  requiredTravelMinutes?: number;
  /** Category that owns this time window, null if uncategorized free time */
  categoryId?: string | null;
  /** Whether this slot belongs to a strict category (blocks uncategorized tasks) */
  isStrictCategory?: boolean;
}

export interface TimeSlotBlock {
  /** Start of the day */
  date: Date;
  /** All slots for this day */
  slots: TimeSlot[];
  /** Quick lookup for available slots */
  availableSlots: TimeSlot[];
}
