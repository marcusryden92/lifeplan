/**
 * Scheduling Models
 *
 * Core interfaces and types for the scheduling system
 */

import {
  SimpleEvent,
  Planner,
  EventTemplate,
  Category,
  CategoryEvent,
  TravelEvent,
  EngineMessage,
} from "@/types/prisma";

import { SchedulingFailureReason } from "../constants";
import { PlaceableSlot } from "./TimeSlot";
import type { TravelShardSpan } from "../utils/timeSlotUtils";
import type { SchedulerRecorder } from "../helpers/Scheduler/SchedulerRecorder";

/**
 * Result of a scheduling operation
 */
export interface SchedulingResult {
  /** Whether scheduling completed successfully */
  success: boolean;
  /** Generated calendar events */
  events: SimpleEvent[];
  /** List of tasks that couldn't be scheduled */
  failures: SchedulingFailure[];
  /** Performance and diagnostic metrics */
  metrics: SchedulingMetrics;
}

/**
 * Full output of the calendar generator orchestrator (CalendarGenerator).
 * Extends the inner scheduling pass result with the materialized category
 * occurrences (with trespass info) the engine writes for each regen.
 */
export interface CalendarGenerationResult extends SchedulingResult {
  /**
   * Materialized weekly category occurrences. Persisted alongside `events` —
   * renderer reads these to draw category wrappers. Empty when no scheduled
   * categories were configured.
   */
  categoryEvents: CategoryEvent[];
  /**
   * Materialized travel events between scheduled items. Persisted alongside
   * `events` — renderer reads these to draw travel blocks. Empty when travel
   * injection is disabled or no cross-location placements exist.
   */
  travelEvents: TravelEvent[];
  /**
   * Per-planner urgency score the engine computed for this regen. Keys are
   * planner ids; covers scheduling candidates plus every top-level
   * uncompleted goal so consumers can rank goals the scheduler skipped
   * (e.g. not-yet-ready ones). Ephemeral — not persisted to the DB.
   */
  plannerScores: Record<string, number>;
  /**
   * Structured, coalesced messages describing scheduling failures and
   * warnings. One row per (type, groupKey) after aggregation — e.g. 400
   * insufficient-travel instances on the same route collapse to a single
   * row with affectedCount and worst-case shortage. Persisted alongside
   * events for cross-session recall; the UI's engine console renders them.
   */
  messages: EngineMessage[];
}

/**
 * Details about a scheduling failure
 */
