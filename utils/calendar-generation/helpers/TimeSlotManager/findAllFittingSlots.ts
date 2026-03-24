import { AvailableSlot } from "../../models/TimeSlot";
import { CategoryConstraint } from "../../models/SchedulingModels";
import { dateTimeService } from "../../utils/dateTimeService";
import { SCHEDULING_CONFIG } from "../../constants";

export function findAllFittingSlots(
  availableSlots: AvailableSlot[],
  bufferTimeMinutes: number,
  durationMinutes: number,
  afterDate: Date,
  maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH,
  categoryConstraint?: CategoryConstraint,
): AvailableSlot[] {
  const fittingSlots: AvailableSlot[] = [];
  const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
  const baseRequiredMinutes = durationMinutes + 2 * bufferTimeMinutes;

  for (const slot of availableSlots) {
    if (slot.end <= afterDate) continue;
    if (slot.start >= searchEndDate) break;

    if (categoryConstraint && categoryConstraint.timeSlots?.length) {
      const dayStart = dateTimeService.startOfDay(slot.start);
      const dayOfWeek = dayStart.getDay();

      for (const catSlot of categoryConstraint.timeSlots) {
        if (!catSlot.days.includes(dayOfWeek)) continue;

        const [startHour, startMin] = catSlot.startTime.split(":").map(Number);
        const [endHour, endMin] = catSlot.endTime.split(":").map(Number);

        const periodStart = new Date(dayStart);
        periodStart.setHours(startHour, startMin, 0, 0);
        const periodEnd = new Date(dayStart);
        periodEnd.setHours(endHour, endMin, 0, 0);

        const intersectStart =
          slot.start > periodStart ? slot.start : periodStart;
        const intersectEnd = slot.end < periodEnd ? slot.end : periodEnd;
        if (intersectEnd <= intersectStart) continue;

        const effectiveStart =
          intersectStart < afterDate ? afterDate : intersectStart;
        if (intersectEnd <= effectiveStart) continue;

        const effectiveMinutes = dateTimeService.getMinutesDifference(
          effectiveStart,
          intersectEnd,
        );
        if (effectiveMinutes >= baseRequiredMinutes) {
          const categoryLocation = categoryConstraint.locationId ?? null;
          fittingSlots.push({
            ...slot,
            start: effectiveStart,
            end: intersectEnd,
            durationMinutes: effectiveMinutes,
            prevLocationId: slot.prevLocationId ?? categoryLocation,
            nextLocationId: slot.nextLocationId ?? categoryLocation,
          });
        }
      }
    } else {
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
  }

  return fittingSlots;
}
