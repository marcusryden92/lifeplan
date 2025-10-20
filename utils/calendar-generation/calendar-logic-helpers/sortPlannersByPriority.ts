import { Planner, EventTemplate } from "@/prisma/generated/client";

export default function sortPlannersByPriority(
  planners: Planner[],
  goalsAndTasks: Planner[],
  templateEventsArray: EventTemplate[]
): Planner[] {
  const now = new Date();

  const totalPlannerTime = planners.reduce(
    (acc, planner) => acc + planner.duration,
    0
  );
  const totalTemplateTime = templateEventsArray.reduce(
    (acc, template) => acc + template.duration,
    0
  );
  const minutesPerWeek = 60 * 24 * 7;
  const totalTemplateGap = minutesPerWeek - totalTemplateTime;
  const plannerWeeks = Math.ceil(totalPlannerTime / totalTemplateGap);

  const totalTimeEstimate = totalPlannerTime + plannerWeeks * totalTemplateTime;

  const getMinutesBetween = (date1: Date, date2: Date) =>
    (date2.getTime() - date1.getTime()) / (1000 * 60);

  const sigmoid = (x: number, steepness = 4, midpoint = 0.7) => {
    return 1 / (1 + Math.exp(-steepness * (x - midpoint)));
  };

  const processedGoalsAndTasks = goalsAndTasks.map((item) => {
    let urgencyScore = 0;

    if (item.deadline) {
      const deadline = new Date(item.deadline);
      const minutesUntilDeadline = getMinutesBetween(now, deadline);

      // Ratio of task deadline to total estimated time
      let timeRatio = minutesUntilDeadline / totalTimeEstimate;
      timeRatio = Math.max(0, Math.min(1, timeRatio));

      // Gentler curve: starts mattering around 70% of time remaining
      const urgencyMultiplier = 1 - sigmoid(timeRatio);

      // Scale urgency from 0.3 to 1.0
      // This means urgency can boost priority by up to 3.3x
      const scaledUrgency = 0.3 + 0.7 * urgencyMultiplier;

      urgencyScore = item.priority * scaledUrgency;
    } else {
      // No deadline = 30% of full priority value
      urgencyScore = item.priority * 0.3;
    }

    return {
      ...item,
      urgencyScore,
    };
  });

  return processedGoalsAndTasks.sort((a, b) => b.urgencyScore - a.urgencyScore);
}
