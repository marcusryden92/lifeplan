import { Planner, SimpleEvent, ItemType } from "@/types/prisma";
import { CategoryPeriod } from "@/types/categoryTypes";
import { Scheduler } from "../../core/Scheduler";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { TravelManager } from "../../core/TravelManager";
import { PerTemplateMask } from "../../models/TemplateModels";
import {
  SchedulingContext,
  SchedulingFailure,
} from "../../models/SchedulingModels";
import { SCHEDULING_CONFIG } from "../../constants";
import { dateTimeService } from "../../utils/dateTimeService";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { scheduleSingleTask } from "./scheduleSingleTask";
import { scheduleGoal } from "./scheduleGoal";
import { expandSlotsForNextWeek } from "./expandSlotsForNextWeek";

export function scheduleTasksAndGoals(
  slotManager: TimeSlotManager,
  travelManager: TravelManager,
  scheduler: Scheduler,
  weekStartDay: WeekDayIntegers,
  allPlanners: Planner[],
  candidates: Planner[],
  memoizedEventIds: Set<string>,
  largestTemplateGap: number,
  perTemplateMasks: PerTemplateMask[],
  context: SchedulingContext,
  plannerLocationMap: Map<string, string | null>,
  categoryPeriods: CategoryPeriod[]
): {
  success: boolean;
  newEvents: SimpleEvent[];
  failures: SchedulingFailure[];
} {
  const events: SimpleEvent[] = [];
  const failures: SchedulingFailure[] = [];
  const scheduledTaskIds = new Set<string>();

  let weekStart = dateTimeService.getWeekFirstDate(
    context.currentDate,
    weekStartDay
  );
  let weeksSearched = 0;

  while (
    candidates.length > 0 &&
    weeksSearched < SCHEDULING_CONFIG.MAX_WEEKS_TO_SEARCH
  ) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      const item = candidates[i];

      if (item.itemType === ItemType.task) {
        const result = scheduleSingleTask(
          item,
          scheduledTaskIds,
          largestTemplateGap,
          failures,
          scheduler
        );

        if (result.scheduled) {
          if (result.event) events.push(result.event);
          candidates.splice(i, 1);
        } else if (result.permanentFailure) {
          candidates.splice(i, 1);
        }
      } else if (item.itemType === ItemType.goal) {
        const result = scheduleGoal(
          item,
          allPlanners,
          scheduledTaskIds,
          memoizedEventIds,
          largestTemplateGap,
          failures,
          events,
          scheduler
        );

        if (result.scheduled || result.permanentFailure) {
          candidates.splice(i, 1);
        }
      }
    }

    if (candidates.length > 0) {
      weeksSearched++;
      weekStart = dateTimeService.shiftDays(weekStart, 7);

      expandSlotsForNextWeek(
        weekStart,
        context,
        perTemplateMasks,
        plannerLocationMap,
        categoryPeriods,
        slotManager,
        travelManager,
      );
    }
  }

  return {
    success: failures.length === 0 && candidates.length === 0,
    newEvents: events,
    failures,
  };
}
