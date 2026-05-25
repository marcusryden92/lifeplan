import { PlaceableSlot, Slot } from "../../models/TimeSlot";
import { Category } from "@/types/prisma";
import { dateTimeService } from "../../utils/dateTimeService";
import { SCHEDULING_CONFIG } from "../../constants";

// Find slots a task could be placed in, given duration + buffer.
//
// Category membership is now encoded directly on the slots:
//   - Constrained task (categoryConstraint provided): only return CategorySlot
//     fragments whose categoryId matches the constraint.
//   - Unconstrained task: skip CategorySlot fragments that are strict (those
//     belong to a category that excludes outsiders); free time and non-strict
//     categories are fair game.
export function findAllFittingSlots(
  slots: Slot[],
  bufferTimeMinutes: number,
  durationMinutes: number,
  afterDate: Date,
  maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH,
  categoryConstraint?: Category,
  placementCutoffDate?: Date | null,
): PlaceableSlot[] {
  const fittingSlots: PlaceableSlot[] = [];
  const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
  const baseRequiredMinutes = durationMinutes + 2 * bufferTimeMinutes;
  const cutoffMs = placementCutoffDate?.getTime();

  for (const slot of slots) {
    if (slot.type !== "available" && slot.type !== "category") continue;
    if (slot.end <= afterDate) continue;
    if (slot.start >= searchEndDate) break;
    // Tail buffer: skip slots whose start is past the placement cutoff. The
    // cutoff is "(last placeable slot end) - PLACEMENT_BUFFER_DAYS", computed
    // per-iteration by scheduleTasksAndGoals.
    if (cutoffMs !== undefined && slot.start.getTime() >= cutoffMs) break;

    if (categoryConstraint) {
      if (
        slot.type !== "category" ||
        slot.categoryId !== categoryConstraint.id
      )
        continue;
    } else if (slot.type === "category" && slot.isStrictCategory) {
      continue;
    }

    const effectiveStart = slot.start < afterDate ? afterDate : slot.start;
    const effectiveMinutes = dateTimeService.getMinutesDifference(
      effectiveStart,
      slot.end,
    );

    if (effectiveMinutes >= baseRequiredMinutes) {
      fittingSlots.push({
        ...slot,
        start: effectiveStart,
        durationMinutes: effectiveMinutes,
      });
    }
  }

  return fittingSlots;
}
