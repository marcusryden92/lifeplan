/**
 * Scheduler
 *
 * Core scheduling engine that places tasks into time slots using strategies.
 * Delegates to specialized subfunctions for each phase.
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { TimeSlotManager } from "./TimeSlotManager";
import { SchedulingStrategy } from "../strategies/SchedulingStrategy";
import {
  SchedulingContext,
  SchedulingResult,
  SchedulingFailure,
  SchedulingMetrics,
} from "../models/SchedulingModels";
import { scheduleTask } from "./Scheduler/scheduleTask";
import { scheduleTasks } from "./Scheduler/scheduleTasks";

export class Scheduler {
  private metrics: SchedulingMetrics = {
    tasksAttempted: 0,
    tasksScheduled: 0,
    tasksFailed: 0,
    goalsProcessed: 0,
    totalIterations: 0,
    averageSchedulingTimeMs: 0,
    totalExecutionTimeMs: 0,
    templateEventsGenerated: 0,
    templateExpansionTimeMs: 0,
    templatesFailed: 0,
  };

  constructor(
    private slotManager: TimeSlotManager,
    private strategy: SchedulingStrategy,
    private context: SchedulingContext,
  ) {}

  /**
   * Schedule a single task
   * Travel is stored as occupied slots, not SimpleEvents - they get converted at the end
   */
  scheduleTask(
    task: Planner,
    afterTime?: Date,
  ): { success: boolean; event?: SimpleEvent; failure?: SchedulingFailure } {
    const startTime = performance.now();
    this.metrics.tasksAttempted++;

    const result = scheduleTask(
      task,
      this.slotManager,
      this.strategy,
      this.context,
      afterTime,
    );

    if (!result.success) {
      this.metrics.tasksFailed++;
    } else {
      const endTime = performance.now();
      const schedulingTime = endTime - startTime;

      this.metrics.tasksScheduled++;
      this.metrics.totalIterations++;

      const totalTime =
        this.metrics.averageSchedulingTimeMs *
          (this.metrics.tasksScheduled - 1) +
        schedulingTime;
      this.metrics.averageSchedulingTimeMs =
        totalTime / this.metrics.tasksScheduled;
    }

    return result;
  }

  /**
   * Schedule multiple tasks
   */
  scheduleTasks(tasks: Planner[]): SchedulingResult {
    return scheduleTasks(
      tasks,
      this.slotManager,
      this.strategy,
      this.context,
      () => this.getMetrics(),
    );
  }

  /**
   * Get current metrics
   */
  getMetrics(): SchedulingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      tasksAttempted: 0,
      tasksScheduled: 0,
      tasksFailed: 0,
      goalsProcessed: 0,
      totalIterations: 0,
      averageSchedulingTimeMs: 0,
      totalExecutionTimeMs: 0,
      templateEventsGenerated: 0,
      templateExpansionTimeMs: 0,
      templatesFailed: 0,
    };
  }
}
