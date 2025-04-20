import React from "react";
import { Planner } from "@/lib/plannerClass";
import { SimpleEvent } from "@/types/calendarTypes";
import { getMinuteDifference } from "./calendar-generation/calendarGenerationHelpers";

export function toggletaskIsCompleted(
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>,
  event: SimpleEvent
) {
  const currentTime = new Date();
  const eventStartDate = new Date(event.start);

  // if (currentTime < eventStartDate) return;

  setTaskArray((prev) =>
    prev.map((task) => {
      if (task.title === "a") debugger;

      if (task.id === event.id) {
        // If completed is defined, set to undefined
        if (taskIsCompleted(task)) {
          return { ...task, completed: undefined };
        }

        // If inside the event, set end-time to right now
        if (currentlyInEvent(event)) {
          const minuteDifference = getMinuteDifference(
            eventStartDate,
            currentTime
          );

          const startTime = new Date(event.start).toISOString();

          // If the event started less than 5 minutes ago,
          // set the end to at least 5 minutes from start.
          const endTime =
            minuteDifference < 5
              ? new Date(eventStartDate.getTime() + 5 * 60 * 1000).toISOString()
              : eventStartDate.toISOString();

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
    })
  );
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
