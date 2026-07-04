import type { WeekDayIntegers } from "@/types/calendarTypes";

// Local working type. Newly-drawn drafts can hold categoryId === null until
// the user picks a category; drafts are dropped on save.
export type WorkingWindow = {
  id: string;
  day: WeekDayIntegers;
  startTime: string;
  endTime: string;
  categoryId: string | null;
};

export function timeFromDate(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function endTimeFromDate(date: Date): string {
  if (date.getHours() === 0 && date.getMinutes() === 0) return "23:59";
  return timeFromDate(date);
}

export function dateToWeekDay(date: Date): WeekDayIntegers {
  return date.getDay() as WeekDayIntegers;
}

export function isSameDayOrMidnightEnd(start: Date, end: Date): boolean {
  if (start.toDateString() === end.toDateString()) return true;
  const nextMidnight = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 1,
  );
  return end.getTime() === nextMidnight.getTime();
}

export function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10));
  return h * 60 + m;
}

export function addMinutesToHHMM(hhmm: string, addMinutes: number): string {
  const total = timeToMinutes(hhmm) + addMinutes;
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function windowRangeOverlaps(
  windows: WorkingWindow[],
  start: Date,
  end: Date,
  excludeWindowId: string | null,
): boolean {
  const day = dateToWeekDay(start);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin =
    end.getHours() === 0 && end.getMinutes() === 0
      ? 24 * 60
      : end.getHours() * 60 + end.getMinutes();
  for (const w of windows) {
    if (w.id === excludeWindowId) continue;
    if (w.day !== day) continue;
    const wStart = timeToMinutes(w.startTime);
    const wEnd = w.endTime === "23:59" ? 24 * 60 : timeToMinutes(w.endTime);
    if (startMin < wEnd && endMin > wStart) return true;
  }
  return false;
}
