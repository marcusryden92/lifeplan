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
import { canScheduleAtTime } from "../utils/categoryConstraintUtils";

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

    // Get task's effective location for travel-aware scheduling
    // Prefer explicit task location; else inherit from category via context map
    const taskLocationId =
      (task.locationId ?? null) !== null
        ? task.locationId
        : (this.context.plannerLocationMap?.get(task.id) ?? null);

    // If task has a category and constraints are available, pass them to slot search
    const constraintForTask =
      task.categoryId && this.context.categoryConstraints
        ? this.context.categoryConstraints.get(task.categoryId) || undefined
        : undefined;

    // Step 1: Find all slots that can fit the base requirement (duration + buffer)
    // If task has a category and constraints are available, pass them to slot search
    // constraintForTask computed above (also used for location inheritance)

    const fittingSlots = this.slotManager.findAllFittingSlots(
      task.duration,
      afterTime || this.context.currentDate,
      undefined,
      constraintForTask,
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

    // Step 1.5: Filter slots by category time constraints
    const categoryConstraints = this.context.categoryConstraints;

    const validSlots = categoryConstraints
      ? fittingSlots.filter((slot) =>
          canScheduleAtTime(
            slot.start,
            task.categoryId,
            categoryConstraints,
            task.duration,
          ),
        )
      : fittingSlots;

    // Debug category filtering
    if (task.categoryId) {
      console.log(
        `Task ${task.title} (category: ${task.categoryId}): ${fittingSlots.length} slots → ${validSlots.length} valid`,
      );
    }

    if (validSlots.length === 0) {
      this.metrics.tasksFailed++;
      return {
        success: false,
        failure: {
          taskId: task.id,
          taskTitle: task.title,
          reason: SchedulingFailureReason.NO_SLOTS,
          details: `No available time slots found within category time constraints`,
        },
      };
    }

    // Step 2: Score ALL slots using the strategy (includes location adjacency scoring)
    const scoredSlots = this.scoreSlots(task, validSlots);

    // Step 3: Iterate through scored slots and find first one with enough capacity
    const bufferMinutes = this.slotManager.getBufferTimeMinutes();

    let selectedSlot: TimeSlot | null = null;
    let travelBefore = 0;
    let travelAfter = 0;
    let selectedReusableTravelStart: Date | null = null;

    for (const scoredSlot of scoredSlots) {
      // Find the original slot with location info
      const slot = fittingSlots.find(
        (s) => s.start.getTime() === scoredSlot.slot.start.getTime(),
      );
      if (!slot) continue;

      // Calculate travel times based on location
      // Null-location tasks ("everywhere") don't need travel - they're transparent
      let needTravelBefore = 0;
      let needTravelAfter = 0;

      if (taskLocationId) {
        // Travel BEFORE: needed if prev location differs from task location
        if (slot.prevLocationId && slot.prevLocationId !== taskLocationId) {
          needTravelBefore = this.slotManager.getTravelTime(
            slot.prevLocationId,
            taskLocationId,
            slot.start,
          );
        }

        // Travel AFTER: needed if next location differs from task location
        // This travel will be placed at the END of the slot and shifts forward
        // as more tasks are added
        if (slot.nextLocationId && slot.nextLocationId !== taskLocationId) {
          needTravelAfter = this.slotManager.getTravelTime(
            taskLocationId,
            slot.nextLocationId,
            slot.start,
          );
        }
      }
      // Note: If taskLocationId is null, prevLocationId passes through unchanged
      // (null tasks are "transparent" for travel purposes)

      // Calculate required inside-slot time:
      // Layout: [task] [buffer] [FREE] [travelAfter]
      // If travel-before can be placed outside, it is excluded from inside-slot requirement.

      // Check if existing travel to the destination can be reused
      // Travel-after doesn't require NEW space if it replaces existing travel at the slot end
      let effectiveTravelAfter = needTravelAfter;
      let reusableTravelStart: Date | null = null;

      if (needTravelAfter > 0 && slot.nextLocationId) {
        // Check if there's already a travel slot going to nextLocationId near the end of this slot
        // If so, we can reuse it and don't need to reserve additional space
        reusableTravelStart = this.slotManager.findAdjacentTravelTo(
          slot.end,
          slot.nextLocationId,
        );
        if (reusableTravelStart) {
          effectiveTravelAfter = 0;
        }
      }

      // If we can place travel-before outside the slot (ending buffer before slot.start),
      // reduce the inside-slot requirement accordingly.
      let canPlaceTravelOutside = false;
      let requiredInside = task.duration + effectiveTravelAfter + bufferMinutes; // buffer after task

      if (needTravelBefore > 0 && slot.prevLocationId && taskLocationId) {
        const travelEnd = new Date(
          slot.start.getTime() - bufferMinutes * 60000,
        );
        canPlaceTravelOutside = this.slotManager.canPlaceStandaloneTravelBefore(
          travelEnd,
          needTravelBefore,
        );
        if (!canPlaceTravelOutside) {
          // Fallback: include travel-before and its buffer inside the slot
          requiredInside += needTravelBefore + bufferMinutes;
        }
      } else {
        // No travel-before needed; requiredInside remains
      }

      // Check if this slot has enough capacity
      if (slot.durationMinutes >= requiredInside) {
        selectedSlot = slot;
        travelBefore = needTravelBefore;
        // Use effectiveTravelAfter - if we're reusing existing travel, don't create new travel
        travelAfter = effectiveTravelAfter;
        selectedReusableTravelStart = reusableTravelStart;
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
    // Layout: [travelBefore] [buffer] [task] [buffer] [FREE] [travelAfter]
    // Travel-after is placed at the END of the slot, free space is between task and travel-after

    // Calculate offset to task start from slot start
    // If travel-before is placed outside, task starts at slot.start.
    // Otherwise, task starts after [travel-before + buffer] inside the slot.
    let offsetToTaskStart = 0;
    if (travelBefore > 0) {
      const travelEnd = new Date(
        selectedSlot.start.getTime() - bufferMinutes * 60000,
      );
      const canPlaceOutside = this.slotManager.canPlaceStandaloneTravelBefore(
        travelEnd,
        travelBefore,
      );
      offsetToTaskStart = canPlaceOutside ? 0 : travelBefore + bufferMinutes;
    }

    const taskStartDate = dateTimeService.addDuration(
      selectedSlot.start,
      offsetToTaskStart,
    );
    const taskEndDate = dateTimeService.addDuration(
      taskStartDate,
      task.duration,
    );

    // Step 5: Reserve the slot with travel placement
    // Travel-before is placed at the START of the slot
    // Travel-after is placed at the END of the slot
    // Note: reserveSlotWithTravel expects task start/end times, not reservation times
    // If placing travel-before outside, reserve it separately and omit travel-before inside
    if (travelBefore > 0) {
      const travelEnd = new Date(
        selectedSlot.start.getTime() - bufferMinutes * 60000,
      );
      const placed = this.slotManager.reserveStandaloneTravelBefore(
        travelEnd,
        travelBefore,
        selectedSlot.prevLocationId as string,
        taskLocationId as string,
        task.id,
      );
      if (!placed.success) {
        // Fallback handled by offsetToTaskStart above (travel placed inside the slot)
      } else {
        // Travel-before placed outside; do not include it inside reserveSlotWithTravel
        travelBefore = 0;
      }
    }

    const result = this.slotManager.reserveSlotWithTravel(
      taskStartDate,
      taskEndDate,
      task.id,
      task.itemType as "task" | "goal" | "plan" | "template",
      taskLocationId,
      travelBefore,
      travelAfter,
      selectedSlot.prevLocationId ?? null,
      selectedSlot.nextLocationId ?? null,
      selectedReusableTravelStart,
    );
    const reserved = result.success;

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

    // Check if this task is within a category time slot and get the wrapper ID
    let categoryWrapperId: string | null = null;

    if (task.categoryId && this.context.categoryConstraints) {
      const constraint = this.context.categoryConstraints.get(task.categoryId);

      if (constraint && constraint.timeSlots.length > 0) {
        // Task is in a category with time constraints
        // Generate wrapper ID based on category, day, and time slot
        const dayOfWeek = taskStartDate.getDay();
        const timeSlots = constraint.timeSlots;

        for (const slot of timeSlots) {
          if (slot.days.includes(dayOfWeek)) {
            const startTime = `${String(taskStartDate.getHours()).padStart(2, "0")}:${String(
              taskStartDate.getMinutes(),
            ).padStart(2, "0")}`;

            console.log(
              `  - Checking slot ${slot.startTime}-${slot.endTime} for day ${dayOfWeek}, task starts at ${startTime}`,
            );

            if (startTime >= slot.startTime && startTime < slot.endTime) {
              // This task falls within this category slot
              categoryWrapperId = `${constraint.id}-${dayOfWeek}-${slot.startTime}-${slot.endTime}`;
              console.log(`  ✅ Assigned wrapper ID: ${categoryWrapperId}`);
              break;
            }
          }
        }
      }
    }

    if (!categoryWrapperId && task.categoryId) {
      console.log(
        `  ⚠️ Task ${task.title} has categoryId but NO wrapper ID assigned`,
      );
    }

    // Create the main task event (travel events are created at the end from travel slots)
    // Build extendedProps with only schema fields, then add runtime fields
    const baseExtendedProps = {
      id: uuidv4(),
      eventId: task.id,
      itemType: task.itemType,
      completedEndTime: null,
      completedStartTime: null,
      parentId: task.parentId || null,
    };

    const event: SimpleEvent = {
      userId: this.context.userId,
      id: task.id,
      title: task.title,
      start: taskStartDate.toISOString(),
      end: taskEndDate.toISOString(),
      extendedProps: categoryWrapperId
        ? { ...baseExtendedProps, categoryWrapperId }
        : baseExtendedProps,
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

    // Sort by score (highest first), then by start time (earliest first) as tiebreaker
    return scored.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      return a.slot.start.getTime() - b.slot.start.getTime();
    });
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
