/**
 * CalendarGenerator
 *
 * Main orchestrator for calendar generation.
 * Delegates to specialized subfunctions for each phase.
 */

import { WeekDayIntegers } from "@/types/calendarTypes";
import { Category } from "@/types/prisma";
import { TimeSlotManager } from "./TimeSlotManager";
import { TravelManager } from "./TravelManager";
import { Scheduler } from "./Scheduler";
import { CompositeStrategy } from "../strategies/SchedulingStrategy";
import {
  CalendarGenerationInput,
  CalendarGenerationResult,
  SchedulingMetrics,
} from "../models/SchedulingModels";
import { SCHEDULING_CONFIG } from "../constants";
import {
  validateInput,
  buildInitialEventArray,
  expandTemplates,
  buildLocationMap,
  buildPlannerCategoryMap,
  prepareSchedulingContext,
  buildSchedulingStrategy,
  prepareCandidates,
  assembleFinalEvents,
  buildLoggingLookups,
  emitDebugLog,
} from "../helpers/CalendarGenerator";
import {
  buildAvailableSlots,
  dropPastAvailableSlots,
  deriveSchedulingHorizon,
} from "../helpers/TimeSlotManager";
import {
  staticEventTravelPass,
  TravelPassRecorder,
} from "../helpers/TravelManager";
import { SchedulerRecorder } from "../helpers/Scheduler/SchedulerRecorder";
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
  private readonly scheduledCategories: Category[];

  // Mutable state
  private metrics: SchedulingMetrics;
  private travelPassRecorder: TravelPassRecorder | null = null;
  private schedulerRecorder: SchedulerRecorder | null = null;

  constructor(
    private readonly weekStartDay: WeekDayIntegers,
    private readonly input: CalendarGenerationInput,
  ) {
    this.currentDate = new Date();
    this.maxDaysAhead =
      input.config?.maxDaysAhead || SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH;
    this.bufferTimeMinutes = input.config?.bufferTimeMinutes ?? 0;
    this.enableLogging = input.config?.enableLogging ?? false;
    // A category enters the scheduler only when it both opts into windows
    // (useTimeWindows) and actually has at least one window. Either condition
    // failing means the category is purely for classification — its location
    // inheritance still applies (via input.categories elsewhere), but its
    // windows / strictness do not constrain scheduling.
    this.scheduledCategories = (input.categories ?? []).filter(
      (c) => c.useTimeWindows && c.timeSlots.length > 0,
    );

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
  generate(): CalendarGenerationResult {
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
        categoryEvents: [],
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
      enableLogging && !!input.config?.logging?.templateInfo,
      this.metrics,
    );

    this.metrics = updatedMetrics;

    // Phase 4: Build location map + effective category map (planner -> categoryId
    // resolved by walking up the parent chain). Both are read-only derivations
    // off the planners + categories and have no dependency on the slot array
    // or the travel pass — they belong here, next to each other, before the
    // slot pipeline kicks in.
    const plannerLocationMap = buildLocationMap(
      input.planners,
      input.templates,
      input.categories || [],
    );
    const plannerCategoryMap = buildPlannerCategoryMap(input.planners);

    // Phase 6a: Build available slots over the full scheduling timeline
    const schedulingStartDate = setTimeOnDate(currentDate, "00:00");
    const builtSlots = buildAvailableSlots({
      startDate: schedulingStartDate,
      existingEvents: filteredEvents,
      templateMasks: perTemplateMasks,
      categories: this.scheduledCategories,
      plannerLocationMap,
      enableLogging,
    });

    // Phase 6b: Place travel slots (separate pass after slot building).
    // Load built slots into the manager's unified storage, then run the pass
    // which mutates the slots array in place via splice. Trespass markers
    // are set directly on CategorySlot fragments and read downstream from
    // the slot array — no side-channel.
    timeSlotManager.slots = [...builtSlots];

    const loggingConfig = input.config?.logging;
    const loggingLookups = buildLoggingLookups(
      this.scheduledCategories,
      filteredEvents,
    );
    const travelPassRecorder = new TravelPassRecorder({
      enabled: enableLogging && !!loggingConfig?.staticEventTravelPass,
      rangeStart: loggingConfig?.dateRangeStart ?? null,
      rangeEnd: loggingConfig?.dateRangeEnd ?? null,
      lookups: loggingLookups,
    });
    this.travelPassRecorder = travelPassRecorder;

    travelPassRecorder.startPass("preliminary");
    staticEventTravelPass(
      !!plannerLocationMap,
      this.scheduledCategories,
      timeSlotManager.slots,
      travelManager,
      travelPassRecorder,
    );

    // Phase 6c: Drop available slots ending before "now" so the scheduler
    // doesn't place tasks in the past.
    timeSlotManager.slots = dropPastAvailableSlots(
      timeSlotManager.slots,
      currentDate,
    );

    // Phase 7: Build the dynamic scheduling recorder. Same filter pattern as
    // travelPassRecorder — off by default, scoped to the configured date
    // range. Each scheduleTask call appends a record.
    const schedulerRecorder = new SchedulerRecorder({
      enabled: enableLogging && !!loggingConfig?.dynamicScheduling,
      rangeStart: loggingConfig?.dateRangeStart ?? null,
      rangeEnd: loggingConfig?.dateRangeEnd ?? null,
      lookups: loggingLookups,
    });
    this.schedulerRecorder = schedulerRecorder;

    // Phase 8: Prepare scheduling context
    const context = prepareSchedulingContext(
      input.userId,
      currentDate,
      weekStartDay,
      input.planners,
      filteredEvents,
      this.metrics,
      this.scheduledCategories,
      plannerLocationMap,
      plannerCategoryMap,
      schedulerRecorder,
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
      input.planners,
      candidates,
      memoizedEventIds,
      perTemplateMasks,
      plannerLocationMap,
      this.scheduledCategories,
      travelPassRecorder,
    );

    // Phase 11: Assemble final events.
    const schedulingEndDate = deriveSchedulingHorizon(
      timeSlotManager.slots,
      schedulingStartDate,
    );
    const { events: allEvents, categoryEvents } = assembleFinalEvents(
      input.userId,
      travelManager,
      context,
      this.scheduledCategories,
      schedulingStartDate,
      schedulingEndDate,
      plannerLocationMap,
      timeSlotManager.slots,
      input.config?.logging,
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

    if (enableLogging) {
      emitDebugLog(input, travelManager, {
        allEvents,
        recurringTemplateEvents,
        perTemplateMasks,
        largestTemplateGap,
        plannerLocationMap,
        strategy,
        schedulingResult,
        metrics: this.metrics,
        travelPassRecorder: this.travelPassRecorder,
        schedulerRecorder: this.schedulerRecorder,
      });
    }

    return {
      success: schedulingResult.failures.length === 0,
      events: allEvents,
      categoryEvents,
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
