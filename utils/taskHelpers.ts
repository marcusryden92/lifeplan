import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "@/types/calendarTypes";
import { getMinuteDifference } from "./calendar-generation/calendarGenerationHelpers";
import { floorMinutes } from "./calendarUtils";

export function getPlannerAndCalendarForCompetedTask(
  mainPlanner: Planner[],
  currentCalendar: SimpleEvent[] = [],
  event: SimpleEvent
):
  | {
      manuallyUpdatedTaskArray: Planner[];
      manuallyUpdatedCalendar: SimpleEvent[];
    }
  | undefined {
  if (!event.start || !event.end) return;
  const currentTime = new Date();
  const eventStartDate = new Date(event.start);

  const manuallyUpdatedCalendar: SimpleEvent[] | undefined =
    currentCalendar?.filter((e) => !(e.id === event.id));

  const manuallyUpdatedTaskArray = mainPlanner.map((task) => {
    if (task.id === event.id) {
      // If completed is defined, set to undefined
      if (taskIsCompleted(task)) {
        return { ...task, completed: undefined };
      }

      // If inside the event, set end-time to right now
      else if (currentlyInEvent(event)) {
        const minuteDifference = getMinuteDifference(
          eventStartDate,
          currentTime
        );

        // If the event started less than 5 minutes ago,
        // push the start time back to make the event at least 5 minutes long.
        const startTime =
          minuteDifference < 20
            ? new Date(currentTime.getTime() - 20 * 60 * 1000).toISOString()
            : eventStartDate.toISOString();

        const endTime = currentTime.toISOString();

        const completed = {
          startTime: startTime,
          endTime: endTime,
        };

        return { ...task, completed };
      } else if (floorMinutes(currentTime) < floorMinutes(event.start)) {
        const duration =
          task.duration ||
          getMinuteDifference(new Date(event.start), new Date(event.end));

        const startTime = new Date(
          currentTime.getTime() - duration * 60 * 1000
        ).toISOString();

        const endTime = currentTime.toISOString();

        const completed = {
          startTime: startTime,
          endTime: endTime,
        };

        return { ...task, completed };
      }

      // Else, set end-time to event endtime
      const completed = { startTime: event.start, endTime: event.end };
      return { ...task, completed };
    }

    return task;
  });

  return { manuallyUpdatedTaskArray, manuallyUpdatedCalendar };
}

export function currentlyInEvent(event: SimpleEvent) {
  const currentTime = new Date().getTime(); // Get current time in milliseconds

  const eventStartTime = new Date(event.start).getTime();
  const eventEndTime = new Date(event.end).getTime();

  if (currentTime >= eventStartTime && currentTime <= eventEndTime) {
    return true; // Return the end time as a Date object
  }

  return false;
}

export function taskIsCompleted(task: Planner) {
  if (task.completed?.startTime && task.completed.endTime) return true;

  return false;
}
