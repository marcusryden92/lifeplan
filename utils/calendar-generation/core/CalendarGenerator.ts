/**
 * CalendarGenerator
 *
 * Main orchestrator for calendar generation.
 * Delegates to specialized subfunctions for each phase.
 */

import { SimpleEvent } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { TimeSlotManager } from "./TimeSlotManager";
import { Scheduler } from "./Scheduler";
import {
  CalendarGenerationInput,
  SchedulingResult,
  SchedulingMetrics,
  SchedulingFailure,
} from "../models/SchedulingModels";
import { SCHEDULING_CONFIG } from "../constants";
import { logCalendarDebugInfo } from "../utils/loggingUtils";
import { TaskSchedulingOrchestrator } from "../helpers/scheduling/TaskSchedulingOrchestrator";
import { buildPlannerCategoryMap } from "./CalendarGenerator/slot-building/buildPlannerCategoryMap";

// Import subfunctions
import { validateInput } from "./CalendarGenerator/initialization/validateInput";
import { buildInitialEventArray } from "./CalendarGenerator/initialization/buildInitialEventArray";
import { expandTemplates } from "./CalendarGenerator/template-processing/expandTemplates";
import { buildLocationMap } from "./CalendarGenerator/slot-building/buildLocationMap";
import { buildCategoryConstraints } from "./CalendarGenerator/slot-building/buildCategoryConstraints";
import { buildInitialSlots } from "./CalendarGenerator/slot-building/buildInitialSlots";
import { prepareSchedulingContext } from "./CalendarGenerator/scheduling/prepareSchedulingContext";
import { buildSchedulingStrategy } from "./CalendarGenerator/scheduling/buildSchedulingStrategy";
import { prepareCandidates } from "./CalendarGenerator/scheduling/prepareCandidates";
import { assembleFinalEvents } from "./CalendarGenerator/finalization/assembleFinalEvents";

export class CalendarGenerator {
  private slotManager: TimeSlotManager;
  private metrics: SchedulingMetrics;

