import { EventApi } from "@fullcalendar/core";
import { getWeekdayFromDate } from "@/utils/calendar-utils";
import { SimpleEvent } from "@/utils/calendar-generation";
import { getDateOfThisWeeksMonday } from "@/utils/calendar-utils";
import { shiftDate } from "@/utils/calendar-utils";
import { setTimeOnDate } from "@/utils/calendar-utils";
import { WeekDayIntegers } from "@/types/calendar-types";

import { getWeekFirstDate } from "@/utils/calendar-utils";

// Define the updated EventTemplate interface
export interface EventTemplate {
  title: string;
  id: string;
  start: {
    day: string | undefined; // Weekday name
    time: string | undefined; // Time in "HH:mm" format
  };
  duration: number; // Duration in minutes
}

function getTimeFromDate(date: Date | null): string | undefined {
  if (!date) {
    console.log("getTimeFromDate date is null.");
    return;
  }

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getTemplateFromCalendar(calendar: EventApi[]): EventTemplate[] {
  let template: EventTemplate[] = [];

  calendar.forEach((task) => {
    if (!task.start || !task.end) {
      console.error("Task start or end details are missing.", task);
      return;
    }

    // Extract start and end times
    const startDate = new Date(task.start);
    const endDate = new Date(task.end);

    // Calculate duration in minutes
    const durationMinutes = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60)
    );

    // Create new EventTemplate object
    const newEvent: EventTemplate = {
      title: task.title,
      id: task.id,
      start: {
        day: getWeekdayFromDate(startDate), // Assuming startDate is a Date object
        time: getTimeFromDate(startDate), // Assuming startDate is a Date object
      },
      duration: durationMinutes, // Add duration in minutes
    };

    template.push(newEvent);
  });

  return template;
}

export function populateTemplateCalendar(
  weekStartDay: WeekDayIntegers,
  template: EventTemplate[]
): SimpleEvent[] {
  let eventArray: SimpleEvent[] = [];

  const todaysDate = new Date();

  // Days of the week starting from Sunday (index 0)
  const daysFromSunday = [
    "sunday", // index 0
    "monday", // index 1
    "tuesday", // index 2
    "wednesday", // index 3
    "thursday", // index 4
    "friday", // index 5
    "saturday", // index 6
  ];

  // Get the first date of the week based on the weekStartDay
  let thisWeeksFirstDate: Date | undefined = getWeekFirstDate(
    weekStartDay,
    todaysDate
  );

  if (!thisWeeksFirstDate) {
    console.error("Failed to calculate the start date of the week.");
    return eventArray;
  }

  template.forEach((event) => {
    if (!event || !event.start || event.duration === undefined) {
      console.error("Event details are incomplete.", event);
      return;
    }

    let newStartDate: Date;
    if (event.start.day) {
      const startDayIndex = daysFromSunday.indexOf(event.start.day);
      if (startDayIndex === -1) {
        console.error("Invalid start day provided.", event.start.day);
        return;
      }

      // Calculate the offset from the weekStartDay
      const startDayOffset = (startDayIndex - weekStartDay + 7) % 7;
      newStartDate = shiftDate(thisWeeksFirstDate, startDayOffset);

      if (event.start.time) {
        newStartDate = setTimeOnDate(newStartDate, event.start.time);
      }
    } else {
      console.error("Event start details are missing.", event);
      return;
    }

    // Calculate end date based on duration
    let newEndDate = new Date(newStartDate);
    newEndDate.setMinutes(newEndDate.getMinutes() + event.duration);

    eventArray.push({
      id: event.id, // Generate a unique ID for the event
      title: event.title,
      start: newStartDate.toISOString(), // Convert Date to ISO string
      end: newEndDate.toISOString(), // Convert Date to ISO string
    });
  });

  return eventArray;
}
