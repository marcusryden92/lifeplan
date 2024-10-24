export function parseDateToUTC(dateInput: string | Date): Date {
  let date;

  // Check if the input is a string or a Date object
  if (typeof dateInput === "string") {
    // Parse the date from the string
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    // If it's already a Date object, use it directly
    date = dateInput;
  } else {
    throw new Error("Invalid input: expected a date string or Date object.");
  }

  // Return a new Date object in UTC
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}
