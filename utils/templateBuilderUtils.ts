import { EventApi } from "@fullcalendar/core";
import { getWeekdayFromDate } from "@/utils/calendarUtils";
import { SimpleEvent } from "@/utils/calendar-generation/calendarGeneration";
import { shiftDate } from "@/utils/calendarUtils";
import { setTimeOnDate } from "@/utils/calendarUtils";
import { WeekDayIntegers } from "@/types/calendarTypes";

import { getWeekFirstDate } from "@/utils/calendarUtils";

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

  const todaysDate = new Date(2024, 0, 1);

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
      backgroundColor: "#1242B2",
      borderColor: "transparent",
    });
  });

  return eventArray;
}

// Functionality to calculate largest gap in the week template:

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// Helper function to convert day and time to minutes from the start of the week
function convertToMinutesFromWeekStart(
  day: string | undefined,
  time: string | undefined
): number | null {
  if (!day || !time) {
    // Return null if day or time is undefined
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);
  const dayIndex = daysOfWeek.indexOf(day.toLowerCase());

  if (dayIndex === -1) {
    // Handle the case where the day is not valid
    return null;
  }

  return dayIndex * 24 * 60 + hours * 60 + minutes;
}

// Function to find the largest gap between events
export function findLargestGap(events: EventTemplate[]): number {
  // Convert each event's start time to minutes from the week start and calculate the end time
  const eventTimes = events
    .map((event) => ({
      start: convertToMinutesFromWeekStart(event.start.day, event.start.time),
      end: convertToMinutesFromWeekStart(event.start.day, event.start.time)
        ? convertToMinutesFromWeekStart(event.start.day, event.start.time)! +
          event.duration
        : null,
    }))
    .filter((event) => event.start !== null && event.end !== null); // Filter out invalid events

  // Sort events by their start time
  eventTimes.sort((a, b) => a.start! - b.start!);

  // Initialize the largest gap, starting from the gap before the first event
  let largestGap = eventTimes[0].start!; // Gap from 00:00 on Monday to the first event

  // Calculate the gaps between consecutive events
  for (let i = 1; i < eventTimes.length; i++) {
    const gap = eventTimes[i].start! - eventTimes[i - 1].end!;
    if (gap > largestGap) {
      largestGap = gap;
    }
  }

  // Calculate the gap after the last event until the end of the week (24:00 on Sunday)
  const minutesInWeek = 7 * 24 * 60; // Total minutes in a week
  const lastEventEnd = eventTimes[eventTimes.length - 1].end!;
  const gapAfterLastEvent = minutesInWeek - lastEventEnd;
  if (gapAfterLastEvent > largestGap) {
    largestGap = gapAfterLastEvent;
  }

  return largestGap;
}
