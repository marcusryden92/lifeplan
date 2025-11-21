/**
 * Scheduler
 *
 * Core scheduling engine that places tasks into time slots using strategies.
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { TimeSlotManager } from "./TimeSlotManager";
import { SchedulingStrategy } from "../strategies/SchedulingStrategy";
import {
  SchedulingContext,
  SchedulingResult,
  SchedulingFailure,
  SchedulingMetrics,
  ScoredSlot,
} from "../models/SchedulingModels";
import { TimeSlot } from "../models/TimeSlot";
import { SchedulingFailureReason } from "../constants";
import { dateTimeService } from "../utils/dateTimeService";
import { v4 as uuidv4 } from "uuid";
import { calendarColors } from "@/data/calendarColors";

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
  };

  constructor(
    private slotManager: TimeSlotManager,
    private strategy: SchedulingStrategy,
    private context: SchedulingContext
  ) {}

  /**
   * Schedule a single task
   */
  scheduleTask(
    task: Planner,
    afterTime?: Date
  ): { success: boolean; event?: SimpleEvent; failure?: SchedulingFailure } {
    const startTime = performance.now();
    this.metrics.tasksAttempted++;

    // Validate task
    if (!task.duration || task.duration <= 0) {
      this.metrics.tasksFailed++;
      return {
        success: false,
        failure: {
          taskId: task.id,
          taskTitle: task.title,
          reason: SchedulingFailureReason.INVALID_TASK,
          details: "Task duration is missing or invalid",
        },
      };
    }

    // Find all fitting slots
    const fittingSlots = this.slotManager.findAllFittingSlots(
      task.duration,
      afterTime || this.context.currentDate
    );

    if (fittingSlots.length === 0) {
      this.metrics.tasksFailed++;
      return {
        success: false,
        failure: {
          taskId: task.id,
          taskTitle: task.title,
          reason: SchedulingFailureReason.NO_SLOTS,
          details: `No available time slots found for ${task.duration} minutes`,
        },
      };
    }

    // Score all slots using the strategy
    const scoredSlots = this.scoreSlots(task, fittingSlots);

    // Choose the best slot
    const bestSlot = scoredSlots[0];

    if (!bestSlot) {
      this.metrics.tasksFailed++;
      return {
        success: false,
        failure: {
          taskId: task.id,
          taskTitle: task.title,
          reason: SchedulingFailureReason.NO_SLOTS,
          details: "No suitable slots found after scoring",
        },
      };
    }

    // Create the event
    const startDate = bestSlot.slot.start;
    const endDate = dateTimeService.addDuration(startDate, task.duration);

    // Reserve the slot
    const reserved = this.slotManager.reserveSlot(
      startDate,
      endDate,
      task.id,
      task.itemType
    );

    if (!reserved) {
      this.metrics.tasksFailed++;
      return {
        success: false,
        failure: {
          taskId: task.id,
          taskTitle: task.title,
          reason: SchedulingFailureReason.NO_SLOTS,
          details: "Failed to reserve slot (may have been taken)",
        },
      };
    }

    const now = new Date();

    const event: SimpleEvent = {
      userId: this.context.userId,
      id: task.id,
      title: task.title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      extendedProps: {
        id: uuidv4(),
        eventId: task.id,
        itemType: task.itemType,
        completedEndTime: null,
        completedStartTime: null,
        parentId: task.parentId || null,
      },
      backgroundColor: (task.color as string) || calendarColors[0],
      borderColor: "transparent",
      duration: null,
      rrule: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Add to scheduled events
    this.context.scheduledEvents.push(event);

    const endTime = performance.now();
    const schedulingTime = endTime - startTime;

    this.metrics.tasksScheduled++;
    this.metrics.totalIterations++;

    // Update average scheduling time
    const totalTime =
      this.metrics.averageSchedulingTimeMs * (this.metrics.tasksScheduled - 1) +
      schedulingTime;
    this.metrics.averageSchedulingTimeMs =
      totalTime / this.metrics.tasksScheduled;

    return { success: true, event };
  }

  /**
   * Schedule multiple tasks
   */
  scheduleTasks(tasks: Planner[]): SchedulingResult {
    const events: SimpleEvent[] = [...this.context.scheduledEvents];
    const failures: SchedulingFailure[] = [];

    for (const task of tasks) {
      const result = this.scheduleTask(task);

      if (result.success && result.event) {
        events.push(result.event);
      } else if (result.failure) {
        failures.push(result.failure);
      }
    }

    return {
      success: failures.length === 0,
      events,
      failures,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Score time slots for a task using the strategy
   */
  private scoreSlots(task: Planner, slots: TimeSlot[]): ScoredSlot[] {
    const scored: ScoredSlot[] = slots.map((slot) => {
      const score = this.strategy.score(task, slot, this.context);

      return {
        slot: {
          start: slot.start,
          end: slot.end,
          durationMinutes: slot.durationMinutes,
        },
        score,
        strategyScores: { [this.strategy.name]: score },
      };
    });

    // Sort by score (highest first)
    return scored.sort((a, b) => b.score - a.score);
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
    };
  }
}
