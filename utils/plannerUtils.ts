import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "@/types/calendarTypes";

export const deletePlanner = (
  setMainPlanner: (
    arg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => void,
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