export interface SchedulingFailure {
  /** ID of the task that failed to schedule */
  taskId: string;
  /** Title of the task for easier debugging */
  taskTitle: string;
  /** Reason for failure */
  reason: SchedulingFailureReason;
  /** Human-readable details */
  details: string;
  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Metrics collected during scheduling
 */
export interface SchedulingMetrics {
  /** Total number of tasks attempted */
  tasksAttempted: number;
  /** Number of tasks successfully scheduled */
  tasksScheduled: number;
  /** Number of tasks that failed */
  tasksFailed: number;
  /** Number of goals processed */
  goalsProcessed: number;
  /** Total iterations used across all scheduling operations */
  totalIterations: number;
  /** Average time to schedule a task (in ms) */
  averageSchedulingTimeMs: number;
  /** Total execution time (in ms) */
  totalExecutionTimeMs: number;
  /** Number of template events generated */
  templateEventsGenerated: number;
  /** Time spent on template expansion (in ms) */
  templateExpansionTimeMs: number;
  /** Number of templates that failed to expand (incomplete data) */
  templatesFailed?: number;
}

/**
 * Context provided to scheduling strategies
 */
export interface SchedulingContext {
  /** Current date/time */
  currentDate: Date;
  /** User ID */
  userId: string;
  /** Week start day (0-6, Sunday-Saturday) */
  weekStartDay: number;
  /** All planner items for dependency lookups */
  allPlanners: Planner[];
  /** Already scheduled events */
  scheduledEvents: SimpleEvent[];
  /** Scheduling metrics (mutable, updated during scheduling) */
  metrics: SchedulingMetrics;
  /** Category constraints for time-based scheduling */
  categories?: Map<string, Category>;
  /** Effective planner -> location map */
  plannerLocationMap?: Map<string, string | null>;
  /** Effective planner -> categoryId map (resolved by walking up parent chain) */
  plannerCategoryMap?: Map<string, string | null>;
  /**
   * Optional per-task recorder for dynamic scheduling traces (mirrors the
   * staticEventTravelPass recorder). When attached, every scheduleTask
   * call appends a record describing the decision branching, actions
   * taken, and resulting slot state. No-op when null/undefined.
   */
  schedulerRecorder?: SchedulerRecorder | null;
  /**
   * Tail-buffer cutoff: dynamic placement is suppressed for slots starting
   * after this date. Set per-iteration by scheduleTasksAndGoals from
   * SCHEDULING_CONFIG.PLACEMENT_BUFFER_DAYS, so the next expansion's
   * static-pass resume has empty room at the seam to re-decide travel
   * placement without colliding with already-placed dynamic events.
   */
  placementCutoffDate?: Date | null;
}

/**
 * A candidate time slot with its score
 */
export interface ScoredSlot {
  /** The time slot */
  slot: {
    start: Date;
    end: Date;
    durationMinutes: number;
  };
  /** The scored PlaceableSlot itself, so consumers avoid a re-find by time */
  source: PlaceableSlot;
  /** Combined score from all strategies */
  score: number;
  /** Individual scores from each strategy for debugging */
  strategyScores: Record<string, number>;
}

/**
 * Travel time entry for location-aware scheduling
 */
export interface TravelTimeEntry {
  fromLocationId: string;
  toLocationId: string;
  rushHourMinutes: number;
  regularMinutes: number;
  nightMinutes: number;
}

/**
 * Context for handling travel leg calculations
 */
export type TravelProcessingAction = {
  prevLocation: string;
  nextLocation: string;
  placeAtSlotStart: boolean;
  travelMinutes: number;
};

/**
 * Granular logging configuration
 */
export interface LoggingConfig {
  /** Log scheduling metrics */
  metrics?: boolean;
  /** Log scheduling failures */
  failures?: boolean;
  /** Log final events array */
  finalEvents?: boolean;
  /** Log travel calculation debug info */
  travelDebug?: boolean;
  /** Log template expansion info */
  templateInfo?: boolean;
  /** Log input planners */
  planners?: boolean;
  /** Log input templates */
  templates?: boolean;
  /** Log location map */
  locations?: boolean;
  /** Log strategy settings */
  strategySettings?: boolean;
  /** Log lean calendar (title, start, end, location) sorted by start */
  leanCalendar?: boolean;
  /**
   * Log a per-slot decision/action trail from staticEventTravelPass plus an
   * end-state snapshot of the timespan after each iteration. Filtered by
   * dateRangeStart / dateRangeEnd. Use this to trace where a faulty travel
   * item came from and what got rearranged or absorbed at each step.
   */
  staticEventTravelPass?: boolean;
  /**
   * Log a per-task decision/action trail from the dynamic scheduling pass
   * (the phase that places task events into slots, including travel
   * absorbing, gap reclaiming, and span removal). Same dateRangeStart /
   * dateRangeEnd filter applies. Use this to trace why a dynamic task
   * absorbed a travel it shouldn't have, or ended up in the wrong slot.
   */
  dynamicScheduling?: boolean;
  /**
   * Optional inclusive lower bound for event-based logs. Items whose start
   * is before this date are excluded. null/undefined means "no lower bound".
   */
  dateRangeStart?: Date | null;
  /**
   * Optional inclusive upper bound for event-based logs. Items whose start
   * is after this date are excluded. null/undefined means "no upper bound".
   */
  dateRangeEnd?: Date | null;
}

/**
 * Location grouping strategy score configuration
 */
export interface LocationGroupingScoresConfig {
  bothMatch?: number;
  oneMatchOneOpen?: number;
  oneMatch?: number;
  bothOpen?: number;
  oneOpenNoMatch?: number;
  neitherMatch?: number;
  noLocation?: number;
}

/**
 * Location grouping strategy penalty configuration
 */
export interface LocationGroupingPenaltiesConfig {
  maxSingleTravelPenalty?: number;
  maxDoubleTravelPenalty?: number;
  singleTravelPenaltyDivisor?: number;
  doubleTravelPenaltyDivisor?: number;
}

/**
 * Configuration for calendar generation
 */
export interface CalendarGenerationConfig {
  /** Maximum number of days to look ahead */
  maxDaysAhead?: number;
  /** Maximum iterations per task */
  maxIterationsPerTask?: number;
  /** Whether to enable detailed logging (master switch) */
  enableLogging?: boolean;
  /** Granular logging options (only used if enableLogging is true) */
  logging?: LoggingConfig;
  /** Buffer time between scheduled items in minutes */
  bufferTimeMinutes?: number;
  /** Strategy weights (for slot scoring, not task ordering) */
  strategyWeights?: {
    earliestSlot?: number;
    locationGrouping?: number;
  };
  /** Location grouping strategy internal scores */
  locationGroupingScores?: LocationGroupingScoresConfig;
  /** Location grouping strategy penalties */
  locationGroupingPenalties?: LocationGroupingPenaltiesConfig;
  /** Travel time matrix for location-aware scheduling */
  travelTimeMatrix?: Map<string, TravelTimeEntry>;
  /** Whether to inject travel events between location changes */
  injectTravelEvents?: boolean;
}

/**
 * Input for calendar generation
 */
export interface CalendarGenerationInput {
  /** User ID */
  userId: string;
  /** Week start day (0-6) */
  weekStartDay: number;
  /** Event templates */
  templates: EventTemplate[];
  /** Planner items (tasks, goals, plans) */
  planners: Planner[];
  /** Previous calendar events to preserve */
  previousCalendar: SimpleEvent[];
  /**
   * Previous engine messages, consulted at emit time to carry forward the
   * user-owned `dismissed` flag. A re-emit of an id whose prior row was
   * dismissed stays dismissed; a fresh id is naturally undismissed.
   */
  previousEngineMessages?: EngineMessage[];
  /** Optional configuration overrides */
  config?: CalendarGenerationConfig;
  /** Categories with time constraints */
  categories?: Category[];
}

export interface StrategyConfig {
  travelTimeMatrix?: Map<string, TravelTimeEntry>;
  strategyWeights?: {
    earliestSlot?: number;
    locationGrouping?: number;
  };
  locationGroupingScores?: LocationGroupingScoresConfig;
  locationGroupingPenalties?: LocationGroupingPenaltiesConfig;
}

export interface FindValidSlotsResult {
  validSlots: PlaceableSlot[];
  fittingSlots: PlaceableSlot[];
  taskLocationId: string | null | undefined;
  constraintForTask: Category | undefined;
}

export interface SlotSelectionResult {
  selectedSlot: PlaceableSlot;
  travelBefore: number;
  travelAfter: number;
  reusableTravelStart: Date | null;
  taskLocationId: string | null | undefined;
  /**
   * The full span of the outbound travel from a prior unit that this
   * placement will absorb (remove and back-extend into). Null when no
   * absorb applies. Carries the travelId so downstream removal is by
   * identity, not by heuristic time search.
   */
  absorbableTravel: TravelShardSpan | null;
  reclaimPrecedingGapTravel: TravelShardSpan | null;
}

export interface ReservationResult {
  taskStartDate: Date;
  taskEndDate: Date;
}

/**
 * Expanded result with diagnostics
 */
export interface DetailedSchedulingResult extends SchedulingResult {
  /** Warnings that don't prevent scheduling but should be noted */
  warnings: string[];
  /** Debug information (only in development) */
  debug?: {
    slotCounts: Record<string, number>;
    strategyDecisions: Array<{
      taskId: string;
      chosenSlot: Date;
      scores: Record<string, number>;
    }>;
  };
}
