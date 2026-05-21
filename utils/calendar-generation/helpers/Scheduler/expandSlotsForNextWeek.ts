import type { Category } from "@/types/prisma";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { TravelManager } from "../../core/TravelManager";
import { PerTemplateMask } from "../../models/TemplateModels";
import { SchedulingContext } from "../../models/SchedulingModels";
import { Slot } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";
import { buildAvailableSlots } from "../TimeSlotManager/buildAvailableSlots";
import { preliminaryTravelPass } from "../TravelManager/preliminaryTravelPass";
import { TravelPassRecorder } from "../TravelManager/TravelPassRecorder";

export function expandSlotsForNextWeek(
  weekStart: Date,
  context: SchedulingContext,
  perTemplateMasks: PerTemplateMask[],
  plannerLocationMap: Map<string, string | null>,
  categories: Category[],
  slotManager: TimeSlotManager,
  travelManager: TravelManager,
  travelPassRecorder?: TravelPassRecorder,
): void {
  const weekStartDate = dateTimeService.startOfDay(weekStart);
  const weekEndDate = dateTimeService.endOfDay(
    dateTimeService.shiftDays(weekStart, 6),
  );

  const weekEvents = context.scheduledEvents.filter((e) => {
    const s = new Date(e.start);
    return s >= weekStartDate && s <= weekEndDate;
  });

  // Remove existing available slots in this week's range and replace with
  // freshly built ones. Occupied/travel slots outside this range are kept.
  const weekStartMs = weekStartDate.getTime();
  const weekEndMs = weekEndDate.getTime();
  const slotsOutsideWeek: Slot[] = slotManager.slots.filter(
    (s) =>
      s.end.getTime() <= weekStartMs || s.start.getTime() >= weekEndMs,
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

  // Run travel pass on the week's slots in isolation, then merge back.
  const weekSlots: Slot[] = [...initialSlots];
  if (travelPassRecorder) {
    const y = weekStartDate.getFullYear();
    const m = String(weekStartDate.getMonth() + 1).padStart(2, "0");
    const d = String(weekStartDate.getDate()).padStart(2, "0");
    travelPassRecorder.startPass(`next-week@${y}-${m}-${d}`);
  }
  preliminaryTravelPass(
    !!plannerLocationMap,
    categories,
    weekSlots,
    travelManager,
    travelPassRecorder,
  );

  const nowMs = context.currentDate.getTime();
  const survivingWeekSlots = weekSlots.filter(
    (s) => s.type !== "available" || s.end.getTime() > nowMs,
  );

  slotManager.slots = [...slotsOutsideWeek, ...survivingWeekSlots].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  context.availableMinutesPerWeek = survivingWeekSlots
    .filter((s): s is Extract<Slot, { type: "available" }> => s.type === "available")
    .reduce((t, s) => t + s.durationMinutes, 0);
}
