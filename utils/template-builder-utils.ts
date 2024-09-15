import { EventApi } from "@fullcalendar/core";
import { getWeekdayFromDate } from "@/utils/calendar-utils";
import { SimpleEvent } from "@/utils/calendar-generation";
import { getDateOfThisWeeksMonday } from "@/utils/calendar-utils";
import { shiftDate } from "@/utils/calendar-utils";
import { setTimeOnDate } from "@/utils/calendar-utils";
import { WeekDayIntegers } from "@/types/calendar-types";

import { getWeekFirstDate } from "@/utils/calendar-utils";

// Define the EventTemplate interface
export interface EventTemplate {
  title: string;
  id: string;
  start: {
    day: string | undefined;
    time: string | undefined;
  };
  end: {
    day: string | undefined;
    time: string | undefined;
  };
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

// Your original function
export function getTemplateFromCalendar(calendar: EventApi[]): EventTemplate[] {
  let template: EventTemplate[] = [];

  calendar.forEach((task, index) => {
    const newEvent: EventTemplate = {
      title: task.title,
      id: task.id,
      start: {
        day: getWeekdayFromDate(task.start), // Assuming task.start is a Date or similar object
        time: getTimeFromDate(task.start), // Assuming task.start is a Date or similar object
      },
      end: {
        day: getWeekdayFromDate(task.end), // Assuming task.end is a Date or similar object
        time: getTimeFromDate(task.end), // Assuming task.end is a Date or similar object
      },
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
    if (!event || !event.start || !event.end) {
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

    let newEndDate: Date;
    if (event.end.day) {
      const endDayIndex = daysFromSunday.indexOf(event.end.day);
      if (endDayIndex === -1) {
        console.error("Invalid end day provided.", event.end.day);
        return;
      }

      // Calculate the offset from the weekStartDay
      const endDayOffset = (endDayIndex - weekStartDay + 7) % 7;
      newEndDate = shiftDate(thisWeeksFirstDate, endDayOffset);

      if (event.end.time) {
        newEndDate = setTimeOnDate(newEndDate, event.end.time);
      }
    } else {
      console.error("Event end details are missing.", event);
      return;
    }

    eventArray.push({
      id: event.id, // Generate a unique ID for the event
      title: event.title,
      start: newStartDate.toISOString(), // Convert Date to ISO string
      end: newEndDate.toISOString(), // Convert Date to ISO string
    });
  });

  return eventArray;
}
