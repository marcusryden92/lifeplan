import { EventTemplate, findLargestGap } from "@/utils/template-builder-utils";
import { shiftDate, setTimeOnDate } from "@/utils/calendar-utils";

import { getDateOfThisWeeksMonday } from "@/utils/calendar-utils";

import { getWeekFirstDate } from "@/utils/calendar-utils";
import { WeekDayIntegers } from "@/types/calendar-types";

import { Planner } from "@/lib/planner-class";

import cuid from "cuid";

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
  let eventArray: SimpleEvent[] = [];

  // Add date items to the task array:
  let newArray = addDateItemsToArray(taskArray, eventArray);

  if (newArray && newArray.length !== 0) {
    eventArray = newArray;
  }

  // Add tasks and goals to calendar:

  newArray = addEventsToCalendar(weekStartDay, template, taskArray, eventArray);

  eventArray = newArray;

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

function addDateItemsToArray(taskArray: Planner[], eventArray: SimpleEvent[]) {
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

function addEventsToCalendar(
  weekStartDay: WeekDayIntegers,
  template: EventTemplate[],
  taskArray: Planner[],
  eventArray: SimpleEvent[]
): SimpleEvent[] {
  const todaysDate = new Date();

  // First get all the goals and task events from taskArray:

  let goalsAndTasks: Planner[] = [];

  taskArray.forEach((task) => {
    if (task.type === "goal" || task.type === "task") {
      goalsAndTasks.push(task);
    }
  });

  if (!goalsAndTasks) return eventArray;

  // Then sort the array by due dates (items with no due date end up last):

  const newArray = sortPlannersByDeadline(goalsAndTasks);
  goalsAndTasks = newArray;

  // Create array to hold the first date of all the weeks to which a template has been added (so multiple instances of the template aren't added to the same week):

  let templatedWeeks: Date[] = [];

  // Initialize the first week:

  const weekFirstDate = getWeekFirstDate(weekStartDay, todaysDate);
  templatedWeeks.push(new Date(weekFirstDate));
  eventArray = populateWeekWithTemplate(
    weekStartDay,
    todaysDate,
    template,
    eventArray
  );

  // Find the largest gap in the template to make sure that a given task fits at all within the week template.

  const largestTemplateGap = findLargestGap(template);

  goalsAndTasks.forEach((item) => {
    // If item is a task:
    if (item.type === "task") {
      if (!item.duration) {
        console.log(`Task ${item.title} duration unfined.`);
        return;
      }
      // Check that the item fits within the week template:
      if (item.duration > largestTemplateGap) {
        console.log(`Task ${item.title} is too large for the week template!`);
        return;
      }

      // These are the markers that run along the calendar to check for available slots. The minute marker is the main marker, and when minute marker finds a free minute, duration marker continues along to check if the free space is as long as the task duration:
      let minuteMarker = new Date();
      let durationMarker = new Date(minuteMarker);

      // These markers are here to see if we've changed days or weeks:
      let dayMarker = new Date(minuteMarker);
      let weekMarker = getWeekFirstDate(weekStartDay, minuteMarker);

      // We add the current dates events to an array:
      let todaysEvents: SimpleEvent[] = getTodaysEvents(todaysDate, eventArray);

      // Let's make a while loop to iterate through the calendar and check if there are any free slots:

      let iterationCount = 0;

      while (true) {
        // Break the loop if it has run 500 times
        if (iterationCount > 500) {
          console.error(
            "Loop exceeded maximum iteration count of 500. Breaking the loop to avoid infinite loop."
          );
          break;
        }

        // Check if we've changed weeks and add a template to the new week if necessary
        if (getDayDifference(weekMarker, minuteMarker) > 6) {
          if (!hasDateInArray(templatedWeeks, minuteMarker)) {
            eventArray = populateWeekWithTemplate(
              weekStartDay,
              minuteMarker,
              template,
              eventArray
            );
            weekMarker = new Date(getWeekFirstDate(weekStartDay, minuteMarker));

            // Add the minuteMarker to templatedWeeks after adding the template
            templatedWeeks.push(new Date(minuteMarker));
          }
        }

        // Let's see if we've moved to another day, and in that case update the todaysEvents array:
        if (getDayDifference(dayMarker, durationMarker) >= 1) {
          todaysEvents = getTodaysEvents(durationMarker, eventArray);
          dayMarker = new Date(durationMarker);
        }

        let eventEndTime;

        // Let's check if today has any events:
        if (todaysEvents) {
          // Let's check if the durationMarker is inside an event, and if so, get the end time of that event:
          eventEndTime = checkCurrentDateInEvents(todaysEvents, durationMarker);
        }

        // If the durationMarker is inside an event, set the duration and minuteMarker to the end-time of that event:
        if (eventEndTime) {
          minuteMarker = new Date(eventEndTime);
          durationMarker = new Date(eventEndTime);

          // Add one minute to durationMarker to keep it from getting stuck in the same event:
          durationMarker.setMinutes(durationMarker.getMinutes() + 1);
          iterationCount++;

          continue;
        }

        if (
          !eventEndTime &&
          getMinuteDifference(minuteMarker, durationMarker) >= item.duration
        ) {
          const newEvent = {
            id: cuid(),
            title: item.title,
            start: minuteMarker.toISOString(), // ISO 8601 string format for FullCalendar
            end: durationMarker.toISOString(), // ISO 8601 string format for FullCalendar
            backgroundColor: "#f59e0b",
            borderColor: "#f59e0b",
          };

          eventArray.push(newEvent);
          break;
        }

        durationMarker.setMinutes(durationMarker.getMinutes() + 1);

        iterationCount++;
      }
    }
  });

  return eventArray;
}

function sortPlannersByDeadline(planners: Planner[]): Planner[] {
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
function checkCurrentDateInEvents(
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
function getMinuteDifference(date1: Date, date2: Date): number {
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

function getDayDifference(date1: Date, date2: Date): number {
  // Reset the time part to 00:00:00 for both dates to only compare the calendar day
  const day1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const day2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

  // Calculate the difference in milliseconds between the two days
  const differenceInMilliseconds = day2.getTime() - day1.getTime();

  // Convert milliseconds to days and return the result
  return Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
}

function hasDateInArray(dates: Date[], dateToCheck: Date): boolean {
  return dates.some((date): date is Date => {
    if (date === undefined) return false;
    return (
      date.getFullYear() === dateToCheck.getFullYear() &&
      date.getMonth() === dateToCheck.getMonth() &&
      date.getDate() === dateToCheck.getDate()
    );
  });
}

function getTodaysEvents(today: Date, eventArray: SimpleEvent[]) {
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
