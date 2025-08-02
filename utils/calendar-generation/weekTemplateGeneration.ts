import { WeekDayIntegers } from "@/types/calendarTypes";
import { SimpleEvent, EventTemplate } from "@prisma/client";
import {
  shiftDate,
  setTimeOnDate,
  getRRuleDayTypeFromIndex,
} from "@/utils/calendarUtils";

import { getWeekFirstDate } from "@/utils/calendarUtils";
import { calendarColors } from "@/data/calendarColors";

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
  userId: string,
  weekStartDay: WeekDayIntegers,
  fromDate: Date,
  template: EventTemplate[],
  eventArray: SimpleEvent[]
) {
  // Get the first date of the week based on the weekStartDay
  const thisWeeksFirstDate: Date | undefined = getWeekFirstDate(
    weekStartDay,
    fromDate
  );

  if (!thisWeeksFirstDate) {
    console.error("Failed to calculate the start date of the week.");
    return eventArray;
  }

  template.forEach((event) => {
    addTemplateEvent(
      userId,
      event,
      weekStartDay,
      thisWeeksFirstDate,
      eventArray
    );
  });
}

function addTemplateEvent(
  userId: string,
  event: EventTemplate,
  weekStartDay: WeekDayIntegers,
  thisWeeksFirstDate: Date,
  eventArray: SimpleEvent[]
) {
  if (
    !event ||
    !event.startDay ||
    !event.startTime ||
    event.duration === undefined
  ) {
    console.error("Event details are incomplete.", event);
    return;
  }

  // The new calculated start date/time for the event
  let newStartDate: Date;

  if (event.startDay) {
    // Calculate the offset from the weekStartDay
    const startDayIndex = daysFromSunday.indexOf(event.startDay);
    if (startDayIndex === -1) {
      console.error("Invalid start day provided.", event.startDay);
      return;
    }
    const startDayOffset = (startDayIndex - weekStartDay + 7) % 7;
    newStartDate = shiftDate(thisWeeksFirstDate, startDayOffset);

    // Set time on the date
    if (event.startTime) {
      newStartDate = setTimeOnDate(newStartDate, event.startTime);
    }
  } else {
    console.error("Event start details are missing.", event);
    return;
  }

  // Calculate end date based on duration
  const newEndDate = new Date(newStartDate);
  newEndDate.setMinutes(newEndDate.getMinutes() + event.duration);

  // Get RRule day (convert from JS day index to proper RRule day type)
  const utcDate = new Date(newStartDate.toUTCString()); // Converts to UTC
  const rruleDay = getRRuleDayTypeFromIndex(utcDate.getUTCDay());

  const startISO = newStartDate.toISOString();

  const rule = {
    freq: "weekly",
    interval: 1,
    byweekday: [rruleDay], // e.g., 'MO', 'SA', etc.
    dtstart: startISO, // this should be an ISO string
  };

  // Set up the RRule object with the correct timezone and recurrence rule
  eventArray.push({
    userId,
    id: event.id,
    title: event.title,
    start: newStartDate,
    end: newEndDate,
    rrule: JSON.stringify(rule),
    duration: event.duration * 60 * 1000, // Convert duration to milliseconds
    isTemplateItem: true,
    backgroundColor: "#1242B2",
    borderColor: "transparent",
    createdAt: null,
    updatedAt: null,
  });
}

export function populateWeekWithTemplate(
  userId: string,
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
  const thisWeeksFirstDate: Date | undefined = getWeekFirstDate(
    weekStartDay,
    fromDate
  );

  if (!thisWeeksFirstDate) {
    console.error("Failed to calculate the start date of the week.");
    return /* templateEventArray */;
  }

  // const updatedTemplateArray: SimpleEvent[] = [...templateEventArray];

  template.forEach((event) => {
    if (
      !event ||
      !event.startDay ||
      !event.startTime ||
      event.duration === undefined
    ) {
      console.error("Event details are incomplete.", event);
      return;
    }

    let newStartDate: Date;
    if (event.startDay) {
      const startDayIndex = daysFromSunday.indexOf(event.startDay);
      if (startDayIndex === -1) {
        console.error("Invalid start day provided.", event.startDay);
        return;
      }

      // Calculate the offset from the weekStartDay
      const startDayOffset = (startDayIndex - weekStartDay + 7) % 7;
      newStartDate = shiftDate(thisWeeksFirstDate, startDayOffset);

      if (event.startTime) {
        newStartDate = setTimeOnDate(newStartDate, event.startTime);
      }
    } else {
      console.error("Event start details are missing.", event);
      return;
    }

    // Calculate end date based on duration
    const newEndDate = new Date(newStartDate);
    newEndDate.setMinutes(newEndDate.getMinutes() + event.duration);

    templateEventArray.push({
      userId,
      id: event.id, // Generate a unique ID for the event
      title: event.title,
      start: newStartDate, // Convert Date to ISO string
      end: newEndDate, // Convert Date to ISO string
      isTemplateItem: true,
      backgroundColor: "#1242B2",
      borderColor: "transparent",
      duration: null,
      rrule: null,
      createdAt: null,
      updatedAt: null,
    });
  });

  // return templateEventArray;
}
