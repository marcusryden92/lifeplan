import { Planner, SimpleEvent } from "@/types/prisma";
import { Scheduler } from "../../core/Scheduler";
import { ChunkSizing, SchedulingFailure } from "../../models/SchedulingModels";
import { SchedulingFailureReason } from "../../constants";
import {
  TaskSplittingSettings,
  addIntervalMinutesByDay,
  chunkEventId,
  completedMinutesByDay,
  dayKeyLocal,
  grantChunkMinutes,
  minChunkRequired,
  parseCompletedSegments,
  splitRemainingMinutes,
} from "../../../taskSplitting";
import { GoalCapContext } from "./goalDayCap";

// Placement of one split task: repeatedly runs the 5-phase pipeline with a
// ChunkSizing until the remaining minutes are exhausted or a chunk finds no
// slot. Each chunk rides the pipeline as a synthetic planner clone whose id is
// the chunk event id — plannerIdFromEventId resolves it back to the row, and
// travel/buffer handling applies per chunk like any other dynamic placement.
//
// State is per scheduling run and shared across outer-loop iterations so a
// partially placed task resumes from its remainder after horizon expansion
// instead of starting over.

export interface SplitRelaxation {
  plannerId: string;
  taskTitle: string;
  kind: "maxChunk" | "dayCap";
  chunkMinutes: number;
  chunkStart: string;
}

export interface SplitPlacementState {
  /** plannerId -> minutes placed this run (across outer-loop iterations) */
  placedMinutes: Map<string, number>;
  /** plannerId -> next chunk ordinal (chunk event ids are ordinal-keyed) */
  chunkOrdinals: Map<string, number>;
  /** plannerId -> local dayKey -> minutes consumed (seeded from completed segments) */
  dayMinutes: Map<string, Map<string, number>>;
  /**
   * plannerId -> ms end of the task's last placed chunk / latest segment.
   * Only maintained when the task requests a minimum inter-chunk spacing.
   */
  lastChunkEndMs: Map<string, number>;
  /** Constraint compromises made while placing, surfaced as engine messages */
  relaxations: SplitRelaxation[];
}

export function createSplitPlacementState(): SplitPlacementState {
  return {
    placedMinutes: new Map(),
    chunkOrdinals: new Map(),
    dayMinutes: new Map(),
    lastChunkEndMs: new Map(),
    relaxations: [],
  };
}

export function splitRemainingForRun(
  task: Planner,
  state: SplitPlacementState,
): number {
  return Math.max(
    0,
    splitRemainingMinutes(task) - (state.placedMinutes.get(task.id) ?? 0),
  );
}

