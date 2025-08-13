import { Planner } from "@/prisma/generated/client";
import { SimpleEvent } from "@/prisma/generated/client";
import { getMinuteDifference } from "./calendar-generation/calendarGenerationHelpers";
import { floorMinutes } from "./calendarUtils";

export function getPlannerAndCalendarForCompletedTask(
  planner: Planner[],
  calendar: SimpleEvent[] = [],
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

  const manuallyUpdatedCalendar: SimpleEvent[] | undefined = calendar?.filter(
    (e) => !(e.id === event.id)
  );

  const manuallyUpdatedTaskArray = planner.map((task) => {
    if (task.id === event.id) {
      // If completed is defined, set to null
      if (taskIsCompleted(task)) {
        return { ...task, completedStartTime: null, completedEndTime: null };
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
            ? new Date(currentTime.getTime() - 20 * 60 * 1000)
            : eventStartDate;

        const endTime = currentTime;

        return {
          ...task,
          completedStartTime: startTime.toISOString(),
          completedEndTime: endTime.toISOString(),
        };
      } else if (floorMinutes(currentTime) < floorMinutes(event.start)) {
        const duration =
          task.duration ||
          getMinuteDifference(new Date(event.start), new Date(event.end));

        const startTime = new Date(
          currentTime.getTime() - duration * 60 * 1000
        );

        const endTime = currentTime;

        return {
          ...task,
          completedStartTime: startTime.toISOString(),
          completedEndTime: endTime.toISOString(),
        };
      }

      // Else, set end-time to event endtime
      return {
        ...task,
        completedStartTime: event.start,
        completedEndTime: event.end,
      };
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
  if (task.completedStartTime && task.completedEndTime) return true;

  return false;
}
