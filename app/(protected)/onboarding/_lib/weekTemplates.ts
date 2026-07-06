import { v4 as uuidv4 } from "uuid";
import type { EventTemplate } from "@/types/prisma";
import type { WeekDayIntegers } from "@/types/calendarTypes";

export const ALL_WEEK_DAYS: WeekDayIntegers[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS: WeekDayIntegers[] = [1, 2, 3, 4, 5];

// All drawn from the calendar palette (data/calendarColors).
const SLEEP_COLOR = "#1D3557"; // navy — deep blue for night
const EXERCISE_COLOR = "#2E7D32"; // forest green
const MORNING_COLOR = "#FFB703"; // amber — sunrise
const EVENING_COLOR = "#6C5CE7"; // violet — dusk

export type SleepInput = { start: string; end: string };
export type WorkInput = {
  start: string;
  end: string;
  days: WeekDayIntegers[];
  locationId: string | null;
};
export type ExerciseInput = {
  start: string;
  end: string;
  days: WeekDayIntegers[];
};
export type RitualInput = { start: string; end: string };

export type WeekFormInput = {
  sleep: SleepInput | null;
  work: WorkInput | null;
  // Optional so existing callers/tests that only set sleep + work keep working.
  exercise?: ExerciseInput | null;
  morning?: RitualInput | null;
  evening?: RitualInput | null;
};

type RawBlock = {
  startDay: WeekDayIntegers;
  startTime: string;
  duration: number;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Splits a daily [start, end) range at midnight so every emitted block stays
// within a single calendar day. The engine also accepts a single block whose
// duration crosses midnight, but WeekStructureModal's grid renders one as a
// negative-duration event — matching its single-day shape keeps the two
// authoring surfaces in agreement.
export function expandDailyRange(
  days: WeekDayIntegers[],
  start: string,
  end: string,
): RawBlock[] {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  const blocks: RawBlock[] = [];

  for (const day of days) {
    if (endMin > startMin) {
      blocks.push({ startDay: day, startTime: start, duration: endMin - startMin });
      continue;
    }
    // Crosses midnight: an evening piece to 24:00 and a morning piece from
    // 00:00, dropping either if it would be zero-length.
    const eveningDuration = 24 * 60 - startMin;
    if (eveningDuration > 0) {
      blocks.push({ startDay: day, startTime: start, duration: eveningDuration });
    }
    if (endMin > 0) {
      blocks.push({ startDay: day, startTime: "00:00", duration: endMin });
    }
  }

  return blocks;
}

// Mints EventTemplate rows from the onboarding week form. Only sleep is a
// template (a recurring committed block); work hours become time windows on a
// Work category instead — see applyWorkCategory.
export function buildWeekTemplates(
  input: WeekFormInput,
  userId: string,
  nowIso: string,
): EventTemplate[] {
  const templates: EventTemplate[] = [];

  const push = (
    block: RawBlock,
    title: string,
    color: string,
    locationId: string | null,
  ) => {
    templates.push({
      id: uuidv4(),
      title,
      startDay: block.startDay,
      startTime: block.startTime,
      duration: block.duration,
      color,
      locationId,
      userId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  };

  if (input.sleep) {
    for (const block of expandDailyRange(
      ALL_WEEK_DAYS,
      input.sleep.start,
      input.sleep.end,
    )) {
      push(block, "Sleep", SLEEP_COLOR, null);
    }
  }

  if (input.exercise && input.exercise.days.length > 0) {
    for (const block of expandDailyRange(
      input.exercise.days,
      input.exercise.start,
      input.exercise.end,
    )) {
      push(block, "Exercise", EXERCISE_COLOR, null);
    }
  }

  if (input.morning) {
    for (const block of expandDailyRange(
      ALL_WEEK_DAYS,
      input.morning.start,
      input.morning.end,
    )) {
      push(block, "Morning routine", MORNING_COLOR, null);
    }
  }

  if (input.evening) {
    for (const block of expandDailyRange(
      ALL_WEEK_DAYS,
      input.evening.start,
      input.evening.end,
    )) {
      push(block, "Evening routine", EVENING_COLOR, null);
    }
  }

  return templates;
}
