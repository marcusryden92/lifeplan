/**
 * Schedule Tasks
 *
 * Batch scheduling loop that schedules multiple tasks sequentially.
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { TimeSlotManager } from "../../TimeSlotManager";
import { SchedulingStrategy } from "../../../strategies/SchedulingStrategy";
import {
  SchedulingContext,
  SchedulingResult,
  SchedulingFailure,
  SchedulingMetrics,
} from "../../../models/SchedulingModels";
import { scheduleTask } from "./scheduleTask";

export function scheduleTasks(
  tasks: Planner[],
  slotManager: TimeSlotManager,
  strategy: SchedulingStrategy,
  context: SchedulingContext,
  getMetrics: () => SchedulingMetrics,
): SchedulingResult {
  const events: SimpleEvent[] = [...context.scheduledEvents];
  const failures: SchedulingFailure[] = [];

  for (const task of tasks) {
    const result = scheduleTask(task, slotManager, strategy, context);

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
    metrics: getMetrics(),
  };
}
