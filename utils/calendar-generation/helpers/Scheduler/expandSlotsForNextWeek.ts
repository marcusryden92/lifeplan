import type { Category } from "@/types/prisma";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { TravelManager } from "../../core/TravelManager";
import { PerTemplateMask } from "../../models/TemplateModels";
import { SchedulingContext } from "../../models/SchedulingModels";
import { dateTimeService } from "../../utils/dateTimeService";
import { buildAvailableSlots } from "../TimeSlotManager/buildAvailableSlots";
import { preliminaryTravelPass } from "../TravelManager/preliminaryTravelPass";

export function expandSlotsForNextWeek(
  weekStart: Date,
  context: SchedulingContext,
  perTemplateMasks: PerTemplateMask[],
  plannerLocationMap: Map<string, string | null>,
  categories: Category[],
  slotManager: TimeSlotManager,
  travelManager: TravelManager,
): void {
  const weekStartDate = dateTimeService.startOfDay(weekStart);
  const weekEndDate = dateTimeService.endOfDay(
    dateTimeService.shiftDays(weekStart, 6),
  );

  const weekEvents = context.scheduledEvents.filter((e) => {
    const s = new Date(e.start);
    return s >= weekStartDate && s <= weekEndDate;
  });

  // Remove existing slots in this week's range and replace with freshly built ones
  const weekStartMs = weekStartDate.getTime();
  const weekEndMs = weekEndDate.getTime();
  const beforeWeek = slotManager.availableSlots.filter(
    (s) => s.end.getTime() <= weekStartMs,
  );
  const afterWeek = slotManager.availableSlots.filter(
    (s) => s.start.getTime() >= weekEndMs,
  );

  const initialSlots = buildAvailableSlots({
    planners: context.allPlanners,
    startDate: weekStartDate,
    existingEvents: weekEvents,
    templateMasks: perTemplateMasks,
    categories,
    plannerLocationMap,
    endDateOverride: weekEndDate,
  });

  const slotsWithTravel = preliminaryTravelPass(
    !!plannerLocationMap,
    categories,
    slotManager.occupiedSlots,
    travelManager,
    slotManager.bufferTimeMinutes,
    initialSlots,
  );

  const nowMs = context.currentDate.getTime();
  const weekSlots = slotsWithTravel.filter((s) => s.end.getTime() > nowMs);

  slotManager.availableSlots.splice(
    0,
    slotManager.availableSlots.length,
    ...beforeWeek,
    ...weekSlots,
    ...afterWeek,
  );

  context.availableMinutesPerWeek = weekSlots.reduce(
    (t, s) => t + s.durationMinutes,
    0,
  );
}