  constructor(private weekStartDay: WeekDayIntegers) {
    this.slotManager = new TimeSlotManager(weekStartDay);
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Generate calendar from input
   */
  generate(input: CalendarGenerationInput): SchedulingResult {
    const startTime = performance.now();
    this.metrics = this.createEmptyMetrics();
    const currentDate = new Date();
    const maxDaysAhead =
      input.config?.maxDaysAhead || SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH;
    const bufferTimeMinutes = input.config?.bufferTimeMinutes ?? 0;
    const enableLogging = input.config?.enableLogging ?? false;

    // Initialize slot manager
    this.slotManager = new TimeSlotManager(
      this.weekStartDay,
      currentDate,
      bufferTimeMinutes,
      input.config?.travelTimeMatrix
    );

    // Phase 1: Validation
    const validation = validateInput(input);
    if (!validation.isValid) {
      return {
        success: false,
        events: [],
        failures: validation.failures,
        metrics: this.metrics,
      };
    }

    // Phase 2: Build initial event array (memoized, plans, completed)
    const { eventArray, memoizedEventIds } = buildInitialEventArray(
      input.userId,
      input.planners,
      input.previousCalendar,
      currentDate
    );

    // Phase 3: Expand templates
    const {
      recurringTemplateEvents,
      perTemplateMasks,
      largestTemplateGap,
      updatedMetrics,
    } = expandTemplates(
      input.userId,
      input.templates,
      this.weekStartDay,
      currentDate,
      maxDaysAhead,
      enableLogging,
      this.metrics
    );
    this.metrics = updatedMetrics;

    // Remove old template events and add new ones
    const filteredEvents = eventArray.filter(
      (e: SimpleEvent) => e.extendedProps?.itemType !== "template"
    );
    filteredEvents.push(...recurringTemplateEvents);

    // Phase 4: Build location map
    const plannerLocationMap = buildLocationMap(
      input.planners,
      input.templates,
      input.categories || []
    );

    // Phase 5: Build category constraints and periods
    const {
      categoryConstraintMap,
      categoryPeriods,
    } = buildCategoryConstraints(
      input.categories,
      currentDate,
      this.weekStartDay,
      maxDaysAhead
    );

    // Phase 6: Build initial slots (includes category boundary splits + travel carving)
    buildInitialSlots(
      this.slotManager,
      currentDate,
      2,
      input.planners,
      filteredEvents,
      perTemplateMasks,
      plannerLocationMap,
      categoryPeriods,
      enableLogging
    );

    // Phase 7: Build effective category map (resolves inheritance from parent chain)
    const plannerCategoryMap = buildPlannerCategoryMap(input.planners);

    // Phase 8: Prepare scheduling context
    const context = prepareSchedulingContext(
      input.userId,
      currentDate,
      this.weekStartDay,
      input.planners,
      filteredEvents,
      this.slotManager,
      this.metrics,
      categoryConstraintMap,
      plannerLocationMap,
      plannerCategoryMap,
    );

    // Phase 9: Build scheduling strategy
    const strategy = buildSchedulingStrategy({
      travelTimeMatrix: input.config?.travelTimeMatrix,
      strategyWeights: input.config?.strategyWeights,
      locationGroupingScores: input.config?.locationGroupingScores,
      locationGroupingPenalties: input.config?.locationGroupingPenalties,
    });

    // Phase 10: Prepare candidates
    const candidates = prepareCandidates(
      input.planners,
      memoizedEventIds,
      currentDate,
      plannerCategoryMap
    );

    // Phase 11: Schedule tasks and goals
    const scheduler = new Scheduler(this.slotManager, strategy, context);
    const orchestrator = new TaskSchedulingOrchestrator(
      this.slotManager,
      scheduler,
      this.weekStartDay
    );
    const schedulingResult: {
      success: boolean;
      newEvents: SimpleEvent[];
      failures: SchedulingFailure[];
    } = orchestrator.scheduleTasksAndGoals(
      input.planners,
      candidates,
      memoizedEventIds,
      largestTemplateGap,
      perTemplateMasks,
      context,
      plannerLocationMap
    );

    // Phase 12: Assemble final events
    const allEvents = assembleFinalEvents(
      input.userId,
      this.slotManager,
      context,
      categoryPeriods,
      plannerLocationMap
    );

    // Update metrics
    const endTime = performance.now();
    this.metrics.totalExecutionTimeMs = endTime - startTime;

    // Update metrics from scheduler
    const schedulerMetrics = scheduler.getMetrics();
    this.metrics.tasksAttempted = schedulerMetrics.tasksAttempted;
    this.metrics.tasksScheduled = schedulerMetrics.tasksScheduled;
    this.metrics.tasksFailed = schedulerMetrics.tasksFailed;
    this.metrics.totalIterations = schedulerMetrics.totalIterations;
    this.metrics.averageSchedulingTimeMs =
      schedulerMetrics.averageSchedulingTimeMs;

    // Debug logging
    if (enableLogging) {
      const travelEvents = this.slotManager.generateTravelEvents(input.userId);
      logCalendarDebugInfo(input, {
        allEvents,
        travelEvents,
        recurringTemplateEvents,
        perTemplateMasks,
        largestTemplateGap,
        plannerLocationMap,
        strategies: [{ strategy, weight: 1.0 }],
        schedulingResult,
        metrics: this.metrics,
      });
    }

    return {
      success: schedulingResult.failures.length === 0,
      events: allEvents,
      failures: [...schedulingResult.failures],
      metrics: this.metrics,
    };
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): SchedulingMetrics {
    return {
      tasksAttempted: 0,
      tasksScheduled: 0,
      tasksFailed: 0,
      goalsProcessed: 0,
      totalIterations: 0,
      averageSchedulingTimeMs: 0,
      totalExecutionTimeMs: 0,
      templateEventsGenerated: 0,
      templateExpansionTimeMs: 0,
      templatesFailed: 0,
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): SchedulingMetrics {
    return { ...this.metrics };
  }
}
