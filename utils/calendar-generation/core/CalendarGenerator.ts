/**
 * CalendarGenerator
 *
 * Main orchestrator for calendar generation.
 * Coordinates TimeSlotManager, TemplateExpander, and Scheduler.
 */

import { Planner, SimpleEvent, EventTemplate } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { TimeSlotManager } from "./TimeSlotManager";
import { TemplateExpander, PerTemplateMask } from "./TemplateExpander";
import { Scheduler } from "./Scheduler";
import { UrgencyStrategy } from "../strategies/UrgencyStrategy";
import { EarliestSlotStrategy } from "../strategies/EarliestSlotStrategy";
import { CompositeStrategy, SchedulingStrategy } from "../strategies/SchedulingStrategy";
import { LocationGroupingStrategy } from "../strategies/LocationGroupingStrategy";
import {
  CalendarGenerationInput,
  SchedulingResult,
  SchedulingContext,
  SchedulingMetrics,
  SchedulingFailure,
} from "../models/SchedulingModels";
import {
  SCHEDULING_CONFIG,
  STRATEGY_WEIGHTS,
  SchedulingFailureReason,
} from "../constants";
import { dateTimeService } from "../utils/dateTimeService";
import { CalendarValidator } from "../utils/validationUtils";
import { getSortedTreeBottomLayer } from "../../goalPageHandlers";
import { taskIsCompleted } from "../../taskHelpers";
import { v4 as uuidv4 } from "uuid";

export class CalendarGenerator {
  private slotManager: TimeSlotManager;
  private templateExpander: TemplateExpander;
  private metrics: SchedulingMetrics;

