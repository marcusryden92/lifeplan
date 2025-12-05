/**
 * Calendar Generation - Public API
 *
 * Main exports for the calendar generation system
 */

// Main generation function (backward compatible)
export { generateCalendar } from "./calendarGeneration";

// Core classes (for advanced usage)
export { CalendarGenerator } from "./core/CalendarGenerator";
export { TimeSlotManager } from "./core/TimeSlotManager";
export { TemplateExpander } from "./core/TemplateExpander";
export { Scheduler } from "./core/Scheduler";

// Strategies
export { UrgencyStrategy } from "./strategies/UrgencyStrategy";
export { EarliestSlotStrategy } from "./strategies/EarliestSlotStrategy";
export { CompositeStrategy } from "./strategies/SchedulingStrategy";
export type { SchedulingStrategy } from "./strategies/SchedulingStrategy";

// Models and types
export type {
  SchedulingResult,
  SchedulingFailure,
  SchedulingMetrics,
  SchedulingContext,
  ScoredSlot,
  CalendarGenerationConfig,
  CalendarGenerationInput,
  DetailedSchedulingResult,
} from "./models/SchedulingModels";
export type { TimeSlot, TimeSlotBlock } from "./models/TimeSlot";
export { TimeSlotUtils } from "./models/TimeSlot";

// Utilities
export { dateTimeService, DateTimeService } from "./utils/dateTimeService";
export { CalendarValidator } from "./utils/validationUtils";
export type {
  ValidationResult,
  ValidationError,
} from "./utils/validationUtils";
export * from "./utils/intervalUtils";

// Constants
export * from "./constants";
