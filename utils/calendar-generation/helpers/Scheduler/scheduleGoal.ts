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
import {
  GoalCapState,
  goalDayCapMinutes,
  seedGoalDayLedger,
  buildGoalCapContext,
  wholeBlockSizing,
} from "./goalDayCap";

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
  goalCapState: GoalCapState,
  allowDayCapRelaxation = false,
): { scheduled: boolean; permanentFailure: boolean } {
  const goalTasks = getSortedTreeBottomLayer(allPlanners, goal.id).filter(
    (t) =>
      !taskIsCompleted(t) &&
      !scheduledTaskIds.has(t.id) &&
      !memoizedEventIds.has(t.id)
  );

  const dayCap = goalDayCapMinutes(goal);
  let goalCap = undefined;
  if (dayCap !== null) {
    seedGoalDayLedger(
      goal,
      allPlanners,
      scheduler.context.scheduledEvents,
      goalCapState,
    );
    goalCap = buildGoalCapContext(goal, dayCap, goalCapState);
  }

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
        goalCap,
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

    // A leaf bigger than the goal's daily cap can never place under it — no
    // horizon expansion creates such a day, so it places whole immediately
    // (recorded as an oversizedLeaf compromise) instead of starving the loop.
    const oversizedLeaf = goalCap !== undefined && task.duration > dayCap!;
    let res =
      goalCap && !oversizedLeaf
        ? scheduler.scheduleTask(
            task,
            goalAfterTime,
            wholeBlockSizing(task.duration, goalCap.budget),
          )
        : scheduler.scheduleTask(task, goalAfterTime);
    let dayCapRelaxed = false;
    if (goalCap && !oversizedLeaf && !res.success && allowDayCapRelaxation) {
      res = scheduler.scheduleTask(task, goalAfterTime);
      dayCapRelaxed = res.success;
    }

    if (res.success && res.event) {
      if (goalCap) {
        const start = new Date(res.event.start);
        const end = new Date(res.event.end);
        const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
        if (oversizedLeaf) {
          goalCap.recordRelaxation("oversizedLeaf", minutes, res.event.start);
        } else if (dayCapRelaxed && goalCap.budget(start) < minutes) {
          goalCap.recordRelaxation("dayCap", minutes, res.event.start);
        }
        goalCap.charge(start, end);
      }
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
