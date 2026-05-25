import { Planner, SimpleEvent, Category } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { SchedulingFailure } from "../../models/SchedulingModels";
import { SchedulingFailureReason } from "../../constants";
import { PerTemplateMask } from "../../models/TemplateModels";
import { maxEffectiveCapacityFor } from "./capacityCheck";

export function scheduleSingleTask(
  task: Planner,
  scheduledTaskIds: Set<string>,
  failures: SchedulingFailure[],
  scheduler: Scheduler,
  perTemplateMasks: PerTemplateMask[],
  categories: Category[],
  plannerCategoryMap: Map<string, string | null>,
  currentDate: Date,
  capacityCache: Map<string, number>,
): {
  scheduled: boolean;
  permanentFailure: boolean;
  event?: SimpleEvent;
} {
  if (scheduledTaskIds.has(task.id)) {
    return { scheduled: true, permanentFailure: false };
  }

  const maxCapacity = maxEffectiveCapacityFor(
    task,
    perTemplateMasks,
    categories,
    plannerCategoryMap,
    currentDate,
    capacityCache,
  );

  if (task.duration > maxCapacity) {
    failures.push({
      taskId: task.id,
      taskTitle: task.title,
      reason: SchedulingFailureReason.TOO_LARGE,
      details: `Task duration (${task.duration} min) exceeds max effective capacity (${maxCapacity} min) given templates and category constraints`,
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
