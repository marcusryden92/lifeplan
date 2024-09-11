import { EventApi } from "@fullcalendar/core/index.js";

export function getWeekdayName(date: Date | null) {
  if (!date) {
    console.log("getWeekDayName date is null.");
    return;
  }
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return weekdays[date.getDay()];
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

// Define the EventTemplate interface
export interface EventTemplate {
  title: string;
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
export function getCalendarToTemplate(calendar: EventApi[]): EventTemplate[] {
  let template: EventTemplate[] = [];

  calendar.forEach((task, index) => {
    const newEvent: EventTemplate = {
      title: task.title,
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
