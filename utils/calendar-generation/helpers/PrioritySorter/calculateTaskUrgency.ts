import { Planner } from "@/types/prisma";
import { URGENCY_CONFIG } from "../../constants";

export function calculateTaskUrgency(
  task: Planner,
  context: { currentDate: Date; totalEstimatedTime: number }
): number {
  if (!task.deadline) {
    return task.priority * URGENCY_CONFIG.MIN_URGENCY_MULTIPLIER;
  }

  const deadline = new Date(task.deadline);
  const minutesUntilDeadline =
    (deadline.getTime() - context.currentDate.getTime()) / (1000 * 60);

  let timeRatio = minutesUntilDeadline / context.totalEstimatedTime;
  timeRatio = Math.max(0, Math.min(1, timeRatio));

  const sigmoid =
    1 /
    (1 +
      Math.exp(
        -URGENCY_CONFIG.CURVE_STEEPNESS *
          (timeRatio - URGENCY_CONFIG.CRITICAL_THRESHOLD)
      ));
  const urgencyMultiplier = 1 - sigmoid;

  const scaledUrgency =
    URGENCY_CONFIG.URGENCY_SCALE_MIN +
    (URGENCY_CONFIG.URGENCY_SCALE_MAX - URGENCY_CONFIG.URGENCY_SCALE_MIN) *
      urgencyMultiplier;

  return task.priority * scaledUrgency;
}