export function scheduleSplitTask(args: {
  task: Planner;
  settings: TaskSplittingSettings;
  scheduler: Scheduler;
  state: SplitPlacementState;
  afterTime?: Date;
  /**
   * Final-pass compromise: ignore the per-day cap when the strict attempt
   * finds nothing. Off during normal passes so horizon expansion gets the
   * chance to satisfy the cap before it is violated.
   */
  allowDayCapRelaxation?: boolean;
  /**
   * Present when this leaf sits under a goal with a daily cap. The effective
   * per-day budget is the pointwise min of the task's own budget and the
   * goal's; every placed chunk charges both ledgers.
   */
  goalCap?: GoalCapContext;
}): {
  fullyPlaced: boolean;
  events: SimpleEvent[];
  failure?: SchedulingFailure;
} {
  const { task, settings, scheduler, state, goalCap } = args;
  const context = scheduler.context;

  // Optional minimum break between consecutive chunks of this task. Off by
  // default (chunks sit only the standard placement buffer apart).
  const spacingMs = (settings.minSpacingMinutes ?? 0) * 60 * 1000;

  let dayMap = state.dayMinutes.get(task.id);
  if (!dayMap) {
    dayMap = completedMinutesByDay(task);
    state.dayMinutes.set(task.id, dayMap);
    // Seed the spacing anchor from the latest completed segment so a new chunk
    // keeps its break from work already done, not just from other chunks.
    if (spacingMs > 0) {
      const latestSegmentEndMs = parseCompletedSegments(
        task.completedSegments,
      ).reduce((latest, s) => Math.max(latest, new Date(s.end).getTime()), 0);
      if (latestSegmentEndMs > 0) {
        state.lastChunkEndMs.set(task.id, latestSegmentEndMs);
      }
    }
  }
  const dayMinutes = dayMap;

  const dayBudgetFn =
    settings.maxMinutesPerDay !== null
      ? (slotStart: Date) =>
          Math.max(
            0,
            settings.maxMinutesPerDay! -
              (dayMinutes.get(dayKeyLocal(slotStart)) ?? 0),
          )
      : undefined;

  let remaining = splitRemainingForRun(task, state);
  const events: SimpleEvent[] = [];

  while (remaining > 0) {
    const minReq = minChunkRequired(remaining, settings);
    // The carving rule can itself demand a chunk beyond maxMinutes: a
    // remainder under 2*min cannot be split, so the only valid chunk is the
    // whole remainder. That is rule-forced (not slot-driven), applies even
    // in strict mode, and is surfaced as a maxChunk compromise.
    const ruleForcedWhole = minReq > settings.maxMinutes;

    // A goal budget below the required minimum chunk is rule-forced out of
    // the composition — no day could ever host the chunk under it. The chunk
    // still charges the ledger and is surfaced as an oversizedLeaf compromise.
    const goalBudgetApplies =
      goalCap !== undefined && minReq <= goalCap.capMinutes;
    const budgetFns: Array<(slotStart: Date) => number> = [];
    if (dayBudgetFn) budgetFns.push(dayBudgetFn);
    if (goalCap && goalBudgetApplies) budgetFns.push(goalCap.budget);
    const effectiveBudgetFn =
      budgetFns.length > 0
        ? (slotStart: Date) =>
            budgetFns.reduce(
              (min, fn) => Math.min(min, fn(slotStart)),
              Infinity,
            )
        : undefined;

    const attempts: Array<{ dayCap: boolean }> = [{ dayCap: true }];
    if (args.allowDayCapRelaxation && effectiveBudgetFn) {
      attempts.push({ dayCap: false });
    }

    let placedEvent: SimpleEvent | null = null;
    let placedWithoutDayCap = false;
    let lastFailure: SchedulingFailure | undefined;

    const ordinal = state.chunkOrdinals.get(task.id) ?? 0;
    const chunkTask: Planner = {
      ...task,
      id: chunkEventId(task.id, ordinal),
      duration: minReq,
    };
    // The pipeline resolves location/category by event id — a missing entry
    // would silently default the chunk to "Anywhere"/uncategorized.
    context.plannerLocationMap?.set(
      chunkTask.id,
      context.plannerLocationMap.get(task.id) ?? null,
    );
    context.plannerCategoryMap?.set(
      chunkTask.id,
      context.plannerCategoryMap.get(task.id) ?? task.categoryId ?? null,
    );

    for (const attempt of attempts) {
      const chunkRemaining = remaining;
      const sizing: ChunkSizing = {
        minMinutes: minReq,
        grant: (headroom, dayBudget) =>
          grantChunkMinutes({
            remaining: chunkRemaining,
            headroom,
            settings,
            dayBudget: attempt.dayCap ? dayBudget : undefined,
            maxOverride: ruleForcedWhole ? chunkRemaining : undefined,
          }),
        dayBudget: attempt.dayCap ? effectiveBudgetFn : undefined,
      };

      // When a minimum spacing is requested, hold the next chunk until at least
      // that long after the previous one; otherwise chunks sit only the standard
      // placement buffer apart, like any two dynamic placements.
      const lastEndMs =
        spacingMs > 0 ? state.lastChunkEndMs.get(task.id) : undefined;
      const spacedAfter =
        lastEndMs !== undefined ? new Date(lastEndMs + spacingMs) : undefined;
      const afterTime =
        spacedAfter && (!args.afterTime || spacedAfter > args.afterTime)
          ? spacedAfter
          : args.afterTime;

      const result = scheduler.scheduleTask(chunkTask, afterTime, sizing);
      if (result.success && result.event) {
        placedEvent = result.event;
        placedWithoutDayCap =
          !attempt.dayCap && effectiveBudgetFn !== undefined;
        break;
      }
      lastFailure = result.failure;
    }

    if (!placedEvent) {
      return {
        fullyPlaced: false,
        events,
        failure: {
          taskId: task.id,
          taskTitle: task.title,
          reason: lastFailure?.reason ?? SchedulingFailureReason.NO_SLOTS,
          details: `${remaining} of ${task.duration} minutes could not be placed (min chunk ${minReq} min)`,
          context: {
            remainingMinutes: remaining,
            placedMinutes: state.placedMinutes.get(task.id) ?? 0,
            minChunkMinutes: minReq,
          },
        },
      };
    }

    const start = new Date(placedEvent.start);
    const end = new Date(placedEvent.end);
    const granted = Math.round((end.getTime() - start.getTime()) / 60000);
    if (granted <= 0) break;

    // Budgets are read before charging so a relaxed placement is attributed
    // to the budget it actually exceeded, not to both.
    const ownBudgetShort =
      placedWithoutDayCap &&
      dayBudgetFn !== undefined &&
      dayBudgetFn(start) < granted;
    const goalBudgetShort =
      placedWithoutDayCap && goalBudgetApplies && goalCap.budget(start) < granted;

    events.push(placedEvent);
    remaining -= granted;
    state.placedMinutes.set(
      task.id,
      (state.placedMinutes.get(task.id) ?? 0) + granted,
    );
    state.chunkOrdinals.set(task.id, ordinal + 1);
    if (spacingMs > 0) {
      state.lastChunkEndMs.set(
        task.id,
        Math.max(state.lastChunkEndMs.get(task.id) ?? 0, end.getTime()),
      );
    }
    addIntervalMinutesByDay(dayMinutes, start, end);
    goalCap?.charge(start, end);

    if (ruleForcedWhole && granted > settings.maxMinutes) {
      state.relaxations.push({
        plannerId: task.id,
        taskTitle: task.title,
        kind: "maxChunk",
        chunkMinutes: granted,
        chunkStart: placedEvent.start,
      });
    }
    if (goalCap && !goalBudgetApplies) {
      goalCap.recordRelaxation("oversizedLeaf", granted, placedEvent.start);
    }
    if (placedWithoutDayCap) {
      if (dayBudgetFn !== undefined && (ownBudgetShort || !goalBudgetShort)) {
        state.relaxations.push({
          plannerId: task.id,
          taskTitle: task.title,
          kind: "dayCap",
          chunkMinutes: granted,
          chunkStart: placedEvent.start,
        });
      }
      if (goalBudgetShort) {
        goalCap.recordRelaxation("dayCap", granted, placedEvent.start);
      }
    }
  }

  return { fullyPlaced: true, events };
}
