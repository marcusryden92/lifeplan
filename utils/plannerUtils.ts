import { Planner } from "@/prisma/generated/client";
import { SimpleEvent } from "@/prisma/generated/client";
export const deletePlanner = (
  updatePlannerArray: (
    arg: Planner[] | ((prev: Planner[]) => Planner[]),
    manuallyUpdatedCalendar?: SimpleEvent[]
  ) => void,
  taskId: string,
  calendar?: SimpleEvent[]
) => {
  let manuallyUpdatedCalendar: SimpleEvent[] = [];

  if (calendar && calendar.length > 0)
    manuallyUpdatedCalendar = calendar?.filter((e) => !(e.id === taskId));

  updatePlannerArray(
    (prev: Planner[]) => prev.filter((planner) => !(planner.id === taskId)),
    manuallyUpdatedCalendar
  );
};
