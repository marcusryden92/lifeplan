import type { Category } from "@/types/prisma";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { TravelManager } from "../../core/TravelManager";
import { PerTemplateMask } from "../../models/TemplateModels";
import { SchedulingContext } from "../../models/SchedulingModels";
import { Slot } from "../../models/TimeSlot";
import { dateTimeService } from "../../utils/dateTimeService";
import { buildAvailableSlots } from "../TimeSlotManager/buildAvailableSlots";
import { staticEventTravelPass } from "../TravelManager/staticEventTravelPass";
import { TravelPassRecorder } from "../TravelManager/TravelPassRecorder";

// Extend the slot horizon to cover the requested week. Picks up from the
// CategorySlot the previous static pass flagged isFinal — everything up
// to and including that slot is preserved verbatim (so previously-finalized
// decisions like consume-Fun-as-overconstrained survive), and buildAvailableSlots
// fills in the region beyond. The static pass then resumes at the isFinal slot
// so its deferred exit edge can finally be planned against the new region.
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
  const weekEndDate = dateTimeService.endOfDay(
    dateTimeService.shiftDays(weekStart, 6),
  );

  const pickupIdx = slotManager.slots.findIndex(
    (s) => s.type === "category" && s.isFinal === true,
  );

  // Pickup time = end of the previously-deferred category. Fallback to
  // weekStart if no marker exists (initial-state inconsistency — the first
  // CalendarGenerator pass should have set one, but be defensive).
  const pickupTime =
    pickupIdx >= 0
      ? slotManager.slots[pickupIdx].end
      : dateTimeService.startOfDay(weekStart);

  // Preserve every slot that ends at or before the pickup. Anything past
  // pickupTime (trailing Available/Occupied/Travel from the prior pass)
  // gets rebuilt — its content is reproducible from planners + templates,
  // and prior static-pass placements in that region were made without
  // knowing what comes after, so they may be stale.
  const pickupMs = pickupTime.getTime();
  const preservedSlots: Slot[] = slotManager.slots.filter(
    (s) => s.end.getTime() <= pickupMs,
  );

  // Events relevant for the rebuild: anything starting at/after pickup,
  // up to the requested week's end.
  const expansionEvents = context.scheduledEvents.filter((e) => {
    const start = new Date(e.start);
    return start.getTime() >= pickupMs && start <= weekEndDate;
  });

  const newSlots = buildAvailableSlots({
    planners: context.allPlanners,
    startDate: pickupTime,
    existingEvents: expansionEvents,
    templateMasks: perTemplateMasks,
    categories,
    plannerLocationMap,
    endDateOverride: weekEndDate,
  });

  const combinedSlots: Slot[] = [...preservedSlots, ...newSlots].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  // Resume index: where the previously-flagged isFinal slot now sits in the
  // combined array. With sorted-by-start ordering and pickupTime > pickupSlot.start,
  // it stays at preservedSlots.length - 1.
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

  const weekStartMs = dateTimeService.startOfDay(weekStart).getTime();
  const weekEndMs = weekEndDate.getTime();
  context.availableMinutesPerWeek = surviving
    .filter(
      (s): s is Extract<Slot, { type: "available" }> =>
        s.type === "available" &&
        s.start.getTime() >= weekStartMs &&
        s.end.getTime() <= weekEndMs,
    )
    .reduce((t, s) => t + s.durationMinutes, 0);
}
