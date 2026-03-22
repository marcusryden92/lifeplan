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
  createdAt: string;
  updatedAt: string;
}

/**
 * A processed category constraint used by the scheduling engine
 */
export interface CategoryConstraint {
  id: string;
  name: string;
  color?: string | null;
  timeSlots: CategoryTimeSlot[];
  isStrict: boolean;
  locationId?: string | null;
}

/**
 * A concrete category time period expanded from a CategoryConstraint's time slot rules
 */
export interface CategoryPeriod {
  start: Date;
  end: Date;
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  locationId: string | null;
  isStrict: boolean;
}

/**
 * Helper to parse timeSlots JSON from Prisma
 */
export function parseCategoryTimeSlots(
  timeSlotsJson: unknown
): CategoryTimeSlot[] | null;
