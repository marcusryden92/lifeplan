import { WeekDayIntegers } from "@/types/calendar-types";
import { EventTemplate } from "../template-builder-utils";
import { SimpleEvent } from "./calendar-generation";

import { shiftDate, setTimeOnDate } from "@/utils/calendar-utils";

import { getWeekFirstDate } from "@/utils/calendar-utils";

import { Planner } from "@/lib/planner-class";

export function populateWeekWithTemplate(
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

export function addDateItemsToArray(
  taskArray: Planner[],
  eventArray: SimpleEvent[]
) {
  let dateItems: Planner[] = [];
  let newArray: SimpleEvent[] = [];

  if (!taskArray || !eventArray) {
    return [];
  }

  // Filter out tasks that are of type "plan"
  taskArray.forEach((task) => {
    if (task.type === "plan") {
      dateItems.push(task);
    }
  });

  if (dateItems.length === 0) {
    return [];
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

export function sortPlannersByDeadline(planners: Planner[]): Planner[] {
  return planners.sort((a, b) => {
    if (a.deadline && b.deadline) {
      // Both objects have deadlines, so compare them
      return a.deadline.getTime() - b.deadline.getTime();
    } else if (a.deadline) {
      // a has a deadline, b does not, so a comes first
      return -1;
    } else if (b.deadline) {
      // b has a deadline, a does not, so b comes first
      return 1;
    } else {
      // Neither has a deadline, they are considered equal in terms of sorting
      return 0;
    }
  });
}

// Function to check if the current date is within any events and return the end time as a Date
export function checkCurrentDateInEvents(
  events: SimpleEvent[],
  currentDate: Date
): Date | null {
  const currentTime = currentDate.getTime(); // Get current time in milliseconds

  for (const event of events) {
    const eventStartTime = new Date(event.start).getTime();
    const eventEndTime = new Date(event.end).getTime();

    // Check if current time is within the event time range
    if (currentTime >= eventStartTime && currentTime <= eventEndTime) {
      return new Date(event.end); // Return the end time as a Date object
    }
  }

  return null; // Return null if no event matches the current date
}

// Minutes between dates:
export function getMinuteDifference(date1: Date, date2: Date): number {
  // Get the time in milliseconds
  const time1 = date1.getTime();
  const time2 = date2.getTime();

  // Calculate the difference in milliseconds
  const differenceInMilliseconds = Math.abs(time2 - time1);

  // Convert milliseconds to minutes
  const differenceInMinutes = Math.floor(
    differenceInMilliseconds / (1000 * 60)
  );

  return differenceInMinutes;
}

export function getDayDifference(date1: Date, date2: Date): number {
  // Reset the time part to 00:00:00 for both dates to only compare the calendar day
  const day1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const day2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

  // Calculate the difference in milliseconds between the two days
  const differenceInMilliseconds = day2.getTime() - day1.getTime();

  // Convert milliseconds to days and return the result
  return Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
}

export function hasDateInArray(dates: Date[], dateToCheck: Date): boolean {
  return dates.some((date): date is Date => {
    if (date === undefined) return false;
    return (
      date.getFullYear() === dateToCheck.getFullYear() &&
      date.getMonth() === dateToCheck.getMonth() &&
      date.getDate() === dateToCheck.getDate()
    );
  });
}

export function getTodaysEvents(today: Date, eventArray: SimpleEvent[]) {
  let todaysEvents: SimpleEvent[] = [];

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00 of the given day
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59 of the given day

  eventArray.forEach((event) => {
    const eventStartDate = new Date(event.start);
    const eventEndDate = new Date(event.end);

    // Check if the event overlaps with any part of the day
    if (
      eventStartDate <= endOfDay &&
      eventEndDate >= startOfDay // Event starts before or during today and ends after or during today
    ) {
      todaysEvents.push(event);
    }
  });

  return todaysEvents;
}

export function sortByDeadline(newArray: Planner[]): Planner[] {
  return newArray.sort((a, b) => {
    const deadlineA = a.deadline ? new Date(a.deadline) : Infinity;
    const deadlineB = b.deadline ? new Date(b.deadline) : Infinity;

    // Make sure deadlineA and deadlineB are Dates before using getTime
    return (
      (deadlineA instanceof Date ? deadlineA.getTime() : Infinity) -
      (deadlineB instanceof Date ? deadlineB.getTime() : Infinity)
    );
  });
}
