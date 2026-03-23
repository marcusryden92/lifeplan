import { Planner, SimpleEvent } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { SchedulingFailure } from "../../models/SchedulingModels";
import { SchedulingFailureReason } from "../../constants";

export function scheduleSingleTask(
  task: Planner,
  scheduledTaskIds: Set<string>,
  largestTemplateGap: number,
  failures: SchedulingFailure[],
  scheduler: Scheduler
): {
  scheduled: boolean;
  permanentFailure: boolean;
  event?: SimpleEvent;
} {
  if (scheduledTaskIds.has(task.id)) {
    return { scheduled: true, permanentFailure: false };
  }

  if (largestTemplateGap && task.duration > largestTemplateGap) {
    failures.push({
      taskId: task.id,
      taskTitle: task.title,
      reason: SchedulingFailureReason.TOO_LARGE,
      details: `Task duration (${task.duration} min) exceeds largest template gap (${largestTemplateGap} min)`,
    });
    return { scheduled: false, permanentFailure: true };
  }

  const result = scheduler.scheduleTask(task);

  if (result.success && result.event) {
    scheduledTaskIds.add(task.id);
    return { scheduled: true, permanentFailure: false, event: result.event };
  } else if (result.failure) {
    if (result.failure.reason !== SchedulingFailureReason.NO_SLOTS) {
      failures.push(result.failure);
      return { scheduled: false, permanentFailure: true };
    }
    return { scheduled: false, permanentFailure: false };
  }

  return { scheduled: false, permanentFailure: false };
}
