/**
 * Helper functions for category time constraints
 */

import type { CategoryTimeSlot } from "@/types/categoryTypes";

/**
 * Helper to parse timeSlots JSON from Prisma
 */
export function parseCategoryTimeSlots(
  timeSlotsJson: unknown
): CategoryTimeSlot[] | null {
  if (!timeSlotsJson) return null;

  try {
    const parsed: unknown =
      typeof timeSlotsJson === "string"
        ? JSON.parse(timeSlotsJson)
        : timeSlotsJson;

    if (!Array.isArray(parsed)) return null;

    return parsed.filter((slot: unknown): slot is CategoryTimeSlot => {
      if (typeof slot !== "object" || slot === null) return false;
      const s = slot as Record<string, unknown>;
      return (
        Array.isArray(s.days) &&
        typeof s.startTime === "string" &&
        typeof s.endTime === "string"
      );
    });
  } catch {
    return null;
  }
}
