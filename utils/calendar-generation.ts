import { Planner } from "@/lib/planner-class";
import { EventTemplate } from "@/utils/template-builder-functions";
import { EventApi } from "@fullcalendar/core/index.js";

export function generateCalendar(
  taskArray: Planner[],
  template: EventTemplate[]
): EventApi[] {
  let eventArray: EventApi[] = [];

  const currentDate = new Date();

  return eventArray;
}
