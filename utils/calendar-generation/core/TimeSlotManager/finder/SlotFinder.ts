import { TimeSlot } from "../../../models/TimeSlot";
import { CategoryConstraint } from "../../../models/SchedulingModels";
import { dateTimeService } from "../../../utils/dateTimeService";
import { SCHEDULING_CONFIG } from "../../../constants";

/**
 * SlotFinder
 * Responsible for finding and querying available time slots with category filtering.
 */
export class SlotFinder {
  constructor(
    private availableSlots: Map<string, TimeSlot[]>,
    private bufferTimeMinutes: number,
  ) {}

  /**
   * Find all slots that could potentially fit a duration (plus buffer time)
   * Does NOT filter by travel time - caller should check capacity based on location match
   * Preserves location info (prevLocationId, nextLocationId) on returned slots
   */
  findAllFittingSlots(
    durationMinutes: number,
    afterDate: Date,
    maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH,
    categoryConstraint?: CategoryConstraint,
  ): TimeSlot[] {
    const fittingSlots: TimeSlot[] = [];
    const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
    let currentDate = new Date(afterDate);

    // Base required time: task duration + leading buffer + trailing buffer (minimum).
    // Slots no longer have a pre-baked leading buffer, so we account for both here.
    // The Scheduler does the final capacity check including travel time.
    const baseRequiredMinutes = durationMinutes + 2 * this.bufferTimeMinutes;

    while (currentDate <= searchEndDate) {
      const dayKey = dateTimeService.getDayKey(currentDate);
      const slots = this.availableSlots.get(dayKey);

      if (slots) {
        // If a category constraint is provided, intersect free slots with that day's category windows
        if (categoryConstraint && categoryConstraint.timeSlots?.length) {
          const dayOfWeek = currentDate.getDay();
          // Build category window periods for this day
          const categoryPeriods: Array<{ start: Date; end: Date }> = [];
          for (const catSlot of categoryConstraint.timeSlots) {
            if (!catSlot.days.includes(dayOfWeek)) continue;
            const [startHour, startMin] = catSlot.startTime
              .split(":")
              .map(Number);
            const [endHour, endMin] = catSlot.endTime.split(":").map(Number);
            const periodStart = new Date(currentDate);
            periodStart.setHours(startHour, startMin, 0, 0);
            const periodEnd = new Date(currentDate);
            periodEnd.setHours(endHour, endMin, 0, 0);
            categoryPeriods.push({ start: periodStart, end: periodEnd });
          }

          for (const slot of slots) {
            if (slot.end <= afterDate) continue;

            for (const period of categoryPeriods) {
              // Compute intersection of available slot and category period
              const intersectStart =
                slot.start > period.start ? slot.start : period.start;
              const intersectEnd =
                slot.end < period.end ? slot.end : period.end;
              if (intersectEnd <= intersectStart) continue;

              const effectiveStart =
                intersectStart < afterDate ? afterDate : intersectStart;
              if (intersectEnd <= effectiveStart) continue;

              const effectiveMinutes = dateTimeService.getMinutesDifference(
                effectiveStart,
                intersectEnd,
              );

              if (effectiveMinutes >= baseRequiredMinutes) {
                // Actual slot location context (from adjacent events) takes priority.
                // Category location is a fallback only when the slot has no context.
                const categoryLoc = categoryConstraint?.locationId ?? null;
                const resolvedPrev = slot.prevLocationId ?? categoryLoc;
                const resolvedNext = slot.nextLocationId ?? categoryLoc;
                // console.log(`[SlotFinder] category slot: ${effectiveStart.toISOString()} -> ${intersectEnd.toISOString()} | slot.prev=${slot.prevLocationId} slot.next=${slot.nextLocationId} catLoc=${categoryLoc} => prev=${resolvedPrev} next=${resolvedNext}`);
                fittingSlots.push({
                  ...slot,
                  start: effectiveStart,
                  end: intersectEnd,
                  durationMinutes: effectiveMinutes,
                  prevLocationId: resolvedPrev,
                  nextLocationId: resolvedNext,
                });
              }
            }
          }
        } else {
          // Original behavior: consider all free slots
          for (const slot of slots) {
            if (slot.end <= afterDate) continue;

            const effectiveStart =
              slot.start < afterDate ? afterDate : slot.start;
            const effectiveMinutes = dateTimeService.getMinutesDifference(
              effectiveStart,
              slot.end,
            );

            // Only check if slot can fit base requirement (duration + buffer)
            if (effectiveMinutes >= baseRequiredMinutes) {
              fittingSlots.push({
                ...slot,
                start: effectiveStart,
                durationMinutes: effectiveMinutes,
                prevLocationId: slot.prevLocationId,
                nextLocationId: slot.nextLocationId,
              });
            }
          }
        }
      }

      currentDate = dateTimeService.shiftDays(currentDate, 1);
    }

    return fittingSlots;
  }

  /**
   * Get available slots for a specific day
   */
  getDaySlots(date: Date): TimeSlot[] {
    const dayKey = dateTimeService.getDayKey(date);
    return this.availableSlots.get(dayKey) || [];
  }

  /**
   * Get total available minutes for a day
   */
  getDayAvailableMinutes(date: Date): number {
    const slots = this.getDaySlots(date);
    return slots.reduce((total, slot) => total + slot.durationMinutes, 0);
  }
}
