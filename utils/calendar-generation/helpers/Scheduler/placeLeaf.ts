import { Planner, SimpleEvent, Category } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { SchedulingFailure } from "../../models/SchedulingModels";
import { SchedulingFailureReason } from "../../constants";
import { PerTemplateMask } from "../../models/TemplateModels";
import { maxEffectiveCapacityFor } from "./capacityCheck";
import { parseTaskSplitting, minChunkRequired } from "../../../taskSplitting";
import { maxAllowedBlockMinutes } from "../../../allowedTimes";
import {
  SplitPlacementState,
  scheduleSplitTask,
  splitRemainingForRun,
} from "./scheduleSplitTask";
import { GoalCapContext, wholeBlockSizing } from "./goalDayCap";

// Unified placement of ONE schedulable leaf — the primitive the flat-order
// loop drives. It merges what scheduleSingleTask (standalone tasks) and
// scheduleGoal's per-leaf block (goal leaves) used to do separately: the
// TOO_LARGE gate, split-task chunk loop, optional goal-day-cap sizing, and
// plain placement. Callers own the per-goal daily-cap context (goalCap) and
// the running afterTime chain; this function does not know about tree
// structure. A leaf is a leaf.

export interface PlaceLeafArgs {
  leaf: Planner;
  scheduler: Scheduler;
  perTemplateMasks: PerTemplateMask[];
  categories: Category[];
  plannerCategoryMap: Map<string, string | null>;
  categoryEligibilityMap: Map<string, Set<string>>;
  currentDate: Date;
  capacityCache: Map<string, number>;
  splitState: SplitPlacementState;
  scheduledTaskIds: Set<string>;
  failures: SchedulingFailure[];
  afterTime?: Date;
  allowDayCapRelaxation?: boolean;
  /** Present when the leaf sits under a goal (or detour host) with a daily cap. */
  goalCap?: GoalCapContext;
}

export interface PlaceLeafResult {
  /** Fully placed this call (or already placed on a prior pass). */
  scheduled: boolean;
  /** TOO_LARGE / INVALID — never worth retrying; the chain steps past it. */
  permanentFailure: boolean;
  events: SimpleEvent[];
  /** Max end among events placed this call — advances the caller's chain. */
  lastEnd?: Date;
}

function maxEventEnd(events: SimpleEvent[]): Date | undefined {
  let max: Date | undefined;
  for (const e of events) {
    const end = new Date(e.end);
    if (!max || end > max) max = end;
  }
  return max;
}

export function placeLeaf(args: PlaceLeafArgs): PlaceLeafResult {
  const {
    leaf,
    scheduler,
    perTemplateMasks,
    categories,
    plannerCategoryMap,
    categoryEligibilityMap,
    currentDate,
    capacityCache,
    splitState,
    scheduledTaskIds,
    failures,
    afterTime,
    allowDayCapRelaxation = false,
    goalCap,
  } = args;

  if (scheduledTaskIds.has(leaf.id)) {
    return { scheduled: true, permanentFailure: false, events: [] };
  }

  const splitSettings = parseTaskSplitting(leaf.splitting);

  const allowedCeiling = maxAllowedBlockMinutes(
    scheduler.context.plannerConstraintsMap?.get(leaf.id)?.allowedTimes ?? [],
  );
  const maxCapacity = Math.min(
    maxEffectiveCapacityFor(
      leaf,
      perTemplateMasks,
      categories,
      plannerCategoryMap,
      currentDate,
      categoryEligibilityMap,
      capacityCache,
    ),
    allowedCeiling,
  );

  const requiredBlockMinutes = splitSettings
    ? minChunkRequired(splitRemainingForRun(leaf, splitState), splitSettings)
    : leaf.duration;

  if (requiredBlockMinutes > maxCapacity) {
    failures.push({
      taskId: leaf.id,
      taskTitle: leaf.title,
      reason: SchedulingFailureReason.TOO_LARGE,
      details: `Task duration (${requiredBlockMinutes} min${splitSettings ? ", minimum chunk" : ""}) exceeds max effective capacity (${maxCapacity} min) given templates, category, and allowed-time constraints`,
      context: { duration: requiredBlockMinutes, maxCapacity },
    });
    return { scheduled: false, permanentFailure: true, events: [] };
  }

  if (splitSettings) {
    const result = scheduleSplitTask({
      task: leaf,
      settings: splitSettings,
      scheduler,
      state: splitState,
      afterTime,
      allowDayCapRelaxation,
      goalCap,
    });
    const lastEnd = maxEventEnd(result.events);
    if (result.fullyPlaced) {
      scheduledTaskIds.add(leaf.id);
      return {
        scheduled: true,
        permanentFailure: false,
        events: result.events,
        lastEnd,
      };
    }
    if (result.failure) failures.push(result.failure);
    // Partial placements stay on the calendar; the leaf remains unresolved and
    // resumes from its remainder after the next horizon expansion.
    return {
      scheduled: false,
      permanentFailure: false,
      events: result.events,
      lastEnd,
    };
  }

  // A leaf bigger than its goal's daily cap can never place under it — no
  // horizon expansion creates such a day — so it places whole immediately
  // (recorded as an oversizedLeaf compromise) instead of starving the loop.
  const oversizedLeaf = goalCap !== undefined && leaf.duration > goalCap.capMinutes;
  let res =
    goalCap && !oversizedLeaf
      ? scheduler.scheduleTask(
          leaf,
          afterTime,
          wholeBlockSizing(leaf.duration, goalCap.budget),
        )
      : scheduler.scheduleTask(leaf, afterTime);
  let dayCapRelaxed = false;
  if (goalCap && !oversizedLeaf && !res.success && allowDayCapRelaxation) {
    res = scheduler.scheduleTask(leaf, afterTime);
    dayCapRelaxed = res.success;
  }

  if (res.success && res.event) {
    if (goalCap) {
      const start = new Date(res.event.start);
      const end = new Date(res.event.end);
      const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
      if (oversizedLeaf) {
        goalCap.recordRelaxation("oversizedLeaf", minutes, res.event.start);
      } else if (dayCapRelaxed && goalCap.budget(start) < minutes) {
        goalCap.recordRelaxation("dayCap", minutes, res.event.start);
      }
      goalCap.charge(start, end);
    }
    scheduledTaskIds.add(leaf.id);
    return {
      scheduled: true,
      permanentFailure: false,
      events: [res.event],
      lastEnd: new Date(res.event.end),
    };
  } else if (res.failure) {
    failures.push(res.failure);
    // NO_SLOTS is transient — the outer loop retries after other placements
    // free up room or the horizon expands. Any other failure is permanent.
    if (res.failure.reason !== SchedulingFailureReason.NO_SLOTS) {
      return { scheduled: false, permanentFailure: true, events: [] };
    }
    return { scheduled: false, permanentFailure: false, events: [] };
  }

  return { scheduled: false, permanentFailure: false, events: [] };
}
