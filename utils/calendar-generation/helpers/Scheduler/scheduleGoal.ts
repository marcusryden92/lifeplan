import { Planner, SimpleEvent, Category } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { SchedulingFailure } from "../../models/SchedulingModels";
import { SchedulingFailureReason } from "../../constants";
import { getSortedTreeBottomLayer } from "../../../goalPageHandlers";
import { taskIsCompleted } from "../../../taskHelpers";
import { PerTemplateMask } from "../../models/TemplateModels";
import { maxEffectiveCapacityFor } from "./capacityCheck";
import { parseTaskSplitting, minChunkRequired } from "../../../taskSplitting";
import {
  SplitPlacementState,
  scheduleSplitTask,
  splitRemainingForRun,
} from "./scheduleSplitTask";

export function scheduleGoal(
  goal: Planner,
  allPlanners: Planner[],
  scheduledTaskIds: Set<string>,
  memoizedEventIds: Set<string>,
  failures: SchedulingFailure[],
  events: SimpleEvent[],
  scheduler: Scheduler,
  perTemplateMasks: PerTemplateMask[],
  categories: Category[],
  plannerCategoryMap: Map<string, string | null>,
  categoryEligibilityMap: Map<string, Set<string>>,
  currentDate: Date,
  capacityCache: Map<string, number>,
  splitState: SplitPlacementState,
  allowDayCapRelaxation = false,
): { scheduled: boolean; permanentFailure: boolean } {
  const goalTasks = getSortedTreeBottomLayer(allPlanners, goal.id).filter(
    (t) =>
      !taskIsCompleted(t) &&
      !scheduledTaskIds.has(t.id) &&
      !memoizedEventIds.has(t.id)
  );

  let goalFailedDueToNoSlots = false;
  let goalAfterTime: Date | undefined = undefined;

  for (const task of goalTasks) {
    const splitSettings = parseTaskSplitting(task.splitting);

    const maxCapacity = maxEffectiveCapacityFor(
      task,
      perTemplateMasks,
      categories,
      plannerCategoryMap,
      currentDate,
      categoryEligibilityMap,
      capacityCache,
    );

    // A split leaf only needs room for its required minimum chunk.
    const requiredBlockMinutes = splitSettings
      ? minChunkRequired(splitRemainingForRun(task, splitState), splitSettings)
      : task.duration;

    if (requiredBlockMinutes > maxCapacity) {
      failures.push({
        taskId: task.id,
        taskTitle: task.title,
        reason: SchedulingFailureReason.TOO_LARGE,
        details: `Task duration (${requiredBlockMinutes} min${splitSettings ? ", minimum chunk" : ""}) exceeds max effective capacity (${maxCapacity} min) given templates and category constraints`,
        context: { duration: requiredBlockMinutes, maxCapacity },
      });
      continue;
    }

    if (splitSettings) {
      // A split leaf runs the chunk loop to exhaustion; every chunk stays
      // after the previous leaf's end, and the NEXT leaf chains after the
      // last chunk — the split item acts as one dependency link.
      const result = scheduleSplitTask({
        task,
        settings: splitSettings,
        scheduler,
        state: splitState,
        afterTime: goalAfterTime,
        allowDayCapRelaxation,
      });
      events.push(...result.events);
      for (const e of result.events) {
        const end = new Date(e.end);
        if (!goalAfterTime || end > goalAfterTime) goalAfterTime = end;
      }
      if (result.fullyPlaced) {
        scheduledTaskIds.add(task.id);
      } else {
        if (result.failure) failures.push(result.failure);
        goalFailedDueToNoSlots = true;
        break;
      }
      continue;
    }

    const res = scheduler.scheduleTask(task, goalAfterTime);

    if (res.success && res.event) {
      events.push(res.event);
      scheduledTaskIds.add(task.id);
      goalAfterTime = new Date(res.event.end);
    } else if (res.failure) {
      // Push NO_SLOTS the same as any other failure so the engine console
      // sees goals that ran out of horizon. scheduleTasksAndGoals filters
      // failures for taskIds that eventually got scheduled on retry, so a
      // task that succeeds after horizon expansion won't leave a phantom row.
      failures.push(res.failure);
      if (res.failure.reason === SchedulingFailureReason.NO_SLOTS) {
        goalFailedDueToNoSlots = true;
        break;
      }
    }
  }

  return {
    scheduled: !goalFailedDueToNoSlots,
    permanentFailure: false,
  };
}
