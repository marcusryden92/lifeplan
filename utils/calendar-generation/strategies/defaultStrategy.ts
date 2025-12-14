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
 * Note: Task ordering by urgency/deadline is handled separately by sortPlannersByPriority
 * These weights only affect slot scoring (e.g., location grouping)
 */
export const DEFAULT_STRATEGY_WEIGHTS = {
  /** Weight for location-based grouping */
  locationGrouping: 0.2,
} as const;

/**
 * Location grouping strategy internal scoring configuration
 * Controls how slots are scored based on location sandwich patterns
 */
export const DEFAULT_LOCATION_GROUPING_SCORES = {
  /** Score when both adjacent events match task location (perfect sandwich) */
  bothMatch: 0.95,
  /** Score when one end matches, other end is open (start/end of day) */
  oneMatchOneOpen: 0.8,
  /** Score when one end matches, other doesn't */
  oneMatch: 0.5,
  /** Score when both ends are open (empty day) */
  bothOpen: 0.7,
  /** Score when one end is open, other doesn't match */
  oneOpenNoMatch: 0.45,
  /** Score when neither end matches */
  neitherMatch: 0.4,
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
 * Combined default strategy configuration
 * Use this when you need all strategy settings in one object
 */
export const DEFAULT_STRATEGY_CONFIG = {
  weights: DEFAULT_STRATEGY_WEIGHTS,
  locationGrouping: {
    scores: DEFAULT_LOCATION_GROUPING_SCORES,
    penalties: DEFAULT_LOCATION_GROUPING_PENALTIES,
  },
} as const;

/**
 * Type definitions for strategy configuration (readonly, from defaults)
 */
export type StrategyWeightsReadonly = typeof DEFAULT_STRATEGY_WEIGHTS;
export type LocationGroupingScoresReadonly = typeof DEFAULT_LOCATION_GROUPING_SCORES;
export type LocationGroupingPenaltiesReadonly = typeof DEFAULT_LOCATION_GROUPING_PENALTIES;
export type StrategyConfigReadonly = typeof DEFAULT_STRATEGY_CONFIG;

/**
 * Mutable type definitions for strategy configuration
 * These can be used when users override default values
 */
export type StrategyWeights = {
  locationGrouping: number;
};

export type LocationGroupingScores = {
  bothMatch: number;
  oneMatchOneOpen: number;
  oneMatch: number;
  bothOpen: number;
  oneOpenNoMatch: number;
  neitherMatch: number;
  noLocation: number;
};

export type LocationGroupingPenalties = {
  maxSingleTravelPenalty: number;
  maxDoubleTravelPenalty: number;
  singleTravelPenaltyDivisor: number;
  doubleTravelPenaltyDivisor: number;
};

export type StrategyConfig = {
  weights: StrategyWeights;
  locationGrouping: {
    scores: LocationGroupingScores;
    penalties: LocationGroupingPenalties;
  };
};
