import { EventTemplate } from "@/utils/template-builder-utils";
import { shiftDate, setTimeOnDate } from "@/utils/calendar-utils";

import { getDateOfThisWeeksMonday } from "@/utils/calendar-utils";

// Define the SimpleEvent interface
export interface SimpleEvent {
  id: string;
  title: string;
  start: string; // ISO 8601 string format for FullCalendar
  end: string; // ISO 8601 string format for FullCalendar
}

export function generateCalendar(
  //   taskArray: Planner[],
  template: EventTemplate[]
): SimpleEvent[] {
  let eventArray: SimpleEvent[] = [];

  const todaysDate = new Date();

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
    console.error("Had issues getting thisWeeksMonday");
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
