/**
 * Scheduling Models
 *
 * Core interfaces and types for the scheduling system
 */

import { SimpleEvent, Planner, EventTemplate } from "@/types/prisma";
import { SchedulingFailureReason } from "../constants";

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
  /** Template events for the period */
  templateEvents: SimpleEvent[];
  /** Total available time per week (minutes) */
  availableMinutesPerWeek: number;
  /** Scheduling metrics (mutable, updated during scheduling) */
  metrics: SchedulingMetrics;
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
  /** Combined score from all strategies */
  score: number;
  /** Individual scores from each strategy for debugging */
  strategyScores: Record<string, number>;
}

/**
 * Configuration for calendar generation
 */
export interface CalendarGenerationConfig {
  /** Maximum number of days to look ahead */
  maxDaysAhead?: number;
  /** Maximum iterations per task */
  maxIterationsPerTask?: number;
  /** Whether to enable detailed logging */
  enableLogging?: boolean;
  /** Buffer time between scheduled items in minutes */
  bufferTimeMinutes?: number;
  /** Strategy weights */
  strategyWeights?: {
    urgency?: number;
    dependency?: number;
    energy?: number;
  };
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
  /** Optional configuration overrides */
  config?: CalendarGenerationConfig;
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
