/**
 * CalendarGenerator
 *
 * Main orchestrator for calendar generation.
 * Delegates to specialized subfunctions for each phase.
 */

import { WeekDayIntegers } from "@/types/calendarTypes";
import { TimeSlotManager } from "./TimeSlotManager";
import { TravelManager } from "./TravelManager";
import { Scheduler } from "./Scheduler";
import { CompositeStrategy } from "../strategies/SchedulingStrategy";
import {
  CalendarGenerationInput,
  SchedulingResult,
  SchedulingMetrics,
} from "../models/SchedulingModels";
import { SCHEDULING_CONFIG } from "../constants";
import { logCalendarDebugInfo } from "../utils/loggingUtils";
import {
  validateInput,
  buildInitialEventArray,
  expandTemplates,
  buildLocationMap,
  buildCategoryConstraints,
  buildPlannerCategoryMap,
  prepareSchedulingContext,
  buildSchedulingStrategy,
  prepareCandidates,
  assembleFinalEvents,
} from "../helpers/CalendarGenerator";
import { buildAvailableSlots } from "../helpers/TimeSlotManager/buildAvailableSlots";
import { carveTravelFromChain } from "../helpers/TravelManager/carveTravelFromChain";

export class CalendarGenerator {
  // Class instances
  private readonly timeSlotManager: TimeSlotManager;
  private readonly travelManager: TravelManager;
  private readonly strategy: CompositeStrategy;

  // Config derived from input
  private readonly currentDate: Date;
  private readonly maxDaysAhead: number;
  private readonly bufferTimeMinutes: number;
  private readonly enableLogging: boolean;

  // Mutable state
  private metrics: SchedulingMetrics;

  constructor(
    private readonly weekStartDay: WeekDayIntegers,
    private readonly input: CalendarGenerationInput,
  ) {
    this.currentDate = new Date();
    this.maxDaysAhead =
      input.config?.maxDaysAhead || SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH;
    this.bufferTimeMinutes = input.config?.bufferTimeMinutes ?? 0;
    this.enableLogging = input.config?.enableLogging ?? false;

    this.timeSlotManager = new TimeSlotManager(
      this.currentDate,
      this.bufferTimeMinutes,
    );
    this.travelManager = new TravelManager(
      this.timeSlotManager,
      this.bufferTimeMinutes,
      input.config?.travelTimeMatrix,
    );
    this.strategy = buildSchedulingStrategy({
      travelTimeMatrix: input.config?.travelTimeMatrix,
      strategyWeights: input.config?.strategyWeights,
      locationGroupingScores: input.config?.locationGroupingScores,
      locationGroupingPenalties: input.config?.locationGroupingPenalties,
    });

    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Generate calendar from input
   */
  generate(): SchedulingResult {
    const startTime = performance.now();
    const {
      input,
      timeSlotManager,
      travelManager,
      strategy,
      currentDate,
      weekStartDay,
      maxDaysAhead,
      enableLogging,
    } = this;

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
      currentDate,
    );

    // Phase 3: Expand templates
    const {
      filteredEvents,
      recurringTemplateEvents,
      perTemplateMasks,
      largestTemplateGap,
      updatedMetrics,
    } = expandTemplates(
      input.userId,
      eventArray,
      input.templates,
      weekStartDay,
      currentDate,
      maxDaysAhead,
      enableLogging,
      this.metrics,
    );
    this.metrics = updatedMetrics;

    // Phase 4: Build location map
    const plannerLocationMap = buildLocationMap(
      input.planners,
      input.templates,
      input.categories || [],
    );

    // Phase 5: Build category constraints and periods
    const { categoryConstraintMap, categoryPeriods } = buildCategoryConstraints(
      input.categories,
      currentDate,
      weekStartDay,
      maxDaysAhead,
    );

    // Phase 6a: Build available slots over the full scheduling timeline
    const builtSlots = buildAvailableSlots(
      input.planners,
      currentDate,
      filteredEvents,
      perTemplateMasks,
      categoryPeriods,
      plannerLocationMap,
      enableLogging,
    );
    timeSlotManager.availableSlots.push(...builtSlots);

    // Phase 6b: Carve travel slots (separate pass after slot building)
    if (plannerLocationMap) {
      const carved = carveTravelFromChain(
        categoryPeriods,
        timeSlotManager.occupiedSlots,
        travelManager,
        this.bufferTimeMinutes,
        timeSlotManager.availableSlots,
      );
      timeSlotManager.availableSlots = carved;
    }

    // Phase 7: Build effective category map (resolves inheritance from parent chain)
    const plannerCategoryMap = buildPlannerCategoryMap(input.planners);

    // Phase 8: Prepare scheduling context
    const context = prepareSchedulingContext(
      input.userId,
      currentDate,
      weekStartDay,
      input.planners,
      filteredEvents,
      timeSlotManager,
      this.metrics,
      categoryConstraintMap,
      plannerLocationMap,
      plannerCategoryMap,
    );

    // Phase 9: Prepare candidates
    const candidates = prepareCandidates(
      input.planners,
      memoizedEventIds,
      currentDate,
      plannerCategoryMap,
    );

    // Phase 10: Schedule tasks and goals
    const scheduler = new Scheduler(
      timeSlotManager,
      travelManager,
      strategy,
      context,
    );
    const schedulingResult = scheduler.scheduleTasksAndGoals(
      weekStartDay,
      input.planners,
      candidates,
      memoizedEventIds,
      largestTemplateGap,
      perTemplateMasks,
      plannerLocationMap,
      categoryPeriods,
    );

    // Phase 11: Assemble final events
    const allEvents = assembleFinalEvents(
      input.userId,
      travelManager,
      context,
      categoryPeriods,
      plannerLocationMap,
    );

    // Update metrics
    const endTime = performance.now();
    this.metrics.totalExecutionTimeMs = endTime - startTime;
    const schedulerMetrics = scheduler.getMetrics();
    this.metrics.tasksAttempted = schedulerMetrics.tasksAttempted;
    this.metrics.tasksScheduled = schedulerMetrics.tasksScheduled;
    this.metrics.tasksFailed = schedulerMetrics.tasksFailed;
    this.metrics.totalIterations = schedulerMetrics.totalIterations;
    this.metrics.averageSchedulingTimeMs =
      schedulerMetrics.averageSchedulingTimeMs;

    // Debug logging
    if (enableLogging) {
      const travelEvents = travelManager.generateTravelEvents(input.userId);
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

  getMetrics(): SchedulingMetrics {
    return { ...this.metrics };
  }
}
