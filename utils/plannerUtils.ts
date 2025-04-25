import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "@/types/calendarTypes";
import { EventTemplate } from "./templateBuilderUtils";

export const hasInfluence = (mainPlanner: Planner[]): boolean => {
  return !mainPlanner.some((task) => task.canInfluence === true);
};

export const deletePlanner = (
  setMainPlanner: (arg: any, manuallyUpdatedCalendar?: SimpleEvent[]) => void,
  taskId: string,
  currentCalendar?: SimpleEvent[]
) => {
  let manuallyUpdatedCalendar: SimpleEvent[] = [];

  if (currentCalendar && currentCalendar.length > 0)
    manuallyUpdatedCalendar = currentCalendar?.filter(
      (e) => !(e.id === taskId)
    );

  setMainPlanner(
    (prev: Planner[]) => prev.filter((planner) => !(planner.id === taskId)),
    manuallyUpdatedCalendar
  );
};
