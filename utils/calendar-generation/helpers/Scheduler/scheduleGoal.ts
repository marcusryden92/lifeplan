import { Planner, SimpleEvent, Category } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { SchedulingFailure } from "../../models/SchedulingModels";
import { SchedulingFailureReason } from "../../constants";
import { getSortedTreeBottomLayer } from "../../../goalPageHandlers";
import { taskIsCompleted } from "../../../taskHelpers";
import { PerTemplateMask } from "../../models/TemplateModels";
import { maxEffectiveCapacityFor } from "./capacityCheck";

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
  currentDate: Date,
  capacityCache: Map<string, number>,
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
      continue;
    }

    const res = scheduler.scheduleTask(task, goalAfterTime);

    if (res.success && res.event) {
      events.push(res.event);
      scheduledTaskIds.add(task.id);
      goalAfterTime = new Date(res.event.end);
    } else if (res.failure) {
      if (res.failure.reason === SchedulingFailureReason.NO_SLOTS) {
        goalFailedDueToNoSlots = true;
        break;
      } else {
        failures.push(res.failure);
      }
    }
  }

  return {
    scheduled: !goalFailedDueToNoSlots,
    permanentFailure: false,
  };
}
