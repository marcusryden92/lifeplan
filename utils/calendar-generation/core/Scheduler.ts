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

    // Step 1: Find all slots that can fit, including reclaimable travel slots
    // This allows same-location tasks to "absorb" adjacent travel time
    const fittingSlots = this.slotManager.findAllFittingSlotsWithTravelReclaim(
      task.duration,
      taskLocationId,
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
    const baseRequired = task.duration + (2 * bufferMinutes);

    let selectedSlot: (TimeSlot & { reclaimableTravelBefore: number; reclaimableTravelAfter: number }) | null = null;
    let travelBefore = 0;
    let travelAfter = 0;
    let reclaimBefore = false;
    let reclaimAfter = false;

    for (const scoredSlot of scoredSlots) {
      // Find the original slot with location and reclaim info
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
        // But if we can reclaim travel, we don't need new travel on that side
        if (slot.prevLocationId && slot.prevLocationId !== taskLocationId) {
          if (slot.reclaimableTravelBefore > 0) {
            // We can reclaim this travel - the slot already accounts for it in durationMinutes
            reclaimBefore = true;
          } else {
            needTravelBefore = this.slotManager.getTravelTime(
              slot.prevLocationId,
              taskLocationId,
              slot.start
            );
          }
        }

        // Check if next location is different (need travel after)
        if (slot.nextLocationId && slot.nextLocationId !== taskLocationId) {
          if (slot.reclaimableTravelAfter > 0) {
            // We can reclaim this travel
            reclaimAfter = true;
          } else {
            needTravelAfter = this.slotManager.getTravelTime(
              taskLocationId,
              slot.nextLocationId,
              slot.start
            );
          }
        }
      }

      const totalRequired = baseRequired + needTravelBefore + needTravelAfter;

      // Check if this slot has enough capacity
      // Note: slot.durationMinutes already includes reclaimable travel time
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

    // Step 4: If reclaiming travel slots, do that first
    if (reclaimBefore && selectedSlot.reclaimableTravelBefore > 0) {
      this.slotManager.reclaimAdjacentTravelSlot(selectedSlot, "before");
    }
    if (reclaimAfter && selectedSlot.reclaimableTravelAfter > 0) {
      this.slotManager.reclaimAdjacentTravelSlot(selectedSlot, "after");
    }

    // Step 5: Calculate task times
    // Layout: [slot.start] -> [buffer] -> [travelBefore] -> [task] -> [travelAfter] -> [buffer]
    // If we reclaimed travel before, we insert at the reclaimed position (earlier)
    const effectiveStart = reclaimBefore
      ? new Date(selectedSlot.start.getTime() - selectedSlot.reclaimableTravelBefore * 60000)
      : selectedSlot.start;

    const taskStartDate = dateTimeService.addDuration(
      effectiveStart,
      bufferMinutes + travelBefore
    );
    const taskEndDate = dateTimeService.addDuration(taskStartDate, task.duration);

    // Step 6: Reserve the slot with travel (travel stored as occupied slots, not events)
    const reserveResult = this.slotManager.reserveSlotWithTravel(
      taskStartDate,
      taskEndDate,
      task.id,
      task.itemType as "task" | "goal" | "plan" | "template",
      taskLocationId,
      travelBefore,
      travelAfter,
      selectedSlot.prevLocationId ?? null,
      selectedSlot.nextLocationId ?? null
    );

    if (!reserveResult.success) {
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
