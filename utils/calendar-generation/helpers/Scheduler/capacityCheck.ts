import { Planner, Category, PlannerType } from "@/types/prisma";
import { PerTemplateMask } from "../../models/TemplateModels";
import { Slot } from "../../models/TimeSlot";
import { gapIntervalsForDay } from "../TemplateExpander/gapIntervalsForDay";
import { expandSlotForDay } from "../TimeSlotManager/expandSlotForDay";
import { dateTimeService } from "../../utils/dateTimeService";
import { getTreeBottomLayer } from "../../../goalPageHandlers";
import { taskIsCompleted } from "../../../taskHelpers";

// A goal candidate is never placed as one block — scheduleGoal places its
// leaves one at a time — so for watermark/fit purposes its size is its
// largest uncompleted leaf, not the subtree aggregate. Treating the
// aggregate as a block made `biggestFit < biggestRemaining` permanently
// true for any substantial ready goal: the scheduling loop then burned its
// whole expansion budget on watermark `continue`s and exited without
// attempting a single candidate — silently, since nothing ever failed.
// Leaves the scheduler will never attempt (memoized past events, already
// placed this run) must be excluded for the same reason: sizing the goal by
// a leaf that can't be placed pins the watermark just like the aggregate did.
export function effectiveCandidateDuration(
  item: Planner,
  allPlanners: Planner[],
  excludedLeafIds?: Set<string>,
): number {
  if (item.plannerType !== PlannerType.goal) return item.duration;
  const leaves = getTreeBottomLayer(allPlanners, item.id).filter(
    (t) => !taskIsCompleted(t) && !excludedLeafIds?.has(t.id),
  );
  if (leaves.length === 0) return 0;
  return Math.max(...leaves.map((l) => l.duration));
}

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
//   - strict categories the task is NOT eligible for — those subtract from any
//     gap they overlap (the task can never use them),
//   - if the task is window-constrained, the largest single window across the
//     categories it is eligible for caps the result.
// Used to short-circuit TOO_LARGE at task entry before any slot-picking work.
//
// `eligibleCategoryIds` is the task's own effective category plus the
// non-confined ancestors it cascades into (see buildCategoryEligibilityMap);
// only members that actually bear windows constrain the ceiling.
//
// Cache is keyed by `categoryId ?? "anywhere"` because the calculation is
// identical for all tasks that resolve to the same effective category (and thus
// the same eligible set). Caller owns the cache (creates one per scheduling pass).
export function maxEffectiveCapacityFor(
  task: Planner,
  perTemplateMasks: PerTemplateMask[],
  categories: Category[],
  plannerCategoryMap: Map<string, string | null>,
  currentDate: Date,
  categoryEligibilityMap?: Map<string, Set<string>>,
  cache?: Map<string, number>,
): number {
  const taskCategoryId = plannerCategoryMap.get(task.id) ?? null;
  const cacheKey = taskCategoryId ?? "anywhere";
  const cached = cache?.get(cacheKey);
  if (cached !== undefined) return cached;

  const eligibleCategoryIds = taskCategoryId
    ? categoryEligibilityMap?.get(taskCategoryId)
    : undefined;

  // Window-bearing categories the task may occupy. Empty ⇒ unconstrained (the
  // task uses free gaps only, ceiling stays Infinity).
  const eligibleWindowCategories = eligibleCategoryIds
    ? categories.filter((c) => eligibleCategoryIds.has(c.id))
    : [];

  let categoryCeiling = Infinity;
  if (eligibleWindowCategories.length > 0) {
    categoryCeiling = 0;
    for (const category of eligibleWindowCategories) {
      const w = largestWindowInCategory(category);
      if (w > categoryCeiling) categoryCeiling = w;
    }
    if (categoryCeiling === 0) {
      cache?.set(cacheKey, 0);
      return 0;
    }
  }

  const weekStart = dateTimeService.startOfDay(currentDate);
  let largestGap = 0;

  for (let d = 0; d < 7; d++) {
    const dayStart = dateTimeService.shiftDays(weekStart, d);
    const gaps = gapIntervalsForDay(perTemplateMasks, dayStart);

    const exclusions: Array<{ start: Date; end: Date }> = [];
    for (const cat of categories) {
      if (!cat.isStrict) continue;
      if (eligibleCategoryIds?.has(cat.id)) continue;
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
// would accept for `biggest` — the caller-supplied biggest remaining candidate
// (by effectiveCandidateDuration; computed once per iteration in
// scheduleTasksAndGoals and shared with the watermark comparison). Mirrors the
// predicate in findAllFittingSlots: categorized task → only matching-category
// slots; uncategorized task → Available + non-strict-category slots. Used by
// the proactive expansion watermark in scheduleTasksAndGoals to decide whether
// to extend the horizon before attempting the next placement.
// placementCutoffDate (tail buffer) is respected the same way findAllFittingSlots
// honors it, so the watermark agrees with what the scheduler will actually
// see — otherwise the watermark could report "we have room" while every fit
// lies inside the buffer zone.
// schedulableCategoryIds is the set of categories that actually constrain
// geometry (useTimeWindows + windows) — the same filter findValidSlots
// applies via context.categories. A categoryId outside it (classification-
// only category) must be treated as unconstrained here too, or the watermark
// demands category slots that can never exist and starves the placement walk.
export function largestCompatibleSlotForLargestTask(
  biggest: Planner | null,
  slots: Slot[],
  plannerCategoryMap: Map<string, string | null>,
  categoryEligibilityMap: Map<string, Set<string>>,
  placementCutoffDate: Date | null | undefined,
  schedulableCategoryIds: Set<string>,
): number {
  if (!biggest) return 0;

  const rawCategoryId = plannerCategoryMap.get(biggest.id) ?? null;
  // Window-bearing categories this task cascades into. Constrained only when
  // that set is non-empty — mirrors findValidSlots / findAllFittingSlots.
  const eligibleWindowIds = rawCategoryId
    ? new Set(
        Array.from(categoryEligibilityMap.get(rawCategoryId) ?? []).filter(
          (id) => schedulableCategoryIds.has(id),
        ),
      )
    : new Set<string>();
  const constrained = eligibleWindowIds.size > 0;
  const cutoffMs = placementCutoffDate?.getTime();

  let largest = 0;
  for (const slot of slots) {
    if (slot.type !== "available" && slot.type !== "category") continue;
    if (cutoffMs !== undefined && slot.start.getTime() >= cutoffMs) break;
    if (constrained) {
      if (slot.type !== "category" || !eligibleWindowIds.has(slot.categoryId)) {
        continue;
      }
    } else if (slot.type === "category" && slot.isStrictCategory) {
      continue;
    }
    if (slot.durationMinutes > largest) largest = slot.durationMinutes;
  }
  return largest;
}
