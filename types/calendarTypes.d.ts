import { EventContentArg } from "@fullcalendar/core/index.js";
import { EventImpl } from "@fullcalendar/core/internal";

export type WeekDayIntegers = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeekDayType =
  | "sunday" // index 0
  | "monday" // index 1
  | "tuesday" // index 2
  | "wednesday" // index 3
  | "thursday" // index 4
  | "friday" // index 5
  | "saturday"; // index 6

export type RRuleFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type RRuleWeekDayType = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
export type RRuleMonthlyByDayValue = number; // e.g. 1, -1, 2, -2 (first, last, second, second-to-last)

export type RRule = {
  freq: RRuleFrequency;
  interval?: number; // How often the recurrence rule repeats
  dtstart?: string; // ISO string - start date of the recurrence
  until?: string; // ISO string - end date of the recurrence
  count?: number; // Number of occurrences
  byweekday?: RRuleWeekDayType[]; // Specific days of the week
  bymonthday?: number[]; // Days of the month (1-31)
  bymonth?: number[]; // Months of the year (1-12)
  byyearday?: number[]; // Days of the year (1-366)
  byweekno?: number[]; // Weeks of the year (1-53)
  bysetpos?: number[]; // Positions to select from the matching sets
  wkst?: RRuleWeekDayType; // Week start day
  byhour?: number[]; // Hours of the day (0-23)
  byminute?: number[]; // Minutes of the hour (0-59)
  bysecond?: number[]; // Seconds of the minute (0-59)
  tzid?: string; // Timezone identifier
  byeaster?: number; // Days before or after Easter (only for 'yearly' freq)
  exclusions?: string[]; // Dates to exclude - ISO strings
  cache?: boolean; // Whether to cache the recurrence instances
  duration?: number; // Duration in milliseconds for FullCalendar
  exdate?: string[]; // Exclude specific dates - ISO strings
};

export type ExtendedPropsType = {
  isTemplateItem: boolean;
  backgroundColor: string;
  borderColor: string;
};

export type SimpleEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  rrule?: RRule;
  duration?: number;
  extendedProps: ExtendedPropsType;
};

export interface ExtendedEventContentArg extends EventContentArg {
  event: EventContentArg["event"] & {
    externalProps: {
      isTemplate: boolean;
    };
  };
}

export interface ExtendedEventImpl extends EventImpl {
  externalProps: {
    isTemplate: boolean;
  };
}
