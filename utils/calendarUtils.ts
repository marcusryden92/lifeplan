/**
 * Calendar Utilities
 *
 * Backward-compatible exports. New code should use dateTimeService from
 * calendar-generation/utils/dateTimeService instead.
 */

import { WeekDayIntegers, WeekDayType } from "@/types/calendarTypes";
import { SimpleEvent, EventType } from "@/types/prisma";
import { EventInput } from "@fullcalendar/core/index.js";
import { RRule, Weekday } from "rrule";
import { dateTimeService } from "./calendar-generation/utils/dateTimeService";

// Re-export from dateTimeService for backward compatibility
export const getWeekdayFromDate = (date: Date): WeekDayType =>
  dateTimeService.getWeekdayFromDate(date);

const WEEKDAY_NAME_BY_INT: readonly WeekDayType[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const WEEKDAY_INT_BY_NAME: Record<WeekDayType, WeekDayIntegers> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export const weekdayToInt = (d: WeekDayType): WeekDayIntegers =>
  WEEKDAY_INT_BY_NAME[d];

export const intToWeekday = (i: WeekDayIntegers): WeekDayType =>
  WEEKDAY_NAME_BY_INT[i];

export const shiftDate = (date: Date, days: number): Date =>
  dateTimeService.shiftDays(date, days);

export const setTimeOnDate = (date: Date, time: string): Date =>
  dateTimeService.setTimeOnDate(date, time);

export const getDateOfThisWeeksMonday = (
  todaysDate: Date,
): Date | undefined => {
  if (!todaysDate) {
    console.warn("todaysDate is undefined in getDateOfThisWeeksMonday.");
    return undefined;
  }
  const dayOfWeek = todaysDate.getDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  return dateTimeService.shiftDays(todaysDate, -daysToMonday);
};

export const getWeekFirstDate = (
  weekStartDay: WeekDayIntegers,
  todaysDate: Date,
): Date => dateTimeService.getWeekFirstDate(todaysDate, weekStartDay);

export const floorMinutes = (date: Date | string): number =>
  dateTimeService.floorToSeconds(
    typeof date === "string" ? new Date(date) : date,
  );

export const getDuration = (start: Date | string, end: Date | string): number =>
  dateTimeService.getDuration(start, end);

export const formatTime = (date: Date): string =>
  dateTimeService.formatTime(date);

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

// Filters out legacy SimpleEvent rows carrying category/travel/template
// eventTypes — those live in their own tables now and would double-render
// against the new sources until the next regen destroys the leftovers.
export const transformEventsForFullCalendar = (
  events: SimpleEvent[],
): EventInput[] => {
  return events
    .filter((event) => {
      const legacyType = event.extendedProps?.eventType;
      return (
        legacyType !== EventType.category &&
        legacyType !== EventType.travel &&
        legacyType !== EventType.template
      );
    })
    .map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      duration: event.duration ?? undefined,
      rrule: event.rrule
        ? (JSON.parse(event.rrule) as Record<string, unknown>)
        : undefined,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      editable: true,
      extendedProps: {
        ...event.extendedProps,
        backgroundColor: event.backgroundColor,
      },
    }));
};

export function getCalendarHeaderDateString(
  initialDate: Date,
  finalDate: Date,
  monthArray: string[],
): string {
  return dateTimeService.getCalendarHeaderDateString(
    initialDate,
    finalDate,
    monthArray,
  );
}
