/**
 * CalendarGenerator
 *
 * Main orchestrator for calendar generation.
 * Coordinates TimeSlotManager, TemplateExpander, and Scheduler.
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { TimeSlotManager } from "./TimeSlotManager";
import { TemplateExpander } from "./TemplateExpander";
import { Scheduler } from "./Scheduler";
import { UrgencyStrategy } from "../strategies/UrgencyStrategy";
import { EarliestSlotStrategy } from "../strategies/EarliestSlotStrategy";
import { CompositeStrategy } from "../strategies/SchedulingStrategy";
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
   * Generate calendar from input
   */
  generate(input: CalendarGenerationInput): SchedulingResult {
    const startTime = performance.now();

    // Reset metrics for this run
    this.metrics = this.createEmptyMetrics();

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

    // Initialize event array
    let eventArray: SimpleEvent[] = [];

    // Step 1: Add memoized events (events from previous calendar that are still valid)
    const memoizedEventIds = new Set<string>();

    if (input.previousCalendar.length > 0) {
      // Preserve only events that have ENDED (not just started)
      // This allows ongoing events to be rescheduled if needed
      // Template events will be regenerated fresh each time
      const pastEvents = input.previousCalendar.filter(
        (e) =>
          currentDate > new Date(e.end) &&
          e.extendedProps?.itemType !== "template"
      );
      pastEvents.forEach((e) => memoizedEventIds.add(e.id));
      eventArray.push(...pastEvents);
    }

    // Step 2: Add plan items (fixed time items)
    eventArray = this.addPlanItems(
      input.userId,
      input.planners,
      eventArray,
      memoizedEventIds
    );

    // Step 3: Add completed items
    eventArray = this.addCompletedItems(
      input.userId,
      input.planners,
      eventArray,
      memoizedEventIds
    );

    // Step 4: Expand templates
    const templateStart = performance.now();

    // Calculate week start and search end date
    const weekStart = dateTimeService.getWeekFirstDate(
      currentDate,
      input.weekStartDay as WeekDayIntegers
    );
    const searchEndDate = dateTimeService.shiftDays(weekStart, maxDaysAhead);

    // Always regenerate templates to ensure they're up-to-date
    // Start from week beginning (Monday) not current day
    const recurringTemplateEvents = this.templateExpander.expandTemplates(
      input.userId,
      input.templates,
      weekStart, // Start from Monday of current week
      searchEndDate
    );

    // Remove any old template events and add fresh ones
    eventArray = eventArray.filter(
      (e) => e.extendedProps?.itemType !== "template"
    );
    eventArray.push(...recurringTemplateEvents);

    this.metrics.templateEventsGenerated = recurringTemplateEvents.length;

    // Generate simple template events for slot calculation
    const simpleTemplateEvents =
      this.templateExpander.generateSimpleTemplateEvents(
        input.userId,
        input.templates,
        weekStart
      );

    const templateEnd = performance.now();
    this.metrics.templateExpansionTimeMs = templateEnd - templateStart;

    // Step 5: Build time slots
    this.slotManager.clear();
    this.slotManager.buildDailySlots(
      currentDate,
      maxDaysAhead,
      eventArray,
      simpleTemplateEvents
    );

    // Calculate largest template gap
    const largestTemplateGap = this.templateExpander.calculateLargestGap(
      input.templates
    );

    // Step 6: Prepare scheduling context
    // Note: Pass a copy of eventArray to prevent mutation of our source array
    const context: SchedulingContext = {
      currentDate,
      userId: input.userId,
      weekStartDay: input.weekStartDay as WeekDayIntegers,
      allPlanners: input.planners,
      scheduledEvents: [...eventArray], // Create a copy to avoid mutation
      templateEvents: simpleTemplateEvents,
      availableMinutesPerWeek:
        this.slotManager.getWeekAvailableMinutes(weekStart),
      metrics: this.metrics,
    };

    // Step 7: Create scheduling strategy
    const strategy = new CompositeStrategy([
      {
        strategy: new UrgencyStrategy(),
        weight:
          input.config?.strategyWeights?.urgency ||
          STRATEGY_WEIGHTS.URGENCY_WEIGHT,
      },
      {
        strategy: new EarliestSlotStrategy(),
        weight: 0.5, // Fallback weight
      },
    ]);

    // Step 8: Schedule tasks and goals
    const scheduler = new Scheduler(this.slotManager, strategy, context);
    const schedulingResult = this.scheduleTasksAndGoals(
      input.userId,
      input.planners,
      memoizedEventIds,
      largestTemplateGap,
      scheduler
    );

    // Combine all events: base events + newly scheduled tasks/goals
    // context.scheduledEvents now contains all events including newly scheduled ones
    const allEvents = context.scheduledEvents;

    const endTime = performance.now();
    this.metrics.totalExecutionTimeMs = endTime - startTime;

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
    planners: Planner[],
    memoizedEventIds: Set<string>,
    largestTemplateGap: number,
    scheduler: Scheduler
  ): {
    success: boolean;
    newEvents: SimpleEvent[];
    failures: SchedulingFailure[];
  } {
    const events: SimpleEvent[] = [];
    const failures = [];

    // Get all top-level goals and tasks
    const goalsAndTasks: Planner[] = planners.filter(
      (item) =>
        ((item.itemType === "goal" && !item.parentId && item.isReady) ||
          item.itemType === "task") &&
        !memoizedEventIds.has(item.id)
    );

    // Sort by priority (using the original priority logic)
    const sortedItems = this.sortByPriority(planners, goalsAndTasks);

    // Schedule each item
    for (const item of sortedItems) {
      if (item.itemType === "task") {
        // Check if task fits in template
        if (largestTemplateGap && item.duration > largestTemplateGap) {
          failures.push({
            taskId: item.id,
            taskTitle: item.title,
            reason: SchedulingFailureReason.TOO_LARGE,
            details: `Task duration (${item.duration} min) exceeds largest template gap (${largestTemplateGap} min)`,
          });
          this.metrics.tasksFailed++;
          continue;
        }

        const result = scheduler.scheduleTask(item);
        if (result.success && result.event) {
          events.push(result.event);
        } else if (result.failure) {
          failures.push(result.failure);
        }
      } else if (item.itemType === "goal") {
        this.metrics.goalsProcessed++;
        const goalResult = this.scheduleGoal(
          planners,
          item,
          largestTemplateGap,
          scheduler
        );
        events.push(...goalResult.events);
        failures.push(...goalResult.failures);
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

    // Return only the newly scheduled events (not the full context)
    return {
      success: failures.length === 0,
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
