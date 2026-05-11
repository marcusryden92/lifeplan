import type { CategoryTimeSlot } from "@/types/categoryTypes";
import { hhmmToMinutes } from "../../utils/dateTimeService";

// Resolve a recurring category time-slot rule into concrete bounds for a
// specific day. Returns null when the rule does not apply to that day-of-week.
// Handles overnight slots (endTime <= startTime → period extends past midnight).
export function expandSlotForDay(
  catSlot: CategoryTimeSlot,
  dayStart: Date,
): { start: Date; end: Date } | null {
  const dow = dayStart.getDay();
  if (!catSlot.days.some((d) => d === dow)) return null;

  const startMin = hhmmToMinutes(catSlot.startTime);
  let endMin = hhmmToMinutes(catSlot.endTime);
  if (endMin <= startMin) endMin += 24 * 60;

  const start = new Date(dayStart);
  start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
  const end = new Date(start.getTime() + (endMin - startMin) * 60000);

  return { start, end };
}
