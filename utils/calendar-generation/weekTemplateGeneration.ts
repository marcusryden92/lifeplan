import { WeekDayIntegers } from "@/types/calendarTypes";
import { EventTemplate } from "../templateBuilderUtils";
import { SimpleEvent } from "@/types/calendarTypes";

import {
  shiftDate,
  setTimeOnDate,
  getRRuleDayTypeFromIndex,
} from "@/utils/calendarUtils";

import { getWeekFirstDate } from "@/utils/calendarUtils";

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

export function addWeekTemplateToCalendar(
  weekStartDay: WeekDayIntegers,
  fromDate: Date,
  template: EventTemplate[],
  eventArray: SimpleEvent[]
): SimpleEvent[] {
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
    addTemplateEvent(event, weekStartDay, thisWeeksFirstDate, eventArray);
  });

  return eventArray;
}

function addTemplateEvent(
  event: EventTemplate,
  weekStartDay: WeekDayIntegers,
  thisWeeksFirstDate: Date,
  eventArray: SimpleEvent[]
) {
  if (!event || !event.start || event.duration === undefined) {
    console.error("Event details are incomplete.", event);
    return;
  }

  // The new calculated start date/time for the event
  let newStartDate: Date;

  if (event.start.day) {
    // Calculate the offset from the weekStartDay
    const startDayIndex = daysFromSunday.indexOf(event.start.day);
    if (startDayIndex === -1) {
      console.error("Invalid start day provided.", event.start.day);
      return;
    }
    const startDayOffset = (startDayIndex - weekStartDay + 7) % 7;
    newStartDate = shiftDate(thisWeeksFirstDate, startDayOffset);

    // Set time on the date
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

  // Get RRule day (convert from JS day index to proper RRule day type)
  let utcDate = new Date(newStartDate.toUTCString()); // Converts to UTC
  const rruleDay = getRRuleDayTypeFromIndex(utcDate.getUTCDay());

  const startISO = newStartDate.toISOString();
  const endISO = newEndDate.toISOString();

  // Set up the RRule object with the correct timezone and recurrence rule
  eventArray.push({
    id: event.id,
    title: event.title,
    start: startISO,
    end: endISO,
    backgroundColor: "#1242B2",
    borderColor: "transparent",

    rrule: {
      freq: "weekly",
      interval: 1,
      byweekday: [rruleDay],
      dtstart: startISO,
    },
    duration: event.duration * 60 * 1000, // Convert duration to milliseconds
  });
}

export function populateWeekWithTemplate(
  weekStartDay: WeekDayIntegers,
  fromDate: Date,
  template: EventTemplate[],
  templateEventArray: SimpleEvent[]
) {
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
    return /* templateEventArray */;
  }

  // const updatedTemplateArray: SimpleEvent[] = [...templateEventArray];

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

    templateEventArray.push({
      id: event.id, // Generate a unique ID for the event
      title: event.title,
      start: newStartDate.toISOString(), // Convert Date to ISO string
      end: newEndDate.toISOString(), // Convert Date to ISO string
      backgroundColor: "#1242B2",
      borderColor: "transparent",
    });
  });

  // return templateEventArray;
}
