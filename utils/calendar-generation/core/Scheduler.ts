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
   * Travel is stored as occupied slots, not SimpleEvents - they get converted at the end
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

    // Get task's location for travel-aware scheduling
    const taskLocationId = task.locationId ?? null;

    // Step 1: Find all slots that can fit the base requirement (duration + buffer)
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

    // Step 2: Score ALL slots using the strategy (includes location adjacency scoring)
    const scoredSlots = this.scoreSlots(task, fittingSlots);

    // Step 3: Iterate through scored slots and find first one with enough capacity
    const bufferMinutes = this.slotManager.getBufferTimeMinutes();

    let selectedSlot: TimeSlot | null = null;
    let travelBefore = 0;
    let travelAfter = 0;

    for (const scoredSlot of scoredSlots) {
      // Find the original slot with location info
      const slot = fittingSlots.find(
        (s) => s.start.getTime() === scoredSlot.slot.start.getTime()
      );
      if (!slot) continue;

      // Calculate travel times based on location match
      // "Everywhere" (null) tasks don't need travel
      let needTravelBefore = 0;
      let needTravelAfter = 0;

      if (taskLocationId) {
        // Check if prev location is different (need travel before)
        if (slot.prevLocationId && slot.prevLocationId !== taskLocationId) {
          needTravelBefore = this.slotManager.getTravelTime(
            slot.prevLocationId,
            taskLocationId,
            slot.start
          );
        }

        // Check if next location is different (need travel after)
        if (slot.nextLocationId && slot.nextLocationId !== taskLocationId) {
          needTravelAfter = this.slotManager.getTravelTime(
            taskLocationId,
            slot.nextLocationId,
            slot.start
          );
        }
      }

      // Calculate total required time with proper buffer placement:
      // Layout: [buffer] -> [travelBefore] -> [buffer] -> [task] -> [buffer] -> [travelAfter] -> [buffer]
      // - No travel: [buffer] -> [task] -> [buffer] = 2 buffers
      // - Travel before only: [buffer] -> [travel] -> [buffer] -> [task] -> [buffer] = 3 buffers
      // - Travel after only: [buffer] -> [task] -> [buffer] -> [travel] -> [buffer] = 3 buffers
      // - Travel both: [buffer] -> [travel] -> [buffer] -> [task] -> [buffer] -> [travel] -> [buffer] = 4 buffers
      const numBuffers = 2 + (needTravelBefore > 0 ? 1 : 0) + (needTravelAfter > 0 ? 1 : 0);
      const totalRequired = task.duration + needTravelBefore + needTravelAfter + (numBuffers * bufferMinutes);

      // Check if this slot has enough capacity
      if (slot.durationMinutes >= totalRequired) {
        selectedSlot = slot;
        travelBefore = needTravelBefore;
        travelAfter = needTravelAfter;
        break;
      }
    }

    if (!selectedSlot) {
      this.metrics.tasksFailed++;
      return {
        success: false,
        failure: {
          taskId: task.id,
          taskTitle: task.title,
          reason: SchedulingFailureReason.NO_SLOTS,
          details: "No slots found with enough capacity for task + travel",
        },
      };
    }

    // Step 4: Calculate task times
    // Layout: [buffer] -> [travelBefore] -> [buffer] -> [task] -> [buffer] -> [travelAfter] -> [buffer]
    // Calculate offset to task start:
    // - Always start with leading buffer
    // - If travel before: add travel + another buffer before task
    // - If no travel before: task starts after the single leading buffer
    const offsetToTaskStart = travelBefore > 0
      ? bufferMinutes + travelBefore + bufferMinutes  // [buffer] -> [travel] -> [buffer] -> [task]
      : bufferMinutes;  // [buffer] -> [task]

    const taskStartDate = dateTimeService.addDuration(selectedSlot.start, offsetToTaskStart);
    const taskEndDate = dateTimeService.addDuration(taskStartDate, task.duration);

    // Calculate full reserved range (includes travel and all buffers)
    // This prevents other tasks from being scheduled in the travel time
    const fullReserveStart = selectedSlot.start;
    const offsetToEnd = travelAfter > 0
      ? task.duration + bufferMinutes + travelAfter + bufferMinutes
      : task.duration + bufferMinutes;
    const fullReserveEnd = dateTimeService.addDuration(taskStartDate, offsetToEnd);

    // Step 5: Reserve the full slot (task + travel time + buffers)
    // Travel events will be generated at the end from the timeline
    const reserved = this.slotManager.reserveSlot(
      fullReserveStart,
      fullReserveEnd,
      task.id,
      task.itemType as "task" | "goal" | "plan" | "template",
      taskLocationId
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

    // Create the main task event (travel events are created at the end from travel slots)
    const event: SimpleEvent = {
      userId: this.context.userId,
      id: task.id,
      title: task.title,
      start: taskStartDate.toISOString(),
      end: taskEndDate.toISOString(),
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

    // Add to scheduled events (travel events added later by CalendarGenerator)
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
