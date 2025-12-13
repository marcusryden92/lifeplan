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
    let selectedReusableTravelStart: Date | null = null;

    // DEBUG: Log first few slots for this task
    console.log(`[Scheduler] Task "${task.title}" (loc: ${taskLocationId}) - first 3 scored slots (of ${scoredSlots.length} total), fittingSlots=${fittingSlots.length}:`);
    for (let i = 0; i < Math.min(3, scoredSlots.length); i++) {
      const ss = scoredSlots[i];
      const slot = fittingSlots.find(s => s.start.getTime() === ss.slot.start.getTime());
      console.log(`  ${i}: ${ss.slot.start.toISOString()} dur=${ss.slot.durationMinutes}min score=${ss.score.toFixed(3)} prev=${slot?.prevLocationId} next=${slot?.nextLocationId}`);
    }
    // Log if there's a small slot that might be the one after D1
    const smallSlots = scoredSlots.filter(ss => ss.slot.durationMinutes < 60);
    if (smallSlots.length > 0) {
      console.log(`  Small slots (<60min):`, smallSlots.map(ss => `${ss.slot.start.toISOString().slice(11,16)} dur=${ss.slot.durationMinutes} score=${ss.score.toFixed(3)}`));
    }
    // DEBUG: Log all fitting slots for D tasks
    if (task.title.startsWith('D')) {
      console.log(`  [DEBUG D task] All ${fittingSlots.length} fitting slots:`);
      fittingSlots.forEach((s, i) => {
        console.log(`    ${i}: ${s.start.toISOString().slice(11,16)}-${s.end.toISOString().slice(11,16)} dur=${s.durationMinutes}min prev=${s.prevLocationId} next=${s.nextLocationId}`);
      });
    }

    for (const scoredSlot of scoredSlots) {
      // Find the original slot with location info
      const slot = fittingSlots.find(
        (s) => s.start.getTime() === scoredSlot.slot.start.getTime()
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
            slot.start
          );
        }

        // Travel AFTER: needed if next location differs from task location
        // This travel will be placed at the END of the slot and shifts forward
        // as more tasks are added
        if (slot.nextLocationId && slot.nextLocationId !== taskLocationId) {
          needTravelAfter = this.slotManager.getTravelTime(
            taskLocationId,
            slot.nextLocationId,
            slot.start
          );
        }
      }
      // Note: If taskLocationId is null, prevLocationId passes through unchanged
      // (null tasks are "transparent" for travel purposes)

      // Calculate total required time:
      // Layout: [travelBefore] [buffer] [task] [buffer] [travelAfter]
      // Buffers separate items, not surround them
      // - 1 buffer between travelBefore and task (if travelBefore exists)
      // - 1 buffer between task and travelAfter/end
      //
      // Note: If there's existing travel to the same destination, it will be replaced
      // (travel "shifts forward"). In this case, we don't need extra space for travel-after
      // because we're reusing the existing travel's position.
      const numBuffers = 1 + (needTravelBefore > 0 ? 1 : 0);

      // Check if existing travel to the destination can be reused
      // Travel-after doesn't require NEW space if it replaces existing travel at the slot end
      let effectiveTravelAfter = needTravelAfter;
      let reusableTravelStart: Date | null = null;

      if (needTravelAfter > 0 && slot.nextLocationId) {
        // Check if there's already a travel slot going to nextLocationId near the end of this slot
        // If so, we can reuse it and don't need to reserve additional space
        reusableTravelStart = this.slotManager.findAdjacentTravelTo(
          slot.end,
          slot.nextLocationId
        );
        if (reusableTravelStart) {
          effectiveTravelAfter = 0;
          console.log(`    Found reusable travel to ${slot.nextLocationId} starting at ${reusableTravelStart.toISOString()} - effectiveTravelAfter=0`);
        }
      }

      const totalRequired = task.duration + needTravelBefore + effectiveTravelAfter + (numBuffers * bufferMinutes);

      // DEBUG: Log capacity check for first few slots
      console.log(`  Checking slot ${slot.start.toISOString()}: need=${totalRequired} (dur=${task.duration} + trvlB=${needTravelBefore} + trvlA=${effectiveTravelAfter} + buf=${numBuffers * bufferMinutes}) has=${slot.durationMinutes} -> ${slot.durationMinutes >= totalRequired ? 'FITS' : 'NO FIT'}`);

      // Check if this slot has enough capacity
      if (slot.durationMinutes >= totalRequired) {
        selectedSlot = slot;
        travelBefore = needTravelBefore;
        // Use effectiveTravelAfter - if we're reusing existing travel, don't create new travel
        travelAfter = effectiveTravelAfter;
        selectedReusableTravelStart = reusableTravelStart;
        console.log(`  -> Selected this slot! travelAfter=${travelAfter} (effective, not needTravelAfter=${needTravelAfter}), reusableTravelStart=${reusableTravelStart?.toISOString() ?? 'null'}`);
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
    const offsetToTaskStart = travelBefore > 0
      ? travelBefore + bufferMinutes  // [travel] [buffer] [task]
      : 0;  // [task] starts at slot start

    const taskStartDate = dateTimeService.addDuration(selectedSlot.start, offsetToTaskStart);
    const taskEndDate = dateTimeService.addDuration(taskStartDate, task.duration);

    // Calculate where task reservation ends (task + trailing buffer)
    const taskReserveEnd = dateTimeService.addDuration(taskEndDate, bufferMinutes);

    // Step 5: Reserve the slot with travel placement
    // Travel-before is placed at the START of the slot
    // Travel-after is placed at the END of the slot
    // Note: reserveSlotWithTravel expects task start/end times, not reservation times
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
      selectedReusableTravelStart
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

      // DEBUG: For D tasks, log detailed strategy scores for key slots
      if (task.title.startsWith('D') && (slot.durationMinutes < 60 || slot.durationMinutes === 100)) {
        const composite = this.strategy as any;
        if (composite.getDetailedScores) {
          const detailed = composite.getDetailedScores(task, slot, this.context);
          console.log(`  [DETAILED SCORES] ${task.title} slot ${slot.start.toISOString().slice(11,16)} dur=${slot.durationMinutes}:`, detailed, `-> final=${score.toFixed(3)}`);
        }
      }

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
