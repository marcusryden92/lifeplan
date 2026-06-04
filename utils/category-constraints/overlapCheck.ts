import type { CategoryTimeWindow } from "@/types/categoryTypes";
import type { WeekDayIntegers } from "@/types/calendarTypes";

export interface Obstacle {
  id: string;
  label: string;
  timeSlots: CategoryTimeWindow[];
}

export interface OverlapConflict {
  obstacleId: string;
  obstacleLabel: string;
  day: WeekDayIntegers;
  candidateStartTime: string;
  candidateEndTime: string;
  conflictStartTime: string;
  conflictEndTime: string;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Windows where endTime <= startTime span midnight; split them into a [start..1440)
// segment on day D plus a [0..end) segment on day D+1 before checking overlap.
function expandToDayRanges(
  window: CategoryTimeWindow,
): Array<{ day: WeekDayIntegers; startMin: number; endMin: number }> {
  const startMin = toMinutes(window.startTime);
  const endMin = toMinutes(window.endTime);
  const spansMidnight = endMin <= startMin;

  if (!spansMidnight) {
    return [{ day: window.day, startMin, endMin }];
  }
  const out = [{ day: window.day, startMin, endMin: 1440 }];
  const nextDay = ((window.day + 1) % 7) as WeekDayIntegers;
  if (endMin > 0) out.push({ day: nextDay, startMin: 0, endMin });
  return out;
}

function rangesOverlap(
  a: { startMin: number; endMin: number },
  b: { startMin: number; endMin: number },
): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

function minutesToHHMM(min: number): string {
  const clamped = Math.max(0, Math.min(1440, min));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function findOverlap(
  candidates: CategoryTimeWindow[],
  obstacles: Obstacle[],
): OverlapConflict | null {
  const candidateRanges = candidates.flatMap((w) =>
    expandToDayRanges(w).map((r) => ({ ...r, source: w })),
  );

  for (const obstacle of obstacles) {
    for (const obstacleWindow of obstacle.timeSlots) {
      const obstacleRanges = expandToDayRanges(obstacleWindow);
      for (const cr of candidateRanges) {
        for (const or of obstacleRanges) {
          if (cr.day !== or.day) continue;
          if (!rangesOverlap(cr, or)) continue;
          return {
            obstacleId: obstacle.id,
            obstacleLabel: obstacle.label,
            day: cr.day,
            candidateStartTime: cr.source.startTime,
            candidateEndTime: cr.source.endTime,
            conflictStartTime: minutesToHHMM(or.startMin),
            conflictEndTime: minutesToHHMM(or.endMin),
          };
        }
      }
    }
  }
  return null;
}
