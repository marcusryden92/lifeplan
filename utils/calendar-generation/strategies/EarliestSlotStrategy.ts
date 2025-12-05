/**
 * EarliestSlotStrategy
 *
 * Simple strategy that prefers the earliest available time slot.
 * Useful as a fallback or for tasks without special requirements.
 */

import { Planner } from "@/types/prisma";
import { TimeSlot } from "../models/TimeSlot";
import { SchedulingContext } from "../models/SchedulingModels";
import { SchedulingStrategy } from "./SchedulingStrategy";
import { dateTimeService } from "../utils/dateTimeService";
import { SCHEDULING_CONFIG } from "../constants";

export class EarliestSlotStrategy implements SchedulingStrategy {
  readonly name = "earliest";

  score(task: Planner, slot: TimeSlot, context: SchedulingContext): number {
    const daysFromNow = dateTimeService.getDaysDifference(
      context.currentDate,
      slot.start
    );

    // Linear decay: 1.0 for now, 0.0 for MAX_DAYS_TO_SEARCH
    const maxDays = SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH;
    const score = Math.max(0, 1 - daysFromNow / maxDays);

    return score;
  }
}
