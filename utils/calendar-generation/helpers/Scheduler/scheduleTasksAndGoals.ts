import { Planner, SimpleEvent, PlannerType, Category } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { PerTemplateMask } from "../../models/TemplateModels";
import { SchedulingFailure } from "../../models/SchedulingModels";
import { Slot } from "../../models/TimeSlot";
import { SCHEDULING_CONFIG, SchedulingFailureReason } from "../../constants";
import { scheduleSingleTask } from "./scheduleSingleTask";
import { scheduleGoal } from "./scheduleGoal";
import { expandSlots } from "./expandSlots";
import { TravelPassRecorder } from "../TravelManager/TravelPassRecorder";
import {
  largestCompatibleSlotForLargestTask,
  effectiveCandidateDuration,
  maxEffectiveCapacityFor,
} from "./capacityCheck";
import {
  SplitRelaxation,
  createSplitPlacementState,
} from "./scheduleSplitTask";
import { GoalCapRelaxation, createGoalCapState } from "./goalDayCap";
import type { PrecedenceEdge } from "@/utils/precedence/types";
import {
  ChainOutcome,
  SequenceBreak,
  seedChainOutcomes,
  gateCandidate,
  isBlocked,
  recordSequenceBreaks,
} from "./precedenceGate";

export function scheduleTasksAndGoals(
  scheduler: Scheduler,
  allPlanners: Planner[],
  candidates: Planner[],
  memoizedEventIds: Set<string>,
  perTemplateMasks: PerTemplateMask[],
  plannerLocationMap: Map<string, string | null>,
  categories: Category[],
  travelPassRecorder?: TravelPassRecorder,
): {
  success: boolean;
  newEvents: SimpleEvent[];
  failures: SchedulingFailure[];
  splitRelaxations: SplitRelaxation[];
  goalCapRelaxations: GoalCapRelaxation[];
  sequenceBreaks: SequenceBreak[];
} {
  const { slotManager, travelManager, context } = scheduler;
  const events: SimpleEvent[] = [];
  const failures: SchedulingFailure[] = [];
  const scheduledTaskIds = new Set<string>();
  // Split-task bookkeeping shared across iterations: partially placed tasks
  // resume from their remainder after horizon expansion instead of restarting.
  const splitState = createSplitPlacementState();
  // Per-goal daily-cap ledgers, shared for the same reason.
  const goalCapState = createGoalCapState();

  const plannerCategoryMap =
    context.plannerCategoryMap ?? new Map<string, string | null>();
  const categoryEligibilityMap =
    context.categoryEligibilityMap ?? new Map<string, Set<string>>();
  const capacityCache = new Map<string, number>();
  // `categories` is already filtered to window-bearing categories upstream
  // (CalendarGenerator.scheduledCategories) — the watermark must resolve
  // constraints against the same set placement uses.
  const schedulableCategoryIds = new Set(categories.map((c) => c.id));

  // Precedence gate state. Edge sources that are not candidates this run
  // (memoized past, unready-goal dependency predecessors, anything
  // unseedable) resolve up front; candidate sources resolve as the walk
  // places or permanently fails them. A candidate whose predecessor outcome
  // is still missing is SKIPPED (stays a candidate) — never scheduled early.
  const predecessorMap =
    context.predecessorMap ?? new Map<string, PrecedenceEdge[]>();
  const allEdges: PrecedenceEdge[] = [];
  for (const list of predecessorMap.values()) allEdges.push(...list);
  const chainOutcome: Map<string, ChainOutcome> = seedChainOutcomes(
    allEdges,
    candidates,
    allPlanners,
    context.scheduledEvents,
  );
  const sequenceBreaks: SequenceBreak[] = [];
  const seenBreakKeys = new Set<string>();
  // Accumulates the max placed end per candidate across passes — a split
  // task's early chunks and a goal's early leaves land in earlier passes
  // than the pass that finally reports scheduled.
  const lastEndBySource = new Map<string, Date>();
  const noteEnd = (id: string, end: Date | undefined) => {
    if (!end) return;
    const prior = lastEndBySource.get(id);
    if (!prior || end > prior) lastEndBySource.set(id, end);
  };
  const maxEventEnd = (eventList: SimpleEvent[]): Date | undefined => {
    let max: Date | undefined;
    for (const e of eventList) {
      const end = new Date(e.end);
      if (!max || end > max) max = end;
    }
    return max;
  };

  let expansionsDone = 0;

  while (
    candidates.length > 0 &&
    expansionsDone < SCHEDULING_CONFIG.MAX_WEEKS_TO_SEARCH
  ) {
    // Compute and publish the tail-buffer cutoff for this iteration. Anything
    // starting at or after this date is off-limits to dynamic placement, so
    // the next expansion's static-pass resume has empty room at the seam.
    // Anchor: the latest end among placeable slots (Available + Category).
    // Trailing nightly-template Occupieds are intentionally excluded, else
    // the cutoff would always sit at midnight and the buffer would never
    // shrink the placement window.
    context.placementCutoffDate = computePlacementCutoff(slotManager.slots);

    // Proactive watermark: if either the available-slot count is below the
    // threshold or the biggest remaining task can't fit any compatible slot,
    // expand the horizon before burning iterations on guaranteed failures.
    // The reactive expansion at the bottom still fires after a fully-failed
    // pass, catching location/travel cases the watermark doesn't model.
    let availableCount = 0;
    for (const s of slotManager.slots) {
      if (s.type === "available") availableCount++;
    }
    // Goal candidates size as their largest uncompleted leaf, not the
    // subtree aggregate — scheduleGoal places leaves individually, and the
    // aggregate can exceed any possible slot, which would pin this watermark
    // permanently true and starve the placement walk below. Leaves already
    // placed (this run or memoized from the previous calendar) are excluded
    // from the sizing for the same reason. Precedence-blocked candidates are
    // excluded too: they cannot use an expansion until their predecessors
    // resolve, so they must not trigger one.
    const unplaceableLeafIds = new Set([
      ...memoizedEventIds,
      ...scheduledTaskIds,
    ]);
    let biggestRemaining = 0;
    let biggestCandidate: Planner | null = null;
    for (const c of candidates) {
      if (isBlocked(c.id, predecessorMap, chainOutcome)) continue;
      const duration = effectiveCandidateDuration(
        c,
        allPlanners,
        unplaceableLeafIds,
      );
      // A block over the weekly geometry ceiling can NEVER fit — the ceiling
      // is horizon-independent, so expansion can't help. Sizing the watermark
      // by it would burn the whole budget on guaranteed misses before the
      // walk ever got to fail the candidate fast as TOO_LARGE.
      const capacityCeiling = maxEffectiveCapacityFor(
        c,
        perTemplateMasks,
        categories,
        plannerCategoryMap,
        context.currentDate,
        categoryEligibilityMap,
        capacityCache,
      );
      if (duration > capacityCeiling) continue;
      if (biggestCandidate === null || duration > biggestRemaining) {
        biggestRemaining = duration;
        biggestCandidate = c;
      }
    }
    const biggestFit = largestCompatibleSlotForLargestTask(
      biggestCandidate,
      slotManager.slots,
      plannerCategoryMap,
      categoryEligibilityMap,
      context.placementCutoffDate,
      schedulableCategoryIds,
    );

    if (
      availableCount < SCHEDULING_CONFIG.LOW_SLOT_WATERMARK ||
      biggestFit < biggestRemaining
    ) {
      expansionsDone++;
      expandSlots(
        context,
        perTemplateMasks,
        plannerLocationMap,
        categories,
        slotManager,
        travelManager,
        "watermark",
        travelPassRecorder,
      );
      continue;
    }

    // Walk candidates in sorted order — category-constrained and
    // highest-urgency items pick slots first. Removals are collected and
    // applied after the pass so the walk order matches the sort (the previous
    // reverse-index splice idiom handed first pick to the lowest-urgency,
    // unconstrained item, inverting the sorter's intent under contention).
    const resolvedIds = new Set<string>();

    for (const item of candidates) {
      const gate = gateCandidate(item.id, predecessorMap, chainOutcome);
      // A missing predecessor outcome means "keep waiting" — the item stays
      // a candidate and is not added to resolvedIds.
      if (gate.blocked) continue;
      recordSequenceBreaks(sequenceBreaks, seenBreakKeys, gate.failedEdges);
      const afterTime = gate.afterTime;

      if (item.plannerType === PlannerType.task) {
        const result = scheduleSingleTask(
          item,
          scheduledTaskIds,
          failures,
          scheduler,
          perTemplateMasks,
          categories,
          plannerCategoryMap,
          categoryEligibilityMap,
          context.currentDate,
          capacityCache,
          splitState,
          false,
          afterTime,
        );

        events.push(...result.events);
        noteEnd(item.id, maxEventEnd(result.events));
        if (result.scheduled) {
          chainOutcome.set(item.id, {
            status: "placed",
            lastEnd: lastEndBySource.get(item.id),
          });
        } else if (result.permanentFailure) {
          chainOutcome.set(item.id, { status: "failed", failCause: "failed" });
        }
        // A PARTIALLY placed split task (events but not scheduled) leaves its
        // outcome unset — the successor keeps waiting rather than binding to
        // an early chunk. NO_SLOTS likewise stays unset through expansion.
        if (result.scheduled || result.permanentFailure) {
          resolvedIds.add(item.id);
        }
      } else if (item.plannerType === PlannerType.goal) {
        const result = scheduleGoal(
          item,
          allPlanners,
          scheduledTaskIds,
          memoizedEventIds,
          failures,
          events,
          scheduler,
          perTemplateMasks,
          categories,
          plannerCategoryMap,
          categoryEligibilityMap,
          context.currentDate,
          capacityCache,
          splitState,
          goalCapState,
          false,
          afterTime,
        );

        noteEnd(item.id, result.lastPlacedEnd);
        if (result.scheduled) {
          chainOutcome.set(item.id, {
            status: "placed",
            lastEnd: lastEndBySource.get(item.id),
          });
        } else if (result.permanentFailure) {
          chainOutcome.set(item.id, { status: "failed", failCause: "failed" });
        }
        if (result.scheduled || result.permanentFailure) {
          resolvedIds.add(item.id);
        }
      }
    }

    if (resolvedIds.size > 0) {
      const remaining = candidates.filter((c) => !resolvedIds.has(c.id));
      candidates.splice(0, candidates.length, ...remaining);
      // Progress was made: re-walk immediately so successors blocked on the
      // just-resolved items get their turn against the SAME slot fabric.
      // Expanding here would burn budget on room nobody proved they need.
      // Finite: every non-expanding iteration resolves at least one candidate.
      if (candidates.length > 0) continue;
    }

    if (candidates.length > 0) {
      expansionsDone++;
      expandSlots(
        context,
        perTemplateMasks,
        plannerLocationMap,
        categories,
        slotManager,
        travelManager,
        "fallback",
        travelPassRecorder,
      );
    }
  }

  // Budget exhausted: every edge source still without an outcome is marked
  // failed with cause "horizon" so the compromise pass below runs fully
  // gate-resolved — no candidate is skipped, blocked successors get their one
  // relaxed attempt, and the break surfaces as "past the horizon" rather than
  // pretending the sequence broke.
  if (candidates.length > 0) {
    for (const edge of allEdges) {
      if (!chainOutcome.has(edge.fromId)) {
        chainOutcome.set(edge.fromId, {
          status: "failed",
          failCause: "horizon",
        });
      }
    }
  }

  // Final compromise pass: with the expansion budget spent, retry what's left
  // with the split day cap relaxed — placing a chunk over the user's per-day
  // preference beats dropping the minutes entirely. Every compromise is
  // recorded in splitState.relaxations and surfaced as an engine message.
  // Non-split candidates get one last ordinary attempt, which is harmless.
  if (candidates.length > 0) {
    context.placementCutoffDate = computePlacementCutoff(slotManager.slots);
    const resolvedIds = new Set<string>();
    for (const item of candidates) {
      const gate = gateCandidate(item.id, predecessorMap, chainOutcome);
      // Every outcome is resolved by the horizon marking above, so nothing
      // is blocked here; the guard is belt-and-braces.
      if (gate.blocked) continue;
      recordSequenceBreaks(sequenceBreaks, seenBreakKeys, gate.failedEdges);
      const afterTime = gate.afterTime;

      if (item.plannerType === PlannerType.task) {
        const result = scheduleSingleTask(
          item,
          scheduledTaskIds,
          failures,
          scheduler,
          perTemplateMasks,
          categories,
          plannerCategoryMap,
          categoryEligibilityMap,
          context.currentDate,
          capacityCache,
          splitState,
          true,
          afterTime,
        );
        events.push(...result.events);
        noteEnd(item.id, maxEventEnd(result.events));
        if (result.scheduled) {
          chainOutcome.set(item.id, {
            status: "placed",
            lastEnd: lastEndBySource.get(item.id),
          });
        }
        if (result.scheduled || result.permanentFailure) {
          resolvedIds.add(item.id);
        }
      } else if (item.plannerType === PlannerType.goal) {
        const result = scheduleGoal(
          item,
          allPlanners,
          scheduledTaskIds,
          memoizedEventIds,
          failures,
          events,
          scheduler,
          perTemplateMasks,
          categories,
          plannerCategoryMap,
          categoryEligibilityMap,
          context.currentDate,
          capacityCache,
          splitState,
          goalCapState,
          true,
          afterTime,
        );
        noteEnd(item.id, result.lastPlacedEnd);
        if (result.scheduled) {
          chainOutcome.set(item.id, {
            status: "placed",
            lastEnd: lastEndBySource.get(item.id),
          });
        }
        if (result.scheduled || result.permanentFailure) {
          resolvedIds.add(item.id);
        }
      }
    }
    if (resolvedIds.size > 0) {
      const remaining = candidates.filter((c) => !resolvedIds.has(c.id));
      candidates.splice(0, candidates.length, ...remaining);
    }
  }

  // Candidates still standing when the expansion budget runs out must fail
  // loudly. This exit used to be silent (no event, no failure), which let a
  // starved run report SCHEDULED_OK while the sync deleted every previously
  // placed event.
  for (const item of candidates) {
    failures.push({
      taskId: item.id,
      taskTitle: item.title,
      reason: SchedulingFailureReason.NO_SLOTS,
      details: `Horizon expansion budget exhausted (${expansionsDone} expansions) before a slot was found`,
      context: { expansionsDone },
    });
  }

  // Drop failures for tasks that eventually placed on a later iteration.
  // A NO_SLOTS on attempt 1 that succeeds after expansion is not something the
  // console should surface — the retry was the whole point of the outer loop.
  const finalFailures = failures.filter((f) => !scheduledTaskIds.has(f.taskId));

  // Breaks are recorded only at the moment a successor actually proceeded
  // past a failed predecessor, so no post-hoc filtering: even if that
  // predecessor later placed in the compromise pass, the successor's
  // placement never waited for it and the violation is real.
  return {
    success: finalFailures.length === 0 && candidates.length === 0,
    newEvents: events,
    failures: finalFailures,
    splitRelaxations: splitState.relaxations,
    goalCapRelaxations: goalCapState.relaxations,
    sequenceBreaks,
  };
}

// Tail-buffer cutoff: dynamic placement is suppressed at and after this date.
// Anchor = max end among placeable slots (Available + Category) - buffer days.
// Excludes Travel/Occupied so trailing nightly templates don't pin the anchor
// at midnight, which would leave no buffer behind the actual placement region.
function computePlacementCutoff(slots: Slot[]): Date | null {
  let lastPlaceableEndMs = 0;
  for (const s of slots) {
    if (s.type !== "available" && s.type !== "category") continue;
    const endMs = s.end.getTime();
    if (endMs > lastPlaceableEndMs) lastPlaceableEndMs = endMs;
  }
  if (lastPlaceableEndMs === 0) return null;
  return new Date(
    lastPlaceableEndMs -
      SCHEDULING_CONFIG.PLACEMENT_BUFFER_DAYS * 24 * 60 * 60 * 1000,
  );
}
