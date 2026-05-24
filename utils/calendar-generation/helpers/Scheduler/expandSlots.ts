import type { Category } from "@/types/prisma";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { TravelManager } from "../../core/TravelManager";
import { PerTemplateMask } from "../../models/TemplateModels";
import { SchedulingContext } from "../../models/SchedulingModels";
import { CategorySlot, Slot } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";
import { SCHEDULING_CONFIG } from "../../constants";
import { buildAvailableSlots } from "../TimeSlotManager/buildAvailableSlots";
import { staticEventTravelPass } from "../TravelManager/staticEventTravelPass";
import { TravelPassRecorder } from "../TravelManager/TravelPassRecorder";

// Extend the slot horizon by one fixed chunk (SCHEDULING_CONFIG.HORIZON_CHUNK_DAYS)
// past the previous pickup point. Picks up from the CategorySlot the previous
// static pass flagged isFinal — everything up to and including that slot is
// preserved verbatim (so previously-finalized decisions survive), and
// buildAvailableSlots fills in only the new region. The static pass then
// resumes at the isFinal slot so its deferred exit edge can finally be
// planned against the new region. Plans starting before pickup are already
// in preservedSlots; plans starting beyond the chunk end are deferred until
// a future expansion reaches them.
export function expandSlots(
  context: SchedulingContext,
  perTemplateMasks: PerTemplateMask[],
  plannerLocationMap: Map<string, string | null>,
  categories: Category[],
  slotManager: TimeSlotManager,
  travelManager: TravelManager,
  travelPassRecorder?: TravelPassRecorder,
): void {
  const pickupIdx = slotManager.slots.findIndex(
    (s) => s.type === "category" && (s as CategorySlot).isFinal === true,
  );

  // Pickup time = end of the previously-deferred category. Fallback to today
  // when no marker exists (initial-state inconsistency — the first
  // CalendarGenerator pass should have set one, but be defensive).
  const pickupTime =
    pickupIdx >= 0
      ? slotManager.slots[pickupIdx].end
      : dateTimeService.startOfDay(context.currentDate);

  const chunkEnd = dateTimeService.endOfDay(
    dateTimeService.shiftDays(pickupTime, SCHEDULING_CONFIG.HORIZON_CHUNK_DAYS - 1),
  );

  const pickupMs = pickupTime.getTime();
  const preservedSlots: Slot[] = slotManager.slots.filter(
    (s) => s.end.getTime() <= pickupMs,
  );

  const expansionEvents = context.scheduledEvents.filter((e) => {
    const start = new Date(e.start);
    return start.getTime() >= pickupMs && start <= chunkEnd;
  });

  const newSlots = buildAvailableSlots({
    planners: context.allPlanners,
    startDate: pickupTime,
    existingEvents: expansionEvents,
    templateMasks: perTemplateMasks,
    categories,
    plannerLocationMap,
    endDateOverride: chunkEnd,
  });

  const combinedSlots: Slot[] = [...preservedSlots, ...newSlots].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  // Resume index: the previously-flagged isFinal slot sits at the tail of
  // preservedSlots (sorted-by-start ordering + pickupTime > pickupSlot.start
  // keeps it there). When no marker existed, start the walker from 0.
  const resumeIdx = pickupIdx >= 0 ? preservedSlots.length - 1 : 0;

  if (travelPassRecorder) {
    const y = pickupTime.getFullYear();
    const m = String(pickupTime.getMonth() + 1).padStart(2, "0");
    const d = String(pickupTime.getDate()).padStart(2, "0");
    travelPassRecorder.startPass(`resume@${y}-${m}-${d}`);
  }
  staticEventTravelPass(
    !!plannerLocationMap,
    categories,
    combinedSlots,
    travelManager,
    travelPassRecorder,
    resumeIdx,
  );

  const nowMs = context.currentDate.getTime();
  const surviving = combinedSlots.filter(
    (s) => s.type !== "available" || s.end.getTime() > nowMs,
  );

  slotManager.slots = surviving;

  // Track Available minutes inside the newly-expanded chunk for the proactive
  // watermark in scheduleTasksAndGoals. Bounds are inclusive of pickupTime
  // (everything we just generated).
  const chunkEndMs = chunkEnd.getTime();
  context.availableMinutesPerWeek = surviving
    .filter(
      (s): s is Extract<Slot, { type: "available" }> =>
        s.type === "available" &&
        s.start.getTime() >= pickupMs &&
        s.end.getTime() <= chunkEndMs,
    )
    .reduce((t, s) => t + s.durationMinutes, 0);
}
