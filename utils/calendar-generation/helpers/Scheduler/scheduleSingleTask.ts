import { Planner, SimpleEvent, Category } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { SchedulingFailure } from "../../models/SchedulingModels";
import { SchedulingFailureReason } from "../../constants";
import { PerTemplateMask } from "../../models/TemplateModels";
import { maxEffectiveCapacityFor } from "./capacityCheck";
import { parseTaskSplitting, minChunkRequired } from "../../../taskSplitting";
import { maxAllowedBlockMinutes } from "../../../allowedTimes";
import {
  SplitPlacementState,
  scheduleSplitTask,
  splitRemainingForRun,
} from "./scheduleSplitTask";

export function scheduleSingleTask(
  task: Planner,
  scheduledTaskIds: Set<string>,
  failures: SchedulingFailure[],
  scheduler: Scheduler,
  perTemplateMasks: PerTemplateMask[],
  categories: Category[],
  plannerCategoryMap: Map<string, string | null>,
  categoryEligibilityMap: Map<string, Set<string>>,
  currentDate: Date,
  capacityCache: Map<string, number>,
  splitState: SplitPlacementState,
  allowDayCapRelaxation = false,
): {
  scheduled: boolean;
  permanentFailure: boolean;
  events: SimpleEvent[];
} {
  if (scheduledTaskIds.has(task.id)) {
    return { scheduled: true, permanentFailure: false, events: [] };
  }

  const splitSettings = parseTaskSplitting(task.splitting);

  // The allowed-times chain caps the largest contiguous block the task could
  // ever occupy, independent of templates — without it an impossible duration
  // burns the whole expansion budget hunting for a window that cannot exist.
  const allowedCeiling = maxAllowedBlockMinutes(
    scheduler.context.plannerConstraintsMap?.get(task.id)?.allowedTimes ?? [],
  );
  const maxCapacity = Math.min(
    maxEffectiveCapacityFor(
      task,
      perTemplateMasks,
      categories,
      plannerCategoryMap,
      currentDate,
      categoryEligibilityMap,
      capacityCache,
    ),
    allowedCeiling,
  );

  // A split task only needs room for its required minimum chunk, not the
  // whole duration — it is TOO_LARGE only when not even that fits anywhere.
  const requiredBlockMinutes = splitSettings
    ? minChunkRequired(splitRemainingForRun(task, splitState), splitSettings)
    : task.duration;

  if (requiredBlockMinutes > maxCapacity) {
    failures.push({
      taskId: task.id,
      taskTitle: task.title,
      reason: SchedulingFailureReason.TOO_LARGE,
      details: `Task duration (${requiredBlockMinutes} min${splitSettings ? ", minimum chunk" : ""}) exceeds max effective capacity (${maxCapacity} min) given templates, category, and allowed-time constraints`,
      context: { duration: requiredBlockMinutes, maxCapacity },
    });
    return { scheduled: false, permanentFailure: true, events: [] };
  }

  if (splitSettings) {
    const result = scheduleSplitTask({
      task,
      settings: splitSettings,
      scheduler,
      state: splitState,
      allowDayCapRelaxation,
    });
    if (result.fullyPlaced) {
      scheduledTaskIds.add(task.id);
      return { scheduled: true, permanentFailure: false, events: result.events };
    }
    if (result.failure) {
      failures.push(result.failure);
    }
    // Partial placements stay on the calendar; the task remains a candidate
    // and resumes from its remainder after the next horizon expansion.
    return {
      scheduled: false,
      permanentFailure: false,
      events: result.events,
    };
  }

  const result = scheduler.scheduleTask(task);

  if (result.success && result.event) {
    scheduledTaskIds.add(task.id);
    return {
      scheduled: true,
      permanentFailure: false,
      events: [result.event],
    };
  } else if (result.failure) {
    // NO_SLOTS was previously swallowed to let the outer loop retry the task
    // after other placements freed up room. Retries still apply — the caller
    // uses permanentFailure to decide — but the failure now surfaces to the
    // engine console so a task that never fits doesn't disappear silently.
    failures.push(result.failure);
    if (result.failure.reason !== SchedulingFailureReason.NO_SLOTS) {
      return { scheduled: false, permanentFailure: true, events: [] };
    }
    return { scheduled: false, permanentFailure: false, events: [] };
  }

  return { scheduled: false, permanentFailure: false, events: [] };
}
