import {
  WeekDayIntegers,
  WeekDayType,
  RRuleWeekDayType,
} from "@/types/calendarTypes";

export function getWeekdayFromDate(date: Date): WeekDayType {
  const weekdays: WeekDayType[] = [
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

export function shiftDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function setTimeOnDate(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const resultDate = new Date(date); // Clone the date to avoid mutating the original
  resultDate.setHours(hours, minutes, 0, 0); // Set hours, minutes, seconds, and milliseconds
  return resultDate;
}

export function getDateOfThisWeeksMonday(todaysDate: Date): Date | undefined {
  if (todaysDate) {
    const dayOfWeek = todaysDate.getDay(); // Get day of the week as a number (0-6)
    const daysToMonday = (dayOfWeek + 6) % 7; // Calculate how many days to go back to Monday
    const thisWeeksMonday = shiftDate(todaysDate, -daysToMonday); // Shift back to Monday
    return thisWeeksMonday;
  } else {
    console.log("todaysDate undefined in getDateOfThisWeeksMonday.");
    return undefined;
  }
}

export function getWeekFirstDate(
  weekStartDay: WeekDayIntegers,
  todaysDate: Date
): Date {
  // Get the current day of the week (0 for Sunday, 1 for Monday, ..., 6 for Saturday)
  const todaysWeekday = todaysDate.getDay();

  // Calculate the difference in days to get to the desired start day of the week
  const daysDifference = (todaysWeekday - weekStartDay + 7) % 7;

  // Use shiftDate to get the date of the first day of the week
  const shiftedDate = new Date(shiftDate(todaysDate, -daysDifference));

  // Set the time to 00:00:00.000 and return the updated Date object
  shiftedDate.setHours(0, 0, 0, 0);

  return shiftedDate;
}

export function getRRuleDayTypeFromIndex(day: number): RRuleWeekDayType {
  const rruleWeekdayArray: RRuleWeekDayType[] = [
    "SU", // Sunday
    "MO", // Monday
    "TU", // Tuesday
    "WE", // Wednesday
    "TH", // Thursday
    "FR", // Friday
    "SA", // Saturday
  ];

  return rruleWeekdayArray[day];
}

export function floorMinutes(date: Date | string) {
  let newDate;

  if (typeof date === "string") newDate = new Date(date);
  else newDate = date;

  return Math.floor(newDate.getTime() / 1000);
}

// Function to generate the date string
export const getCalendarHeaderDateString = (
  initialDate: Date,
  finalDate: Date,
  monthArray: string[]
) => {
  // Extract date details for initial and final dates
  const initialDateNumber = initialDate.getDate();
  const finalDateNumber = finalDate.getDate();

  const initialDateMonth = initialDate.getMonth();
  const finalDateMonth = finalDate.getMonth();

  const initialDateYear = initialDate.getFullYear();
  const finalDateYear = finalDate.getFullYear();

  // Get the month names
  const initialMonthName = monthArray[initialDateMonth];
  const finalMonthName = monthArray[finalDateMonth];

  // Determine if the months or years are different
  const isDifferentMonth = initialDateMonth !== finalDateMonth;
  const isDifferentYear = initialDateYear !== finalDateYear;

  // Construct the date string
  let dateString = `${initialMonthName} ${initialDateNumber}`;

  if (isDifferentMonth) {
    dateString += ` - ${finalMonthName} ${finalDateNumber}`;
  } else {
    dateString += ` - ${finalDateNumber}`;
  }

  dateString += `, ${initialDateYear}`;

  if (isDifferentYear) {
    dateString += ` - ${finalDateYear}`;
  }

  return dateString;
};
