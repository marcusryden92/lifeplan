import { PlaceableSlot, Slot } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";
import { SCHEDULING_CONFIG } from "../../constants";

// Find slots a task could be placed in, given duration + buffer.
//
// Category membership is now encoded directly on the slots:
//   - Constrained task (eligibleCategoryIds provided): only return CategorySlot
//     fragments whose categoryId is in the eligible set — the task's own
//     effective category plus any non-confined ancestor whose windows it may
//     cascade into (see buildCategoryEligibilityMap).
//   - Unconstrained task: skip CategorySlot fragments that are strict (those
//     belong to a category that excludes outsiders); free time and non-strict
//     categories are fair game.
export function findAllFittingSlots(
  slots: Slot[],
  bufferTimeMinutes: number,
  durationMinutes: number,
  afterDate: Date,
  maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH,
  eligibleCategoryIds?: Set<string>,
  placementCutoffDate?: Date | null,
): PlaceableSlot[] {
  const fittingSlots: PlaceableSlot[] = [];
  const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
  // Lenient pre-filter: slots need room for the task plus at minimum one
  // trailing buffer. The leading buffer may not be needed (when travel-
  // before is placed standalone in an earlier slot), so the precise
  // capacity check happens per-candidate in selectBestSlot.
  const baseRequiredMinutes = durationMinutes + bufferTimeMinutes;
  const cutoffMs = placementCutoffDate?.getTime();

  for (const slot of slots) {
    if (slot.type !== "available" && slot.type !== "category") continue;
    if (slot.end <= afterDate) continue;
    if (slot.start >= searchEndDate) break;
    // Tail buffer: skip slots whose start is past the placement cutoff. The
    // cutoff is "(last placeable slot end) - PLACEMENT_BUFFER_DAYS", computed
    // per-iteration by scheduleTasksAndGoals.
    if (cutoffMs !== undefined && slot.start.getTime() >= cutoffMs) break;

    if (eligibleCategoryIds) {
      if (
        slot.type !== "category" ||
        !eligibleCategoryIds.has(slot.categoryId)
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
