import { EventApi } from "@fullcalendar/core";
import { getWeekdayFromDate } from "@/utils/calendar-utils";
import { SimpleEvent } from "@/utils/calendar-generation";
import { getDateOfThisWeeksMonday } from "@/utils/calendar-utils";
import { shiftDate } from "@/utils/calendar-utils";
import { setTimeOnDate } from "@/utils/calendar-utils";
import { WeekDayIntegers } from "@/types/calendar-types";

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
  const currentDay = getWeekdayFromDate(todaysDate);

  const daysFromMonday = [
    "monday", // index 0
    "tuesday", // index 1
    "wednesday", // index 2
    "thursday", // index 3
    "friday", // index 4
    "saturday", // index 5
    "sunday", // index 6
  ];

  let thisWeeksMonday: Date | undefined = getDateOfThisWeeksMonday(todaysDate);

  if (thisWeeksMonday === undefined) {
    console.error("Had issues getting thisWeeksMonday, returned empty array.");
    return [];
  }

  template.forEach((event) => {
    let newStartDate: Date;
    if (event && event.start.day) {
      newStartDate = shiftDate(
        thisWeeksMonday,
        daysFromMonday.indexOf(event.start.day)
      );
      if (event.start.time) {
        newStartDate = setTimeOnDate(newStartDate, event.start.time);
      }
    } else {
      console.log("Event start details are missing.");
      return;
    }

    let newEndDate: Date;
    if (event && event.end.day) {
      newEndDate = shiftDate(
        thisWeeksMonday,
        daysFromMonday.indexOf(event.end.day)
      );
      if (event.end.time) {
        newEndDate = setTimeOnDate(newEndDate, event.end.time);
      }
    } else {
      console.log("Event end details are missing.");
      return;
    }

    eventArray.push({
      id: event.id, // Generate a unique ID for the event
      title: event.title,
      start: newStartDate.toISOString(), // Convert Date to ISO string
      end: newEndDate.toISOString(), // Convert Date to ISO string
    });
  });

  // console.log(eventArray);

  return eventArray;
}
