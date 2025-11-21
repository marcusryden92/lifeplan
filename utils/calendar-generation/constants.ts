/**
 * Calendar Generation Constants
 *
 * Centralized constants for calendar generation algorithms.
 * Extracting these makes the code more maintainable and easier to tune.
 */

/**
 * Weekday definitions
 */
export const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
} as const;

export const WEEKDAY_NAMES: readonly string[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * Time-based constants
 */
export const TIME_CONSTANTS = {
  /** Milliseconds in one second */
  MS_PER_SECOND: 1000,
  /** Milliseconds in one minute */
  MS_PER_MINUTE: 60 * 1000,
  /** Milliseconds in one hour */
  MS_PER_HOUR: 60 * 60 * 1000,
  /** Milliseconds in one day */
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  /** Milliseconds in one week */
  MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
  /** Minutes in one hour */
  MINUTES_PER_HOUR: 60,
  /** Minutes in one day */
  MINUTES_PER_DAY: 24 * 60,
  /** Minutes in one week */
  MINUTES_PER_WEEK: 7 * 24 * 60,
  /** Seconds in one minute */
  SECONDS_PER_MINUTE: 60,
} as const;

/**
 * Scheduling algorithm configuration
 */
export const SCHEDULING_CONFIG = {
  /** Maximum number of iterations to prevent infinite loops */
  MAX_ITERATIONS: 10000,
  /** Maximum number of days to search ahead for available slots */
  MAX_DAYS_TO_SEARCH: 90,
  /** Maximum number of weeks to search ahead */
  MAX_WEEKS_TO_SEARCH: 12,
  /** Minimum slot size in minutes to consider */
  MIN_SLOT_SIZE: 5,
  /** Buffer time between events in minutes */
  BUFFER_TIME_MINUTES: 0,
} as const;

/**
 * Urgency calculation configuration
 * Used in priority-based scheduling
 */
export const URGENCY_CONFIG = {
  /** Controls how steeply urgency increases as deadline approaches (higher = steeper) */
  CURVE_STEEPNESS: 4,
  /** The point (0-1) at which urgency starts mattering significantly (0.7 = 70% of time remaining) */
  CRITICAL_THRESHOLD: 0.7,
  /** Minimum urgency multiplier for tasks without deadlines */
  MIN_URGENCY_MULTIPLIER: 0.3,
  /** Maximum urgency multiplier (applied at deadline) */
  MAX_URGENCY_MULTIPLIER: 1.0,
  /** Urgency score range scaling factor */
  URGENCY_SCALE_MIN: 0.3,
  /** Urgency score range scaling factor */
  URGENCY_SCALE_MAX: 1.0,
} as const;

/**
 * Strategy weights for multi-strategy scheduling
 */
export const STRATEGY_WEIGHTS = {
  /** Weight for urgency-based scheduling */
  URGENCY_WEIGHT: 1.0,
  /** Weight for dependency-aware scheduling */
  DEPENDENCY_WEIGHT: 0.8,
  /** Weight for energy/time-of-day optimization */
  ENERGY_WEIGHT: 0.5,
} as const;

/**
 * Scheduling failure reasons
 */
export enum SchedulingFailureReason {
  /** Task duration exceeds the largest available template gap */
  TOO_LARGE = "TOO_LARGE",
  /** No available time slots found within search window */
  NO_SLOTS = "NO_SLOTS",
  /** Algorithm exceeded maximum iteration count */
  ITERATION_LIMIT = "ITERATION_LIMIT",
  /** Task dependencies prevent scheduling at this time */
  DEPENDENCY_CONFLICT = "DEPENDENCY_CONFLICT",
  /** Invalid task data (missing duration, etc.) */
  INVALID_TASK = "INVALID_TASK",
  /** Template generation failed */
  TEMPLATE_ERROR = "TEMPLATE_ERROR",
}

/**
 * Event type identifiers
 */
export enum EventType {
  TASK = "task",
  GOAL = "goal",
  PLAN = "plan",
  TEMPLATE = "template",
}

/**
 * Default colors for calendar events
 */
export const DEFAULT_COLORS = {
  TASK: "#3b82f6",
  GOAL: "#8b5cf6",
  PLAN: "#000000",
  TEMPLATE: "#6b7280",
  COMPLETED: "#0ebf7e",
  ERROR: "#ef4444",
} as const;
