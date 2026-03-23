import { Planner, SimpleEvent } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { SchedulingFailure } from "../../models/SchedulingModels";
import { SchedulingFailureReason } from "../../constants";
import { getSortedTreeBottomLayer } from "../../../goalPageHandlers";
import { taskIsCompleted } from "../../../taskHelpers";

export function scheduleGoal(
  goal: Planner,
  allPlanners: Planner[],
  scheduledTaskIds: Set<string>,
  memoizedEventIds: Set<string>,
  largestTemplateGap: number,
  failures: SchedulingFailure[],
  events: SimpleEvent[],
  scheduler: Scheduler
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
    if (largestTemplateGap && task.duration > largestTemplateGap) {
      failures.push({
        taskId: task.id,
        taskTitle: task.title,
        reason: SchedulingFailureReason.TOO_LARGE,
        details: `Task duration (${task.duration} min) exceeds largest template gap (${largestTemplateGap} min)`,
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
