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
import { buildAvailableSlots } from "../helpers/TimeSlotManager";
import { preliminaryTravelPass } from "../helpers/TravelManager";
import { CategoryBoundaryTrespass } from "../helpers/TravelManager/categoryBoundaryTrespass";
import { setTimeOnDate } from "@/utils/calendarUtils";

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

    // Phase 5: Build category constraints
    const { categoryConstraintMap, categoryConstraintsList } =
      buildCategoryConstraints(input.categories);

    // Phase 6a: Build available slots over the full scheduling timeline
    const schedulingStartDate = setTimeOnDate(currentDate, "00:00");
    const builtSlots = buildAvailableSlots({
      planners: input.planners,
      startDate: schedulingStartDate,
      existingEvents: filteredEvents,
      templateMasks: perTemplateMasks,
      categoryConstraints: categoryConstraintsList,
      plannerLocationMap,
      enableLogging,
    });

    // Phase 6b: Place travel slots (separate pass after slot building)
    const categoryBoundaryTrespasses: CategoryBoundaryTrespass[] = [];
    const slotsWithTravel = preliminaryTravelPass(
      !!plannerLocationMap,
      categoryConstraintsList,
      timeSlotManager.occupiedSlots,
      travelManager,
      this.bufferTimeMinutes,
      builtSlots,
      categoryBoundaryTrespasses,
    );

    // Phase 6c: Drop slots ending before "now" so the scheduler doesn't place
    // tasks in the past. Travel events placed into those past slots remain in
    // occupiedSlots — only the empty-space markers are pruned here.
    const nowMs = currentDate.getTime();
    timeSlotManager.availableSlots = slotsWithTravel.filter(
      (s) => s.end.getTime() > nowMs,
    );

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

    // Phase 9: Prepare candidates (filter root goals, tasks and sort by priority)
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
      categoryConstraintsList,
    );

    // Phase 11: Assemble final events
    const schedulingEndDate =
      builtSlots.length > 0
        ? new Date(Math.max(...builtSlots.map((s) => s.end.getTime())))
        : schedulingStartDate;
    const allEvents = assembleFinalEvents(
      input.userId,
      travelManager,
      context,
      categoryConstraintsList,
      schedulingStartDate,
      schedulingEndDate,
      plannerLocationMap,
      categoryBoundaryTrespasses,
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
