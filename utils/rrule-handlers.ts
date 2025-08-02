import { rrulestr, Weekday } from "rrule";
import type { RRule as RRuleType } from "@/types/calendarTypes";

const VALID_WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
type WeekdayString = (typeof VALID_WEEKDAYS)[number];

export function parseICalToRRule(ical: string): RRuleType | undefined {
  try {
    const rule = rrulestr(ical);
    const opts = rule.origOptions;

    const safeDate = (d?: Date | null): string | undefined =>
      d ? d.toISOString() : undefined;

    const weekdayIndexToString = (index: number): WeekdayString | undefined =>
      VALID_WEEKDAYS[index] ?? undefined;

    const convertWeekday = (
      byweekday?: number | Weekday | Weekday[] | string | string[] | null
    ): RRuleType["byweekday"] => {
      if (!byweekday) return undefined;

      const weekdays = Array.isArray(byweekday) ? byweekday : [byweekday];

      return weekdays
        .map((d) => {
          if (typeof d === "number") {
            return weekdayIndexToString(d);
          } else if (typeof d === "string") {
            return d.toUpperCase();
          } else {
            return d.toString().toUpperCase();
          }
        })
        .filter((d): d is WeekdayString =>
          VALID_WEEKDAYS.includes(d as WeekdayString)
        );
    };

    const convertWkst = (wkst?: number | Weekday | null): RRuleType["wkst"] => {
      if (wkst === null || wkst === undefined) return undefined;

      let str: string;
      if (typeof wkst === "number") {
        str = VALID_WEEKDAYS[wkst];
      } else {
        str = wkst.toString().toUpperCase();
      }

      return VALID_WEEKDAYS.includes(str as WeekdayString)
        ? (str as WeekdayString)
        : undefined;
    };

    const toArray = (
      v: number | number[] | null | undefined
    ): number[] | undefined => {
      if (v === null || v === undefined) return undefined;
      return Array.isArray(v) ? v : [v];
    };

    if (opts.freq === undefined) {
      throw new Error("Frequency (freq) is required in RRule");
    }

    const rrule: RRuleType = {
      freq: opts.freq as unknown as RRuleType["freq"], // Safe type assertion through unknown
      interval: opts.interval ?? 1,
      dtstart: safeDate(opts.dtstart),
      until: safeDate(opts.until),
      count: opts.count ?? undefined,
      byweekday: convertWeekday(
        opts.byweekday as
          | number
          | Weekday
          | Weekday[]
          | string
          | string[]
          | null
          | undefined
      ),
      bymonthday: toArray(opts.bymonthday),
      bymonth: toArray(opts.bymonth),
      byyearday: toArray(opts.byyearday),
      byweekno: toArray(opts.byweekno),
      bysetpos: toArray(opts.bysetpos),
      wkst: convertWkst(opts.wkst),
      byhour: toArray(opts.byhour),
      byminute: toArray(opts.byminute),
      bysecond: toArray(opts.bysecond),
      byeaster: opts.byeaster ?? undefined,

      // Custom fields
      tzid: undefined,
    };

    return rrule;
  } catch (err) {
    console.error("Failed to parse iCal RRule string:", err);
    return undefined;
  }
}
