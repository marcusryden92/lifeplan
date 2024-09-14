import { EventApi } from "@fullcalendar/core";
import { getWeekdayName } from "@/utils/calendar-utils";

function getTimeFromDate(date: Date | null): string | undefined {
  if (!date) {
    console.log("getTimeFromDate date is null.");
    return;
  }

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

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

// Your original function
export function getTemplateFromCalendar(calendar: EventApi[]): EventTemplate[] {
  let template: EventTemplate[] = [];

  calendar.forEach((task, index) => {
    const newEvent: EventTemplate = {
      title: task.title,
      id: task.id,
      start: {
        day: getWeekdayName(task.start), // Assuming task.start is a Date or similar object
        time: getTimeFromDate(task.start), // Assuming task.start is a Date or similar object
      },
      end: {
        day: getWeekdayName(task.end), // Assuming task.end is a Date or similar object
        time: getTimeFromDate(task.end), // Assuming task.end is a Date or similar object
      },
    };

    template.push(newEvent);
  });

  return template;
}
