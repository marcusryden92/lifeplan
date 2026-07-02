import { Planner, SimpleEvent, PlannerType, Category } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { PerTemplateMask } from "../../models/TemplateModels";
import { SchedulingFailure } from "../../models/SchedulingModels";
import { Slot } from "../../models/TimeSlot";
import { SCHEDULING_CONFIG } from "../../constants";
import { scheduleSingleTask } from "./scheduleSingleTask";
import { scheduleGoal } from "./scheduleGoal";
import { expandSlots } from "./expandSlots";
import { TravelPassRecorder } from "../TravelManager/TravelPassRecorder";
import { largestCompatibleSlotForLargestTask } from "./capacityCheck";

export function scheduleTasksAndGoals(
  scheduler: Scheduler,
  allPlanners: Planner[],
  candidates: Planner[],
  memoizedEventIds: Set<string>,
  perTemplateMasks: PerTemplateMask[],
  plannerLocationMap: Map<string, string | null>,
  categories: Category[],
  travelPassRecorder?: TravelPassRecorder,
): {
  success: boolean;
  newEvents: SimpleEvent[];
  failures: SchedulingFailure[];
} {
  const { slotManager, travelManager, context } = scheduler;
  const events: SimpleEvent[] = [];
  const failures: SchedulingFailure[] = [];
  const scheduledTaskIds = new Set<string>();

  const plannerCategoryMap =
    context.plannerCategoryMap ?? new Map<string, string | null>();
  const capacityCache = new Map<string, number>();

  let expansionsDone = 0;

  while (
    candidates.length > 0 &&
    expansionsDone < SCHEDULING_CONFIG.MAX_WEEKS_TO_SEARCH
  ) {
    // Compute and publish the tail-buffer cutoff for this iteration. Anything
    // starting at or after this date is off-limits to dynamic placement, so
    // the next expansion's static-pass resume has empty room at the seam.
    // Anchor: the latest end among placeable slots (Available + Category).
    // Trailing nightly-template Occupieds are intentionally excluded, else
    // the cutoff would always sit at midnight and the buffer would never
    // shrink the placement window.
    context.placementCutoffDate = computePlacementCutoff(slotManager.slots);

    // Proactive watermark: if either the available-slot count is below the
    // threshold or the biggest remaining task can't fit any compatible slot,
    // expand the horizon before burning iterations on guaranteed failures.
    // The reactive expansion at the bottom still fires after a fully-failed
    // pass, catching location/travel cases the watermark doesn't model.
    const availableCount = slotManager.slots.filter(
      (s) => s.type === "available",
    ).length;
    const biggestRemaining = candidates.reduce(
      (m, c) => Math.max(m, c.duration),
      0,
    );
    const biggestFit = largestCompatibleSlotForLargestTask(
      candidates,
      slotManager.slots,
      plannerCategoryMap,
      context.placementCutoffDate,
    );

    if (
      availableCount < SCHEDULING_CONFIG.LOW_SLOT_WATERMARK ||
      biggestFit < biggestRemaining
    ) {
      expansionsDone++;
      expandSlots(
        context,
        perTemplateMasks,
        plannerLocationMap,
        categories,
        slotManager,
        travelManager,
        "watermark",
        travelPassRecorder,
      );
      continue;
    }

    // Walk candidates in sorted order — category-constrained and
    // highest-urgency items pick slots first. Removals are collected and
    // applied after the pass so the walk order matches the sort (the previous
    // reverse-index splice idiom handed first pick to the lowest-urgency,
    // unconstrained item, inverting the sorter's intent under contention).
    const resolvedIds = new Set<string>();

    for (const item of candidates) {
      if (item.plannerType === PlannerType.task) {
        const result = scheduleSingleTask(
          item,
          scheduledTaskIds,
          failures,
          scheduler,
          perTemplateMasks,
          categories,
          plannerCategoryMap,
          context.currentDate,
          capacityCache,
        );

        if (result.scheduled) {
          if (result.event) events.push(result.event);
          resolvedIds.add(item.id);
        } else if (result.permanentFailure) {
          resolvedIds.add(item.id);
        }
      } else if (item.plannerType === PlannerType.goal) {
        const result = scheduleGoal(
          item,
          allPlanners,
          scheduledTaskIds,
          memoizedEventIds,
          failures,
          events,
          scheduler,
          perTemplateMasks,
          categories,
          plannerCategoryMap,
          context.currentDate,
          capacityCache,
        );

        if (result.scheduled || result.permanentFailure) {
          resolvedIds.add(item.id);
        }
      }
    }

    if (resolvedIds.size > 0) {
      const remaining = candidates.filter((c) => !resolvedIds.has(c.id));
      candidates.splice(0, candidates.length, ...remaining);
    }

    if (candidates.length > 0) {
      expansionsDone++;
      expandSlots(
        context,
        perTemplateMasks,
        plannerLocationMap,
        categories,
        slotManager,
        travelManager,
        "fallback",
        travelPassRecorder,
      );
    }
  }

  // Drop failures for tasks that eventually placed on a later iteration.
  // A NO_SLOTS on attempt 1 that succeeds after expansion is not something the
  // console should surface — the retry was the whole point of the outer loop.
  const finalFailures = failures.filter((f) => !scheduledTaskIds.has(f.taskId));

  return {
    success: finalFailures.length === 0 && candidates.length === 0,
    newEvents: events,
    failures: finalFailures,
  };
}

// Tail-buffer cutoff: dynamic placement is suppressed at and after this date.
// Anchor = max end among placeable slots (Available + Category) - buffer days.
// Excludes Travel/Occupied so trailing nightly templates don't pin the anchor
// at midnight, which would leave no buffer behind the actual placement region.
function computePlacementCutoff(slots: Slot[]): Date | null {
  let lastPlaceableEndMs = 0;
  for (const s of slots) {
    if (s.type !== "available" && s.type !== "category") continue;
    const endMs = s.end.getTime();
    if (endMs > lastPlaceableEndMs) lastPlaceableEndMs = endMs;
  }
  if (lastPlaceableEndMs === 0) return null;
  return new Date(
    lastPlaceableEndMs -
      SCHEDULING_CONFIG.PLACEMENT_BUFFER_DAYS * 24 * 60 * 60 * 1000,
  );
}
