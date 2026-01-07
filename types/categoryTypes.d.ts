/**
 * Type definitions for category time constraints
 */

/**
 * A time slot constraint for a category
 * Represents a recurring time window when category items can be scheduled
 */
export interface CategoryTimeSlot {
  /** Days of the week (0=Sunday, 1=Monday, ... 6=Saturday) */
  days: number[];
  /** Start time in HH:MM format (24-hour) */
  startTime: string;
  /** End time in HH:MM format (24-hour) */
  endTime: string;
}

/**
 * Category with parsed time slots (from JSON)
 */
export interface CategoryWithTimeSlots {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  timeSlots?: CategoryTimeSlot[] | null;
  isStrict: boolean;
  locationId?: string | null;
  parentId?: string | null;
  userId: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper to parse timeSlots JSON from Prisma
 */
export function parseCategoryTimeSlots(
  timeSlotsJson: unknown
): CategoryTimeSlot[] | null;