  constructor(private weekStartDay: WeekDayIntegers) {
    this.slotManager = new TimeSlotManager(weekStartDay);
    this.templateExpander = new TemplateExpander(weekStartDay);
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Check if a specific logging flag is enabled
   */
  private shouldLog(
    input: CalendarGenerationInput,
    flag: "metrics" | "failures" | "finalEvents" | "travelDebug" | "templateInfo" | "planners" | "templates" | "locations" | "strategySettings"
  ): boolean {
    const config = input.config;
    if (!config?.enableLogging || !config?.logging) return false;
    return !!config.logging[flag];
  }

  /**
   * Generate calendar from input
   */
  generate(input: CalendarGenerationInput): SchedulingResult {
    const startTime = performance.now();
    this.metrics = this.createEmptyMetrics();

    // Create slot manager with buffer time and travel time matrix from config
    const bufferTimeMinutes = input.config?.bufferTimeMinutes ?? 0;
    this.slotManager = new TimeSlotManager(
      this.weekStartDay,
      new Date(),
      bufferTimeMinutes,
      input.config?.travelTimeMatrix
    );

    // Validate input
    const validation = CalendarValidator.validateGenerationInput({
      userId: input.userId,
      weekStartDay: input.weekStartDay,
      templates: input.templates,
      planners: input.planners,
      previousCalendar: input.previousCalendar,
    });

    if (!validation.isValid) {
      console.error("Validation errors:", validation.errors);
      return {
        success: false,
        events: [],
        failures: validation.errors.map((error) => ({
          taskId: "validation",
          taskTitle: "Validation Error",
          reason: SchedulingFailureReason.INVALID_TASK,
          details: `${error.field}: ${error.message}`,
          context: { value: error.value },
        })),
        metrics: this.metrics,
      };
    }

    if (validation.warnings.length > 0 && input.config?.enableLogging) {
      console.warn("Validation warnings:", validation.warnings);
    }

    const currentDate = new Date();
    const maxDaysAhead =
      input.config?.maxDaysAhead || SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH;

    let eventArray: SimpleEvent[] = [];

    // Step 1: memoized events
    // Filter out template and travel events - templates are regenerated, travel is recalculated
    const memoizedEventIds = new Set<string>();
    if (input.previousCalendar.length > 0) {
      const pastEvents = input.previousCalendar.filter(
        (e) =>
          currentDate > new Date(e.end) &&
          e.extendedProps?.itemType !== "template" &&
          e.extendedProps?.itemType !== "travel"
      );
      pastEvents.forEach((e) => memoizedEventIds.add(e.id));
      eventArray.push(...pastEvents);
    }

    // Step 2: plan items
    eventArray = this.addPlanItems(
      input.userId,
      input.planners,
      eventArray,
      memoizedEventIds
    );

    // Step 3: completed items
    eventArray = this.addCompletedItems(
      input.userId,
      input.planners,
      eventArray,
      memoizedEventIds
    );

    // Step 4: Expand recurring template definitions
    const templateStart = performance.now();
    const weekStart = dateTimeService.getWeekFirstDate(
      currentDate,
      input.weekStartDay as WeekDayIntegers
    );
    const searchEndDate = dateTimeService.shiftDays(weekStart, maxDaysAhead);

    const recurringTemplateEvents = this.templateExpander.expandTemplates(
      input.userId,
      input.templates,
      weekStart,
      searchEndDate
    );

    // Remove any old template events and add recurring definitions
    eventArray = eventArray.filter(
      (e) => e.extendedProps?.itemType !== "template"
    );
    eventArray.push(...recurringTemplateEvents);

    // Build per-template masks and initial simple mask events (first week)
    const perTemplateMasks = this.templateExpander.getPerTemplateMasks(
      input.templates
    );
    const simpleTemplateEvents =
      this.templateExpander.generateSimpleEventsFromPerTemplateMasks(
        input.userId,
        perTemplateMasks,
        weekStart,
        maxDaysAhead
      );

    const templateEnd = performance.now();
    this.metrics.templateExpansionTimeMs = templateEnd - templateStart;
    this.metrics.templateEventsGenerated = recurringTemplateEvents.length;

    // Step 5: Build planner location map for location-aware slot building
    // Includes both planners and templates (since template events use template.id)
    const plannerLocationMap = new Map<string, string | null>();
    for (const planner of input.planners) {
      plannerLocationMap.set(planner.id, planner.locationId ?? null);
    }
    // Also add templates to the location map
    for (const template of input.templates) {
      plannerLocationMap.set(template.id, template.locationId ?? null);
    }

    // Step 6: Build slots with location awareness
    this.slotManager.clear();
    this.slotManager.buildDailySlots(
      currentDate,
      maxDaysAhead,
      eventArray,
      simpleTemplateEvents,
      plannerLocationMap
    );

    // Largest gap
    const largestTemplateGap = this.templateExpander.calculateLargestGap(
      input.templates
    );

    // Step 7: scheduling context
    const context: SchedulingContext = {
      currentDate,
      userId: input.userId,
      weekStartDay: input.weekStartDay as WeekDayIntegers,
      allPlanners: input.planners,
      scheduledEvents: [...eventArray],
      templateEvents: simpleTemplateEvents,
      availableMinutesPerWeek:
        this.slotManager.getWeekAvailableMinutes(weekStart),
      metrics: this.metrics,
    };

    // Step 8: strategy
    const strategies: Array<{ strategy: SchedulingStrategy; weight: number }> = [
      {
        strategy: new UrgencyStrategy(),
        weight:
          input.config?.strategyWeights?.urgency ||
          STRATEGY_WEIGHTS.URGENCY_WEIGHT,
      },
      { strategy: new EarliestSlotStrategy(), weight: 0.5 },
    ];

    // Add location grouping strategy if travel time matrix is provided
    if (input.config?.travelTimeMatrix && input.config.travelTimeMatrix.size > 0) {
      strategies.push({
        strategy: new LocationGroupingStrategy(input.config.travelTimeMatrix),
        weight:
          input.config?.strategyWeights?.locationGrouping ||
          STRATEGY_WEIGHTS.LOCATION_GROUPING_WEIGHT,
      });
    }

    const strategy = new CompositeStrategy(strategies);

    // Step 9: schedule
    const scheduler = new Scheduler(this.slotManager, strategy, context);
    const schedulingResult = this.scheduleTasksAndGoals(
      input.userId,
      input.planners,
      memoizedEventIds,
      largestTemplateGap,
      scheduler,
      perTemplateMasks,
      input.templates,
      context
    );

    // Step 10: Generate travel events from stored travel slots
    // Travel slots are created during scheduling and stored in occupiedSlots.
    // This approach ensures travel is correctly placed at the end of free slots
    // and shifts forward as tasks fill in.

    const scheduledNonTemplateEvents = context.scheduledEvents.filter(
      (e) => e.extendedProps?.itemType !== "template"
    );

    // Get travel events from stored travel slots
    const travelEvents = this.slotManager.generateTravelEvents(input.userId);

    // Debug: Log travel events
    if (this.shouldLog(input, "travelDebug")) {
      console.log("[Travel Debug] Generated travel events from slots:");
      console.log(`  travelEvents count: ${travelEvents.length}`);
      for (const e of travelEvents) {
        const props = e.extendedProps as Record<string, unknown>;
        console.log(`  - Travel: ${e.start} to ${e.end}`);
        console.log(`    from: ${props?.fromLocationId} to: ${props?.toLocationId}`);
      }
    }

    // Final event list includes:
    // 1. Scheduled non-template events (tasks, plans, completed items)
    // 2. Recurring template events (with rrule) for FullCalendar UI
    // 3. Travel events generated from timeline
    // NOTE: We DON'T include simpleTemplateEvents in final output - they're only for slot/travel calculation
    const templateEventsForUI = context.scheduledEvents.filter(
      (e) => e.extendedProps?.itemType === "template"
    );
    const allEvents = [...scheduledNonTemplateEvents, ...templateEventsForUI, ...travelEvents];

    const endTime = performance.now();
    this.metrics.totalExecutionTimeMs = endTime - startTime;

    // Granular logging based on config flags
    if (this.shouldLog(input, "planners")) {
      console.log("=== INPUT PLANNERS ===");
      console.log(JSON.stringify(input.planners, null, 2));
      console.log("=== END INPUT PLANNERS ===");
    }

    if (this.shouldLog(input, "templates")) {
      console.log("=== INPUT TEMPLATES ===");
      console.log(JSON.stringify(input.templates, null, 2));
      console.log("=== END INPUT TEMPLATES ===");
    }

    if (this.shouldLog(input, "locations")) {
      console.log("=== LOCATION MAP ===");
      const locationObj: Record<string, string | null> = {};
      plannerLocationMap.forEach((loc, id) => {
        locationObj[id] = loc;
      });
      console.log(JSON.stringify(locationObj, null, 2));
      console.log("=== END LOCATION MAP ===");
    }

    if (this.shouldLog(input, "strategySettings")) {
      console.log("=== STRATEGY SETTINGS ===");
      console.log(JSON.stringify({
        strategies: strategies.map(s => ({ name: s.strategy.name, weight: s.weight })),
        bufferTimeMinutes: input.config?.bufferTimeMinutes,
        maxDaysAhead: input.config?.maxDaysAhead,
        travelTimeMatrixSize: input.config?.travelTimeMatrix?.size ?? 0,
      }, null, 2));
      console.log("=== END STRATEGY SETTINGS ===");
    }

    if (this.shouldLog(input, "metrics")) {
      console.log("=== SCHEDULING METRICS ===");
      console.log(JSON.stringify(this.metrics, null, 2));
      console.log("=== END SCHEDULING METRICS ===");
    }

    if (this.shouldLog(input, "failures") && schedulingResult.failures.length > 0) {
      console.log("=== SCHEDULING FAILURES ===");
      console.log(JSON.stringify(schedulingResult.failures, null, 2));
      console.log("=== END SCHEDULING FAILURES ===");
    }

    if (this.shouldLog(input, "templateInfo")) {
      console.log("=== TEMPLATE INFO ===");
      console.log(JSON.stringify({
        templatesCount: input.templates.length,
        recurringEventsGenerated: recurringTemplateEvents.length,
        simpleTemplateEventsCount: simpleTemplateEvents.length,
        largestTemplateGap,
      }, null, 2));
      console.log("=== END TEMPLATE INFO ===");
    }

    if (this.shouldLog(input, "finalEvents")) {
      console.log("=== FINAL CALENDAR EVENTS ===");
      console.log(JSON.stringify(allEvents, null, 2));
      console.log("=== END FINAL EVENTS ===");
    }

    return {
      success: schedulingResult.failures.length === 0,
      events: allEvents,
      failures: schedulingResult.failures,
      metrics: this.metrics,
    };
  }

  /**
   * Schedule tasks and goals using the scheduler
   * Returns newly scheduled events (not including templates or memoized events)
   */
  private scheduleTasksAndGoals(
    userId: string,
    allPlanners: Planner[],
    memoizedEventIds: Set<string>,
    largestTemplateGap: number,
    scheduler: Scheduler,
    perTemplateMasks: PerTemplateMask[],
    templates: EventTemplate[],
    context: SchedulingContext
  ): {
    success: boolean;
    newEvents: SimpleEvent[];
    failures: SchedulingFailure[];
  } {
    const events: SimpleEvent[] = [];
    const failures: SchedulingFailure[] = [];

    // Track tasks that have been scheduled during this run to prevent duplicates
    const scheduledTaskIds = new Set<string>();

    // Get initial candidates (top-level goals + tasks)
    let candidates: Planner[] = allPlanners.filter(
      (item) =>
        ((item.itemType === "goal" && !item.parentId && item.isReady) ||
          item.itemType === "task") &&
        !memoizedEventIds.has(item.id)
    );

    // Sort by priority
    candidates = this.sortByPriority(allPlanners, candidates);

    // Week-by-week orchestration
    let weekStart = dateTimeService.getWeekFirstDate(
      context.currentDate,
      this.weekStartDay
    );
    let weeksSearched = 0;

    while (
      candidates.length > 0 &&
      weeksSearched < SCHEDULING_CONFIG.MAX_WEEKS_TO_SEARCH
    ) {
      // Try scheduling each candidate (iterate backwards to remove safely)
      for (let i = candidates.length - 1; i >= 0; i--) {
        const item = candidates[i];

        if (item.itemType === "task") {
          // Skip if already scheduled
          if (scheduledTaskIds.has(item.id)) {
            candidates.splice(i, 1);
            continue;
          }

          // Size check
          if (largestTemplateGap && item.duration > largestTemplateGap) {
            failures.push({
              taskId: item.id,
              taskTitle: item.title,
              reason: SchedulingFailureReason.TOO_LARGE,
              details: `Task duration (${item.duration} min) exceeds largest template gap (${largestTemplateGap} min)`,
            });
            this.metrics.tasksFailed++;
            candidates.splice(i, 1);
            continue;
          }

          const result = scheduler.scheduleTask(item);
          if (result.success && result.event) {
            events.push(result.event);
            scheduledTaskIds.add(item.id);
            candidates.splice(i, 1);
          } else if (result.failure) {
            // If no slots, we'll expand next week; otherwise, mark failure
            if (result.failure.reason !== SchedulingFailureReason.NO_SLOTS) {
              failures.push(result.failure);
              candidates.splice(i, 1);
            }
          }
        } else if (item.itemType === "goal") {
          this.metrics.goalsProcessed++;

          // Attempt to schedule tasks in the goal sequentially; if any task hits NO_SLOTS, stop and retry next week
          // Filter out already-scheduled tasks, completed tasks, and memoized (overdue) tasks
          const goalTasks = getSortedTreeBottomLayer(
            allPlanners,
            item.id
          ).filter((t) => !taskIsCompleted(t) && !scheduledTaskIds.has(t.id) && !memoizedEventIds.has(t.id));

          let goalFailedDueToNoSlots = false;
          // Track afterTime to ensure tasks within a goal are scheduled sequentially
          let goalAfterTime: Date | undefined = undefined;

          for (const task of goalTasks) {
            if (largestTemplateGap && task.duration > largestTemplateGap) {
              failures.push({
                taskId: task.id,
                taskTitle: task.title,
                reason: SchedulingFailureReason.TOO_LARGE,
                details: `Task duration (${task.duration} min) exceeds largest template gap (${largestTemplateGap} min)`,
              });
              this.metrics.tasksFailed++;
              continue;
            }

            // Pass afterTime to ensure this task is scheduled after the previous one
            const res = scheduler.scheduleTask(task, goalAfterTime);
            if (res.success && res.event) {
              events.push(res.event);
              scheduledTaskIds.add(task.id);
              // Next task in goal must come after this one
              goalAfterTime = new Date(res.event.end);
            } else if (res.failure) {
              if (res.failure.reason === SchedulingFailureReason.NO_SLOTS) {
                goalFailedDueToNoSlots = true;
                break;
              } else {
                failures.push(res.failure);
              }
            }
          }

          if (!goalFailedDueToNoSlots) {
            // Goal scheduled (all tasks that could be scheduled were scheduled)
            candidates.splice(i, 1);
          }
        }
      }

      // If still candidates left, expand next week and build slots
      if (candidates.length > 0) {
        weeksSearched += 1;
        weekStart = dateTimeService.shiftDays(weekStart, 7);

        // Build slots for the new week using events already in context (plans, templates)
        const weekStartDate = dateTimeService.startOfDay(weekStart);
        const weekEndDate = dateTimeService.endOfDay(
          dateTimeService.shiftDays(weekStart, 6)
        );

        const weekEvents = context.scheduledEvents.filter((e) => {
          const s = new Date(e.start);
          return s >= weekStartDate && s <= weekEndDate;
        });
        const weekTemplateEvents = context.templateEvents.filter((e) => {
          const s = new Date(e.start);
          return s >= weekStartDate && s <= weekEndDate;
        });

        this.slotManager.buildDailySlots(
          weekStart,
          7,
          weekEvents,
          weekTemplateEvents
        );
        context.availableMinutesPerWeek =
          this.slotManager.getWeekAvailableMinutes(weekStart);
      }
    }

    // Update metrics from scheduler
    const schedulerMetrics = scheduler.getMetrics();
    this.metrics.tasksAttempted = schedulerMetrics.tasksAttempted;
    this.metrics.tasksScheduled = schedulerMetrics.tasksScheduled;
    this.metrics.tasksFailed = schedulerMetrics.tasksFailed;
    this.metrics.totalIterations = schedulerMetrics.totalIterations;
    this.metrics.averageSchedulingTimeMs =
      schedulerMetrics.averageSchedulingTimeMs;

    return {
      success: failures.length === 0 && candidates.length === 0,
      newEvents: events,
      failures,
    };
  }

  /**
   * Schedule all tasks in a goal (respecting dependency order)
   */
  private scheduleGoal(
    allPlanners: Planner[],
    rootGoal: Planner,
    largestTemplateGap: number,
    scheduler: Scheduler
  ): SchedulingResult {
    const events: SimpleEvent[] = [];
    const failures = [];

    // Get all tasks in the goal tree (bottom layer)
    const goalTasks = getSortedTreeBottomLayer(allPlanners, rootGoal.id);
    const filteredTasks = goalTasks.filter((task) => !taskIsCompleted(task));

    let afterTime: Date | undefined = undefined;

    for (const task of filteredTasks) {
      // Check size
      if (largestTemplateGap && task.duration > largestTemplateGap) {
        failures.push({
          taskId: task.id,
          taskTitle: task.title,
          reason: SchedulingFailureReason.TOO_LARGE,
          details: `Task duration (${task.duration} min) exceeds largest template gap (${largestTemplateGap} min)`,
        });
        this.metrics.tasksFailed++;
        continue;
      }

      const result = scheduler.scheduleTask(task, afterTime);

      if (result.success && result.event) {
        events.push(result.event);
        // Next task in goal should come after this one
        afterTime = new Date(result.event.end);
      } else if (result.failure) {
        failures.push(result.failure);
      }
    }

    return {
      success: failures.length === 0,
      events,
      failures,
      metrics: this.metrics,
    };
  }

  /**
   * Add plan items (fixed time appointments)
   */
  private addPlanItems(
    userId: string,
    planners: Planner[],
    eventArray: SimpleEvent[],
    memoizedEventIds: Set<string>
  ): SimpleEvent[] {
    const planItems = planners.filter(
      (task) => task.itemType === "plan" && !memoizedEventIds.has(task.id)
    );

    for (const plan of planItems) {
      if (plan.starts && plan.duration) {
        const end = new Date(
          new Date(plan.starts).getTime() + plan.duration * 60000
        );

        const now = new Date();

        eventArray.push({
          userId,
          title: plan.title,
          id: plan.id,
          start: plan.starts,
          end: end.toISOString(),
          extendedProps: {
            id: uuidv4(),
            eventId: plan.id,
            itemType: "plan",
            parentId: null,
            completedEndTime: null,
            completedStartTime: null,
          },
          backgroundColor: "black",
          borderColor: "black",
          duration: null,
          rrule: null,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
      }
    }

    return eventArray;
  }

  /**
   * Add completed items to calendar
   */
  private addCompletedItems(
    userId: string,
    planners: Planner[],
    eventArray: SimpleEvent[],
    memoizedEventIds: Set<string>
  ): SimpleEvent[] {
    const completedItems = planners.filter(
      (task) => taskIsCompleted(task) && !memoizedEventIds.has(task.id)
    );

    for (const item of completedItems) {
      if (item.completedStartTime && item.completedEndTime) {
        const now = new Date();

        eventArray.push({
          userId,
          title: item.title,
          id: item.id,
          start: item.completedStartTime,
          end: item.completedEndTime,
          backgroundColor: item.color as string,
          borderColor: "",
          duration: null,
          rrule: null,
          extendedProps: {
            id: uuidv4(),
            eventId: item.id,
            itemType: item.itemType,
            completedStartTime: item.completedStartTime,
            completedEndTime: item.completedEndTime,
            parentId: item.parentId ?? null,
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
      }
    }

    return eventArray;
  }

  /**
   * Sort planners by priority (preserving original logic)
   */
  private sortByPriority(
    allPlanners: Planner[],
    goalsAndTasks: Planner[]
  ): Planner[] {
    const now = new Date();

    // Calculate total time estimates
    const totalPlannerTime = allPlanners.reduce(
      (acc, p) => acc + p.duration,
      0
    );

    const totalEstimatedTime = totalPlannerTime; // Simplified

    // Calculate urgency scores
    const withUrgency = goalsAndTasks.map((item) => ({
      ...item,
      urgencyScore: UrgencyStrategy.calculateTaskUrgency(item, {
        currentDate: now,
        totalEstimatedTime,
      }),
    }));

    // Sort by urgency score (highest first)
    return withUrgency.sort((a, b) => b.urgencyScore - a.urgencyScore);
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
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): SchedulingMetrics {
    return { ...this.metrics };
  }

}
