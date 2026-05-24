import { Planner, Category } from "@/types/prisma";
import { PerTemplateMask } from "../../models/TemplateModels";
import { Slot } from "../../models/TimeSlot";
import { TemplateExpander } from "../../core/TemplateExpander";
import { expandSlotForDay } from "../TimeSlotManager/expandSlotForDay";
import { dateTimeService } from "../../utils/dateTimeService";

// Max usable duration in a single category window, ignoring everything else.
// Handles midnight wrap the same way expandSlotForDay does so the result is
// consistent with what the scheduler will actually see at placement time.
function largestWindowInCategory(category: Category): number {
  let max = 0;
  for (const ts of category.timeSlots) {
    const [sh, sm] = ts.startTime.split(":").map(Number);
    const [eh, em] = ts.endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin <= startMin) endMin += 24 * 60;
    const dur = endMin - startMin;
    if (dur > max) max = dur;
  }
  return max;
}

// Subtract a set of exclusion intervals from one source interval. Returns the
// surviving sub-intervals in order. Inputs need not be sorted.
function subtractIntervals(
  source: { start: Date; end: Date },
  exclusions: Array<{ start: Date; end: Date }>,
): Array<{ start: Date; end: Date }> {
  let pieces: Array<{ start: Date; end: Date }> = [source];
  for (const ex of exclusions) {
    const next: Array<{ start: Date; end: Date }> = [];
    for (const p of pieces) {
      if (
        ex.end.getTime() <= p.start.getTime() ||
        ex.start.getTime() >= p.end.getTime()
      ) {
        next.push(p);
        continue;
      }
      if (ex.start.getTime() > p.start.getTime()) {
        next.push({ start: p.start, end: ex.start });
      }
      if (ex.end.getTime() < p.end.getTime()) {
        next.push({ start: ex.end, end: p.end });
      }
    }
    pieces = next;
  }
  return pieces;
}

// Upper bound on the duration this specific task could ever occupy in a clean
// week, accounting for:
//   - templates carving the day into gap intervals,
//   - strict categories whose categoryId differs from the task's — those
//     subtract from any gap they overlap (the task can never use them),
//   - if the task is categorized, the largest single window in its own
//     category caps the result.
// Used to short-circuit TOO_LARGE at task entry before any slot-picking work.
//
// Cache is keyed by `categoryId ?? "anywhere"` because the calculation is
// identical for all tasks that resolve to the same effective category. Caller
// owns the cache (creates one per scheduling pass).
export function maxEffectiveCapacityFor(
  task: Planner,
  perTemplateMasks: PerTemplateMask[],
  categories: Category[],
  plannerCategoryMap: Map<string, string | null>,
  currentDate: Date,
  cache?: Map<string, number>,
): number {
  const taskCategoryId = plannerCategoryMap.get(task.id) ?? null;
  const cacheKey = taskCategoryId ?? "anywhere";
  const cached = cache?.get(cacheKey);
  if (cached !== undefined) return cached;

  let categoryCeiling = Infinity;
  if (taskCategoryId) {
    const category = categories.find((c) => c.id === taskCategoryId);
    if (category) {
      categoryCeiling = largestWindowInCategory(category);
      if (categoryCeiling === 0) {
        cache?.set(cacheKey, 0);
        return 0;
      }
    }
  }

  const weekStart = dateTimeService.startOfDay(currentDate);
  let largestGap = 0;

  for (let d = 0; d < 7; d++) {
    const dayStart = dateTimeService.shiftDays(weekStart, d);
    const gaps = TemplateExpander.gapIntervalsForDay(perTemplateMasks, dayStart);

    const exclusions: Array<{ start: Date; end: Date }> = [];
    for (const cat of categories) {
      if (!cat.isStrict) continue;
      if (cat.id === taskCategoryId) continue;
      for (const ts of cat.timeSlots) {
        const period = expandSlotForDay(ts, dayStart);
        if (period) exclusions.push(period);
      }
    }

    for (const gap of gaps) {
      const remaining = subtractIntervals(gap, exclusions);
      for (const piece of remaining) {
        const len = (piece.end.getTime() - piece.start.getTime()) / 60000;
        if (len > largestGap) largestGap = len;
      }
    }
  }

  const result = Math.min(categoryCeiling, largestGap);
  cache?.set(cacheKey, result);
  return result;
}

// Walks the current slot array and returns the largest slot the scheduler
// would accept for the biggest remaining candidate. Mirrors the predicate in
// findAllFittingSlots: categorized task → only matching-category slots;
// uncategorized task → Available + non-strict-category slots. Used by the
// proactive expansion watermark in scheduleTasksAndGoals to decide whether to
// extend the horizon before attempting the next placement.
export function largestCompatibleSlotForLargestTask(
  candidates: Planner[],
  slots: Slot[],
  plannerCategoryMap: Map<string, string | null>,
): number {
  if (candidates.length === 0) return 0;

  let biggest: Planner | null = null;
  for (const c of candidates) {
    if (!biggest || c.duration > biggest.duration) biggest = c;
  }
  if (!biggest) return 0;

  const taskCategoryId = plannerCategoryMap.get(biggest.id) ?? null;

  let largest = 0;
  for (const slot of slots) {
    if (slot.type !== "available" && slot.type !== "category") continue;
    if (taskCategoryId) {
      if (slot.type !== "category" || slot.categoryId !== taskCategoryId) {
        continue;
      }
    } else if (slot.type === "category" && slot.isStrictCategory) {
      continue;
    }
    if (slot.durationMinutes > largest) largest = slot.durationMinutes;
  }
  return largest;
}
