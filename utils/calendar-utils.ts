export function getWeekdayFromDate(date: Date | null) {
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
  const daysFromMonday = [
    "sunday", // index 0
    "monday", // index 1
    "tuesday", // index 2
    "wednesday", // index 3
    "thursday", // index 4
    "friday", // index 5
    "saturday", // index 6
  ];

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
