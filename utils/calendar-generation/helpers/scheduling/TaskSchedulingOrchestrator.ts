/**
 * TaskSchedulingOrchestrator
 *
 * Manages the week-by-week task scheduling loop.
 * Coordinates between the Scheduler and TimeSlotManager to place tasks
 * into available slots, expanding to new weeks as needed.
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { TimeSlotManager } from "../../core/TimeSlotManager";
import { PerTemplateMask } from "../../core/TemplateExpander";
import {
  SchedulingContext,
  SchedulingFailure,
} from "../../models/SchedulingModels";
import { SchedulingFailureReason, SCHEDULING_CONFIG } from "../../constants";
import { dateTimeService } from "../../utils/dateTimeService";
import { getSortedTreeBottomLayer } from "../../../goalPageHandlers";
import { taskIsCompleted } from "../../../taskHelpers";
import { WeekDayIntegers } from "@/types/calendarTypes";

export class TaskSchedulingOrchestrator {
  constructor(
    private slotManager: TimeSlotManager,
    private scheduler: Scheduler,
    private weekStartDay: WeekDayIntegers
  ) {}

  /**
   * Schedule tasks and goals using week-by-week orchestration
   */
  scheduleTasksAndGoals(
    allPlanners: Planner[],
    candidates: Planner[],
    memoizedEventIds: Set<string>,
    largestTemplateGap: number,
    perTemplateMasks: PerTemplateMask[],
    context: SchedulingContext,
    plannerLocationMap: Map<string, string | null>
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
      this.weekStartDay
    );
    let weeksSearched = 0;

    while (
      candidates.length > 0 &&
      weeksSearched < SCHEDULING_CONFIG.MAX_WEEKS_TO_SEARCH
    ) {
      // Try scheduling each candidate (iterate backwards for safe removal)
      for (let i = candidates.length - 1; i >= 0; i--) {
        const item = candidates[i];

        if (item.itemType === "task") {
          const result = this.scheduleTask(
            item,
            scheduledTaskIds,
            largestTemplateGap,
            failures
          );

          if (result.scheduled) {
            if (result.event) events.push(result.event);
            candidates.splice(i, 1);
          } else if (result.permanentFailure) {
            candidates.splice(i, 1);
          }
        } else if (item.itemType === "goal") {
          const result = this.scheduleGoal(
            item,
            allPlanners,
            scheduledTaskIds,
            memoizedEventIds,
            largestTemplateGap,
            failures,
            events
          );

          if (result.scheduled || result.permanentFailure) {
            candidates.splice(i, 1);
          }
        }
      }

      // Expand to next week if candidates remain
      if (candidates.length > 0) {
        weeksSearched++;
        weekStart = dateTimeService.shiftDays(weekStart, 7);

        this.expandSlotsForNextWeek(
          weekStart,
          context,
          perTemplateMasks,
          plannerLocationMap
        );
      }
    }

    return {
      success: failures.length === 0 && candidates.length === 0,
      newEvents: events,
      failures,
    };
  }

  /**
   * Schedule a single task
   */
  private scheduleTask(
    task: Planner,
    scheduledTaskIds: Set<string>,
    largestTemplateGap: number,
    failures: SchedulingFailure[]
  ): {
    scheduled: boolean;
    permanentFailure: boolean;
    event?: SimpleEvent;
  } {
    // Skip if already scheduled
    if (scheduledTaskIds.has(task.id)) {
      return { scheduled: true, permanentFailure: false };
    }

    // Size check
    if (largestTemplateGap && task.duration > largestTemplateGap) {
      failures.push({
        taskId: task.id,
        taskTitle: task.title,
        reason: SchedulingFailureReason.TOO_LARGE,
        details: `Task duration (${task.duration} min) exceeds largest template gap (${largestTemplateGap} min)`,
      });
      return { scheduled: false, permanentFailure: true };
    }

    const result = this.scheduler.scheduleTask(task);

    if (result.success && result.event) {
      scheduledTaskIds.add(task.id);
      return { scheduled: true, permanentFailure: false, event: result.event };
    } else if (result.failure) {
      // If NO_SLOTS, retry next week; otherwise permanent failure
      if (result.failure.reason !== SchedulingFailureReason.NO_SLOTS) {
        failures.push(result.failure);
        return { scheduled: false, permanentFailure: true };
      }
      return { scheduled: false, permanentFailure: false };
    }

    return { scheduled: false, permanentFailure: false };
  }

  /**
   * Schedule all tasks in a goal sequentially
   */
  private scheduleGoal(
    goal: Planner,
    allPlanners: Planner[],
    scheduledTaskIds: Set<string>,
    memoizedEventIds: Set<string>,
    largestTemplateGap: number,
    failures: SchedulingFailure[],
    events: SimpleEvent[]
  ): { scheduled: boolean; permanentFailure: boolean } {
    const goalTasks = getSortedTreeBottomLayer(allPlanners, goal.id).filter(
      (t) =>
        !taskIsCompleted(t) &&
        !scheduledTaskIds.has(t.id) &&
        !memoizedEventIds.has(t.id)
    );

    let goalFailedDueToNoSlots = false;
    let goalAfterTime: Date | undefined = undefined;

    for (const task of goalTasks) {
      // Size check
      if (largestTemplateGap && task.duration > largestTemplateGap) {
        failures.push({
          taskId: task.id,
          taskTitle: task.title,
          reason: SchedulingFailureReason.TOO_LARGE,
          details: `Task duration (${task.duration} min) exceeds largest template gap (${largestTemplateGap} min)`,
        });
        continue;
      }

      // Schedule sequentially (tasks after previous task)
      const res = this.scheduler.scheduleTask(task, goalAfterTime);

      if (res.success && res.event) {
        events.push(res.event);
        scheduledTaskIds.add(task.id);
        goalAfterTime = new Date(res.event.end);
      } else if (res.failure) {
        if (res.failure.reason === SchedulingFailureReason.NO_SLOTS) {
          goalFailedDueToNoSlots = true;
          break;
        } else {
          failures.push(res.failure);
        }
      }
    }

    return {
      scheduled: !goalFailedDueToNoSlots,
      permanentFailure: false,
    };
  }

  /**
   * Expand slots for the next week
   */
  private expandSlotsForNextWeek(
    weekStart: Date,
    context: SchedulingContext,
    perTemplateMasks: PerTemplateMask[],
    plannerLocationMap: Map<string, string | null>
  ): void {
    const weekStartDate = dateTimeService.startOfDay(weekStart);
    const weekEndDate = dateTimeService.endOfDay(
      dateTimeService.shiftDays(weekStart, 6)
    );

    const weekEvents = context.scheduledEvents.filter((e) => {
      const s = new Date(e.start);
      return s >= weekStartDate && s <= weekEndDate;
    });

    this.slotManager.buildDailySlots(
      weekStart,
      7,
      weekEvents,
      perTemplateMasks,
      plannerLocationMap
    );

    context.availableMinutesPerWeek =
      this.slotManager.getWeekAvailableMinutes(weekStart);
  }
}
