import { EventTemplate } from "@/utils/template-builder-utils";
import { shiftDate, setTimeOnDate } from "@/utils/calendar-utils";

import { getDateOfThisWeeksMonday } from "@/utils/calendar-utils";

import { getWeekFirstDate } from "@/utils/calendar-utils";
import { WeekDayIntegers } from "@/types/calendar-types";

import { Planner } from "@/lib/planner-class";

// Define the SimpleEvent interface
export interface SimpleEvent {
  id: string;
  title: string;
  start: string; // ISO 8601 string format for FullCalendar
  end: string; // ISO 8601 string format for FullCalendar
  backgroundColor?: string;
  borderColor?: string;
}

export function generateCalendar(
  weekStartDay: WeekDayIntegers,
  template: EventTemplate[],
  taskArray: Planner[]
): SimpleEvent[] {
  const todaysDate = new Date();

  let eventArray: SimpleEvent[] = [];

  eventArray = populateWeekWithTemplate(
    weekStartDay,
    todaysDate,
    template,
    eventArray
  );

  // Add date items to the task array:
  const newArray = addDateItemsToArray(taskArray, eventArray);

  if (newArray && newArray.length !== 0) {
    eventArray = newArray;
  }

  return eventArray;
}

function addDateItemsToArray(taskArray: Planner[], eventArray: SimpleEvent[]) {
  let dateItems: Planner[] = [];
  let newArray: SimpleEvent[] = [];

  if (!taskArray || !eventArray) {
    return undefined;
  }

  // Filter out tasks that are of type "plan"
  taskArray.forEach((task) => {
    if (task.type === "plan") {
      dateItems.push(task);
    }
  });

  if (dateItems.length === 0) {
    return undefined;
  }

  // Process each date item and calculate the end date based on duration (in minutes)
  dateItems.forEach((date) => {
    if (date.starts && date.duration) {
      // Calculate the end time by adding duration (in minutes) to the start time
      const end = new Date(date.starts.getTime() + date.duration * 60000); // 60000 ms = 1 minute

      const newDate: SimpleEvent = {
        title: date.title,
        id: JSON.stringify(new Date()),
        start: date.starts.toISOString(),
        end: end.toISOString(), // Add the calculated end time here
        backgroundColor: "black",
        borderColor: "black",
      };

      newArray.push(newDate);
    }
  });

  eventArray.push(...newArray); // Add the new dates to eventArray

  return eventArray;
}

function populateWeekWithTemplate(
  weekStartDay: WeekDayIntegers,
  fromDate: Date,
  template: EventTemplate[],
  eventArray: SimpleEvent[]
): SimpleEvent[] {
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
    fromDate
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
