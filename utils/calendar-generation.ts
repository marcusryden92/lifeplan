import { EventTemplate } from "@/utils/template-builder-utils";
import { shiftDate, setTimeOnDate } from "@/utils/calendar-utils";

import { getDateOfThisWeeksMonday } from "@/utils/calendar-utils";

import { getWeekFirstDate } from "@/utils/calendar-utils";

// Define the SimpleEvent interface
export interface SimpleEvent {
  id: string;
  title: string;
  start: string; // ISO 8601 string format for FullCalendar
  end: string; // ISO 8601 string format for FullCalendar
}

export function generateCalendar(template: EventTemplate[]): SimpleEvent[] {
  let eventArray: SimpleEvent[] = [];

  const todaysDate = new Date();

  // Days of the week starting from Monday (index 0)
  const daysFromMonday = [
    "monday", // index 0
    "tuesday", // index 1
    "wednesday", // index 2
    "thursday", // index 3
    "friday", // index 4
    "saturday", // index 5
    "sunday", // index 6
  ];

  // Get the first date of the week based on Monday
  let thisWeeksMonday: Date | undefined = getWeekFirstDate(0, todaysDate); // Assuming Monday as the start of the week

  if (thisWeeksMonday === undefined) {
    console.error("Had issues getting thisWeeksMonday");
    return [];
  }

  template.forEach((event) => {
    if (!event || !event.start || event.duration === undefined) {
      console.error("Event details are incomplete.", event);
      return;
    }

    let newStartDate: Date;
    if (event.start.day) {
      const startDayIndex = daysFromMonday.indexOf(event.start.day);
      if (startDayIndex === -1) {
        console.error("Invalid start day provided.", event.start.day);
        return;
      }

      // Calculate the offset from Monday
      const startDayOffset = (startDayIndex - 0 + 7) % 7; // Monday as index 0
      newStartDate = shiftDate(thisWeeksMonday, startDayOffset);

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
