import { SimpleEvent } from "@/types/prisma";
import { CategoryPeriod } from "@/types/categoryTypes";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { PerTemplateMask } from "../../models/TemplateModels";
import { SchedulingContext } from "../../models/SchedulingModels";
import { dateTimeService } from "../../utils/dateTimeService";

export function expandSlotsForNextWeek(
  weekStart: Date,
  context: SchedulingContext,
  perTemplateMasks: PerTemplateMask[],
  plannerLocationMap: Map<string, string | null>,
  categoryPeriods: CategoryPeriod[],
  slotManager: TimeSlotManager
): void {
  const weekStartDate = dateTimeService.startOfDay(weekStart);
  const weekEndDate = dateTimeService.endOfDay(
    dateTimeService.shiftDays(weekStart, 6)
  );

  const weekEvents = context.scheduledEvents.filter((e) => {
    const s = new Date(e.start);
    return s >= weekStartDate && s <= weekEndDate;
  });

  slotManager.buildWeekSlots(
    weekStart,
    weekEvents,
    perTemplateMasks,
    categoryPeriods,
    plannerLocationMap,
  );

  context.availableMinutesPerWeek =
    slotManager.getWeekAvailableMinutes(weekStart);
}
