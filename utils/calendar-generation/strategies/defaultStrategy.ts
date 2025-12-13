/**
 * Default Strategy Configuration
 *
 * Contains all default weights and scoring parameters for scheduling strategies.
 * This serves as the fallback when users haven't configured their own preferences.
 *
 * In the future, users will be able to override these values through their
 * scheduling settings (stored in UserSchedulingPreferences).
 */

/**
 * Strategy weights - how much each strategy contributes to final slot score
 */
export const DEFAULT_STRATEGY_WEIGHTS = {
  /** Weight for urgency-based scheduling (deadline proximity) */
  urgency: 1.0,
  /** Weight for earliest-slot preference */
  earliestSlot: 0.5,
  /** Weight for location-based grouping - high enough to prioritize same-location continuity */
  locationGrouping: 0.6,
} as const;

/**
 * Location grouping strategy internal scoring configuration
 * Controls how slots are scored based on location sandwich patterns
 *
 * IMPORTANT: The score differential between oneMatch (0.85) and neitherMatch (0.4)
 * is intentionally large (0.45) so that same-location continuity is prioritized.
 * With location grouping weight of 0.2, this gives a ~0.09 boost to the final score,
 * which is enough to overcome minor urgency/earliestSlot differences.
 */
export const DEFAULT_LOCATION_GROUPING_SCORES = {
  /** Score when both adjacent events match task location (perfect sandwich) */
  bothMatch: 0.95,
  /** Score when one end matches, other end is open (start/end of day) */
  oneMatchOneOpen: 0.85,
  /** Score when one end matches, other doesn't - CRUCIAL for location continuity */
  oneMatch: 0.85,
  /** Score when both ends are open (empty day) */
  bothOpen: 0.7,
  /** Score when one end is open, other doesn't match */
  oneOpenNoMatch: 0.45,
  /** Score when neither end matches */
  neitherMatch: 0.4,
  /** Score returned when slot doesn't have room for task + travel */
  insufficientRoom: 0.1,
  /** Score returned for tasks without a location (neutral) */
  noLocation: 0.5,
} as const;

/**
 * Location grouping travel penalty configuration
 */
export const DEFAULT_LOCATION_GROUPING_PENALTIES = {
  /** Max penalty for single-direction travel */
  maxSingleTravelPenalty: 0.02,
  /** Max penalty for double-direction travel */
  maxDoubleTravelPenalty: 0.03,
  /** Divisor for single travel penalty calculation (travel minutes / this = penalty) */
  singleTravelPenaltyDivisor: 600,
  /** Divisor for double travel penalty calculation */
  doubleTravelPenaltyDivisor: 400,
} as const;

/**
 * Urgency strategy internal scoring configuration
 */
export const DEFAULT_URGENCY_SCORES = {
  /** Weight given to urgency score vs time preference (urgency portion) */
  urgencyScoreWeight: 0.7,
  /** Weight given to urgency score vs time preference (time preference portion) */
  timePreferenceWeight: 0.3,
  /** Max days to consider for tasks without deadlines */
  noDeadlineMaxDays: 90,
  /** Decay factor for no-deadline scoring over max days */
  noDeadlineDecayFactor: 0.7,
  /** Threshold ratio below which tasks are considered urgent */
  urgentRatioThreshold: 0.3,
  /** Minimum time preference score */
  minTimePreference: 0.3,
} as const;

/**
 * Combined default strategy configuration
 * Use this when you need all strategy settings in one object
 */
export const DEFAULT_STRATEGY_CONFIG = {
  weights: DEFAULT_STRATEGY_WEIGHTS,
  locationGrouping: {
    scores: DEFAULT_LOCATION_GROUPING_SCORES,
    penalties: DEFAULT_LOCATION_GROUPING_PENALTIES,
  },
  urgency: DEFAULT_URGENCY_SCORES,
} as const;

/**
 * Type definitions for strategy configuration (readonly, from defaults)
 */
export type StrategyWeightsReadonly = typeof DEFAULT_STRATEGY_WEIGHTS;
export type LocationGroupingScoresReadonly = typeof DEFAULT_LOCATION_GROUPING_SCORES;
export type LocationGroupingPenaltiesReadonly = typeof DEFAULT_LOCATION_GROUPING_PENALTIES;
export type UrgencyScoresReadonly = typeof DEFAULT_URGENCY_SCORES;
export type StrategyConfigReadonly = typeof DEFAULT_STRATEGY_CONFIG;

/**
 * Mutable type definitions for strategy configuration
 * These can be used when users override default values
 */
export type StrategyWeights = {
  urgency: number;
  earliestSlot: number;
  locationGrouping: number;
};

export type LocationGroupingScores = {
  bothMatch: number;
  oneMatchOneOpen: number;
  oneMatch: number;
  bothOpen: number;
  oneOpenNoMatch: number;
  neitherMatch: number;
  insufficientRoom: number;
  noLocation: number;
};

export type LocationGroupingPenalties = {
  maxSingleTravelPenalty: number;
  maxDoubleTravelPenalty: number;
  singleTravelPenaltyDivisor: number;
  doubleTravelPenaltyDivisor: number;
};

export type UrgencyScores = {
  urgencyScoreWeight: number;
  timePreferenceWeight: number;
  noDeadlineMaxDays: number;
  noDeadlineDecayFactor: number;
  urgentRatioThreshold: number;
  minTimePreference: number;
};

export type StrategyConfig = {
  weights: StrategyWeights;
  locationGrouping: {
    scores: LocationGroupingScores;
    penalties: LocationGroupingPenalties;
  };
  urgency: UrgencyScores;
};
