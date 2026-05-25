import type { CategoryTimeWindow } from "@/types/categoryTypes";
import type { WeekDayIntegers } from "@/types/calendarTypes";

export interface PerDayBlock {
  key: string;
  day: WeekDayIntegers;
  startTime: string;
  endTime: string;
}

function makeKey(
  day: WeekDayIntegers,
  startTime: string,
  endTime: string,
  seq: number,
): string {
  return `cb-${day}-${startTime}-${endTime}-${seq}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Convert stored multi-day records into per-day visual blocks. Midnight-spanning
// records (endTime <= startTime) split across the day boundary into two blocks.
export function splitToPerDayBlocks(
  slots: CategoryTimeWindow[],
): PerDayBlock[] {
  const blocks: PerDayBlock[] = [];
  let seq = 0;
  for (const slot of slots) {
    const startMin = toMinutes(slot.startTime);
    const endMin = toMinutes(slot.endTime);
    const spansMidnight = endMin <= startMin;
    for (const day of slot.days) {
      if (spansMidnight) {
        blocks.push({
          key: makeKey(day, slot.startTime, "23:59", seq++),
          day,
          startTime: slot.startTime,
          endTime: "23:59",
        });
        if (endMin > 0) {
          const nextDay = ((day + 1) % 7) as WeekDayIntegers;
          blocks.push({
            key: makeKey(nextDay, "00:00", slot.endTime, seq++),
            day: nextDay,
            startTime: "00:00",
            endTime: slot.endTime,
          });
        }
      } else {
        blocks.push({
          key: makeKey(day, slot.startTime, slot.endTime, seq++),
          day,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }
  }
  return blocks;
}

// Identical (startTime, endTime) per-day blocks collapse into a single multi-day
// record so the DB shape stays compact.
export function regroupToTimeWindows(
  blocks: PerDayBlock[],
): CategoryTimeWindow[] {
  const byTimeRange = new Map<string, WeekDayIntegers[]>();
  for (const block of blocks) {
    const k = `${block.startTime}-${block.endTime}`;
    const days = byTimeRange.get(k) ?? [];
    if (!days.includes(block.day)) days.push(block.day);
    byTimeRange.set(k, days);
  }

  const result: CategoryTimeWindow[] = [];
  for (const [k, days] of byTimeRange) {
    const [startTime, endTime] = k.split("-") as [string, string];
    result.push({
      days: days.sort((a, b) => a - b),
      startTime,
      endTime,
    });
  }
  return result;
}
