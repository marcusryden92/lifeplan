/**
 * UrgencyStrategy
 *
 * Scores time slots based on task urgency and deadlines.
 * Tasks closer to their deadline get higher priority for earlier slots.
 */

import { Planner } from "@/types/prisma";
import { TimeSlot } from "../models/TimeSlot";
import { SchedulingContext } from "../models/SchedulingModels";
import { SchedulingStrategy } from "./SchedulingStrategy";
import { URGENCY_CONFIG } from "../constants";
import { dateTimeService } from "../utils/dateTimeService";

export class UrgencyStrategy implements SchedulingStrategy {
  readonly name = "urgency";

  score(task: Planner, slot: TimeSlot, context: SchedulingContext): number {
    // If no deadline, prefer earlier slots slightly
    if (!task.deadline) {
      return this.scoreWithoutDeadline(slot, context);
    }

    const deadline = new Date(task.deadline);
    const slotStart = slot.start;
    const now = context.currentDate;

    // Calculate time ratios
    const totalTimeToDeadline = dateTimeService.getMinutesDifference(
      now,
      deadline
    );
    const timeToSlot = dateTimeService.getMinutesDifference(now, slotStart);

    // If slot is after deadline, penalize heavily
    if (slotStart > deadline) {
      const overtimeMinutes = dateTimeService.getMinutesDifference(
        deadline,
        slotStart
      );
      // Exponential penalty for scheduling after deadline
      return Math.max(0, 1 - overtimeMinutes / (24 * 60)); // Goes to 0 after 1 day
    }

    // Calculate urgency multiplier using sigmoid curve
    const timeRatio = timeToSlot / totalTimeToDeadline;
    const urgencyScore = this.calculateUrgency(timeRatio);

    // Prefer slots closer to now for urgent tasks
    // Prefer slots with more buffer for non-urgent tasks
    const timePreference = this.calculateTimePreference(
      timeToSlot,
      totalTimeToDeadline
    );

    // Combine urgency and time preference
    return urgencyScore * 0.7 + timePreference * 0.3;
  }

  /**
   * Score for tasks without deadlines
   * Slight preference for earlier slots
   */
  private scoreWithoutDeadline(
    slot: TimeSlot,
    context: SchedulingContext
  ): number {
    const daysFromNow = dateTimeService.getDaysDifference(
      context.currentDate,
      slot.start
    );

    // Linear decay: 1.0 for today, 0.3 for 90 days out
    const maxDays = 90;
    const score = Math.max(
      URGENCY_CONFIG.MIN_URGENCY_MULTIPLIER,
      1 - (daysFromNow / maxDays) * 0.7
    );

    return score;
  }

  /**
   * Calculate urgency using sigmoid curve
   * Returns value from MIN_URGENCY_MULTIPLIER to MAX_URGENCY_MULTIPLIER
   */
  private calculateUrgency(timeRatio: number): number {
    // Clamp timeRatio to [0, 1]
    const clampedRatio = Math.max(0, Math.min(1, timeRatio));

    // Sigmoid function: high urgency when time ratio is low (closer to deadline)
    const sigmoid =
      1 /
      (1 +
        Math.exp(
          -URGENCY_CONFIG.CURVE_STEEPNESS *
            (clampedRatio - URGENCY_CONFIG.CRITICAL_THRESHOLD)
        ));

    // Invert so that low time ratio = high urgency
    const invertedSigmoid = 1 - sigmoid;

    // Scale to desired range
    return (
      URGENCY_CONFIG.URGENCY_SCALE_MIN +
      (URGENCY_CONFIG.URGENCY_SCALE_MAX - URGENCY_CONFIG.URGENCY_SCALE_MIN) *
        invertedSigmoid
    );
  }

  /**
   * Calculate preference for slot timing
   * Earlier is better for urgent tasks, later is fine for non-urgent
   */
  private calculateTimePreference(
    timeToSlot: number,
    totalTimeToDeadline: number
  ): number {
    if (totalTimeToDeadline === 0) return 1;

    const ratio = timeToSlot / totalTimeToDeadline;

    // For urgent tasks (ratio < 0.3), strongly prefer earlier
    if (ratio < 0.3) {
      return 1 - ratio / 0.3;
    }

    // For non-urgent tasks, gradually decrease preference
    return Math.max(0.3, 1 - ratio);
  }

  /**
   * Calculate overall task urgency (used for sorting tasks)
   * This matches the original sortPlannersByPriority logic
   */
  static calculateTaskUrgency(
    task: Planner,
    context: {
      currentDate: Date;
      totalEstimatedTime: number;
    }
  ): number {
    if (!task.deadline) {
      return task.priority * URGENCY_CONFIG.MIN_URGENCY_MULTIPLIER;
    }

    const deadline = new Date(task.deadline);
    const minutesUntilDeadline = dateTimeService.getMinutesDifference(
      context.currentDate,
      deadline
    );

    // Ratio of time until deadline to total estimated time
    let timeRatio = minutesUntilDeadline / context.totalEstimatedTime;
    timeRatio = Math.max(0, Math.min(1, timeRatio));

    // Sigmoid curve for urgency
    const sigmoid =
      1 /
      (1 +
        Math.exp(
          -URGENCY_CONFIG.CURVE_STEEPNESS *
            (timeRatio - URGENCY_CONFIG.CRITICAL_THRESHOLD)
        ));
    const urgencyMultiplier = 1 - sigmoid;

    // Scale urgency
    const scaledUrgency =
      URGENCY_CONFIG.URGENCY_SCALE_MIN +
      (URGENCY_CONFIG.URGENCY_SCALE_MAX - URGENCY_CONFIG.URGENCY_SCALE_MIN) *
        urgencyMultiplier;

    return task.priority * scaledUrgency;
  }
}
