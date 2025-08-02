import { WeekDayIntegers, WeekDayType } from "@/types/calendarTypes";

import { SimpleEvent } from "@prisma/client";
import { EventInput } from "@fullcalendar/core/index.js";
import type { RRule as RRuleType } from "@/types/calendarTypes";
import { RRule, Weekday } from "rrule";

import { parseICalToRRule } from "./rrule-handlers";

// Get weekday string from a Date object
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

// Shift a date by a given number of days
export function shiftDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Set time (HH:MM) on a date
export function setTimeOnDate(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// Get the Monday of the current week
export function getDateOfThisWeeksMonday(todaysDate: Date): Date | undefined {
  if (!todaysDate) {
    console.warn("todaysDate is undefined in getDateOfThisWeeksMonday.");
    return undefined;
  }

  const dayOfWeek = todaysDate.getDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  return shiftDate(todaysDate, -daysToMonday);
}

// Get the start date of the current week based on a custom start day
export function getWeekFirstDate(
  weekStartDay: WeekDayIntegers,
  todaysDate: Date
): Date {
  const currentDay = todaysDate.getDay();
  const daysDifference = (currentDay - weekStartDay + 7) % 7;
  const firstDate = shiftDate(todaysDate, -daysDifference);
  firstDate.setHours(0, 0, 0, 0);
  return firstDate;
}

export function getRRuleDayTypeFromIndex(day: number): Weekday {
  const rruleWeekdays = [
    RRule.SU,
    RRule.MO,
    RRule.TU,
    RRule.WE,
    RRule.TH,
    RRule.FR,
    RRule.SA,
  ];
  return rruleWeekdays[day];
}

// Helper function to transform Prisma events to FullCalendar format
export const transformEventsForFullCalendar = (
  events: SimpleEvent[]
): EventInput[] => {
  return events.map((event) => {
    let parsedRRule: RRuleType | undefined = undefined;
    // Safely parse RRule JSON string
    if (event.rrule) {
      parsedRRule = parseICalToRRule(event.rrule);
    } else {
      parsedRRule = undefined;
    }

    return {
      ...event,
      rrule: parsedRRule,
      duration: event.duration ?? undefined,
    };
  });
};

// Floor a date (or string) to seconds since epoch
export function floorMinutes(date: Date | string): number {
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  return Math.floor(parsedDate.getTime() / 1000);
}

// Generate calendar header date string (e.g., "Aug 1 - Aug 7, 2025")
export function getCalendarHeaderDateString(
  initialDate: Date,
  finalDate: Date,
  monthArray: string[]
): string {
  const initialDay = initialDate.getDate();
  const finalDay = finalDate.getDate();
  const initialMonth = initialDate.getMonth();
  const finalMonth = finalDate.getMonth();
  const initialYear = initialDate.getFullYear();
  const finalYear = finalDate.getFullYear();

  const initialMonthName = monthArray[initialMonth];
  const finalMonthName = monthArray[finalMonth];

  const isDifferentMonth = initialMonth !== finalMonth;
  const isDifferentYear = initialYear !== finalYear;

  let result = `${initialMonthName} ${initialDay}`;

  if (isDifferentMonth) {
    result += ` - ${finalMonthName} ${finalDay}`;
  } else {
    result += ` - ${finalDay}`;
  }

  result += `, ${initialYear}`;

  if (isDifferentYear) {
    result += ` - ${finalYear}`;
  }

  return result;
}
