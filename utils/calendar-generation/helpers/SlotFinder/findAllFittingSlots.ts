import { TimeSlot } from "../../models/TimeSlot";
import { CategoryConstraint } from "../../models/SchedulingModels";
import { dateTimeService } from "../../utils/dateTimeService";
import { SCHEDULING_CONFIG } from "../../constants";

export function findAllFittingSlots(
  availableSlots: Map<string, TimeSlot[]>,
  bufferTimeMinutes: number,
  durationMinutes: number,
  afterDate: Date,
  maxDaysToSearch: number = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH,
  categoryConstraint?: CategoryConstraint,
): TimeSlot[] {
  const fittingSlots: TimeSlot[] = [];
  const searchEndDate = dateTimeService.shiftDays(afterDate, maxDaysToSearch);
  let currentDate = new Date(afterDate);

  const baseRequiredMinutes = durationMinutes + 2 * bufferTimeMinutes;

  while (currentDate <= searchEndDate) {
    const dayKey = dateTimeService.getDayKey(currentDate);
    const slots = availableSlots.get(dayKey);

    if (slots) {
      if (categoryConstraint && categoryConstraint.timeSlots?.length) {
        const dayOfWeek = currentDate.getDay();
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
              const categoryLoc = categoryConstraint?.locationId ?? null;
              const resolvedPrev = slot.prevLocationId ?? categoryLoc;
              const resolvedNext = slot.nextLocationId ?? categoryLoc;
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
        for (const slot of slots) {
          if (slot.end <= afterDate) continue;

          const effectiveStart =
            slot.start < afterDate ? afterDate : slot.start;
          const effectiveMinutes = dateTimeService.getMinutesDifference(
            effectiveStart,
            slot.end,
          );

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
