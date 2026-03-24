/**
 * EarliestSlotStrategy
 *
 * Simple strategy that prefers earlier time slots.
 * Acts as a baseline for other strategies to compete against.
 *
 * Score is based on how early in the scheduling window the slot is:
 * - Slots today score highest
 * - Slots further in the future score lower
 */

import { Planner } from "@/types/prisma";
import { AvailableSlot } from "../models/TimeSlot";
import { SchedulingContext } from "../models/SchedulingModels";
import { SchedulingStrategy } from "./SchedulingStrategy";

export class EarliestSlotStrategy implements SchedulingStrategy {
  readonly name = "earliestSlot";

  /**
   * Score a slot based on how early it is.
   * Earlier slots get higher scores.
   *
   * @param task - The task (ignored - scoring is task-independent)
   * @param slot - The time slot to score
   * @param context - Scheduling context with current date
   * @returns Score from 0.0 to 1.0 (higher = earlier = better)
   */
  score(_task: Planner, slot: AvailableSlot, context: SchedulingContext): number {
    const now = context.currentDate;
    const slotStart = slot.start;

    // Calculate days from now to slot
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysFromNow = (slotStart.getTime() - now.getTime()) / msPerDay;

    // Score decays over 14 days (typical scheduling window)
    // Day 0 = 1.0, Day 14 = 0.0
    const maxDays = 14;
    const score = Math.max(0, 1 - daysFromNow / maxDays);

    return score;
  }
}
