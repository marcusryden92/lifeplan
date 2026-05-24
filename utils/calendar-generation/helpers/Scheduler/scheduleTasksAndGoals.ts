import { Planner, SimpleEvent, PlannerType, Category } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { TravelManager } from "../../core/TravelManager";
import { PerTemplateMask } from "../../models/TemplateModels";
import {
  SchedulingContext,
  SchedulingFailure,
} from "../../models/SchedulingModels";
import { SCHEDULING_CONFIG } from "../../constants";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { scheduleSingleTask } from "./scheduleSingleTask";
import { scheduleGoal } from "./scheduleGoal";
import { expandSlots } from "./expandSlots";
import { TravelPassRecorder } from "../TravelManager/TravelPassRecorder";
import { largestCompatibleSlotForLargestTask } from "./capacityCheck";

export function scheduleTasksAndGoals(
  slotManager: TimeSlotManager,
  travelManager: TravelManager,
  scheduler: Scheduler,
  _weekStartDay: WeekDayIntegers,
  allPlanners: Planner[],
  candidates: Planner[],
  memoizedEventIds: Set<string>,
  _largestTemplateGap: number,
  perTemplateMasks: PerTemplateMask[],
  context: SchedulingContext,
  plannerLocationMap: Map<string, string | null>,
  categories: Category[],
  travelPassRecorder?: TravelPassRecorder,
): {
  success: boolean;
  newEvents: SimpleEvent[];
  failures: SchedulingFailure[];
} {
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
        travelPassRecorder,
      );
      continue;
    }

    for (let i = candidates.length - 1; i >= 0; i--) {
      const item = candidates[i];

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
          candidates.splice(i, 1);
        } else if (result.permanentFailure) {
          candidates.splice(i, 1);
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
          candidates.splice(i, 1);
        }
      }
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
        travelPassRecorder,
      );
    }
  }

  return {
    success: failures.length === 0 && candidates.length === 0,
    newEvents: events,
    failures,
  };
}
