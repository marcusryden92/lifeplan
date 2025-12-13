/**
 * CalendarGenerator
 *
 * Main orchestrator for calendar generation.
 * Coordinates TimeSlotManager, TemplateExpander, and Scheduler.
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { TimeSlotManager } from "./TimeSlotManager";
import { TemplateExpander, PerTemplateMask } from "./TemplateExpander";
import { Scheduler } from "./Scheduler";
import { UrgencyStrategy } from "../strategies/UrgencyStrategy";
import { EarliestSlotStrategy } from "../strategies/EarliestSlotStrategy";
import {
  CompositeStrategy,
  SchedulingStrategy,
} from "../strategies/SchedulingStrategy";
import { LocationGroupingStrategy } from "../strategies/LocationGroupingStrategy";
import {
  CalendarGenerationInput,
  SchedulingResult,
  SchedulingContext,
  SchedulingMetrics,
  SchedulingFailure,
} from "../models/SchedulingModels";
import { SCHEDULING_CONFIG, SchedulingFailureReason } from "../constants";
import { DEFAULT_STRATEGY_WEIGHTS } from "../strategies/defaultStrategy";
import { dateTimeService } from "../utils/dateTimeService";
import { CalendarValidator } from "../utils/validationUtils";
import { logCalendarDebugInfo } from "../utils/loggingUtils";
import {
  detectTrespassingEvents,
  IntervalWithId,
} from "../utils/intervalUtils";
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

    // Build per-template masks (used directly for slot building - no SimpleEvent generation needed)
    const perTemplateMasks = this.templateExpander.getPerTemplateMasks(
      input.templates
    );

    const templateEnd = performance.now();
    this.metrics.templateExpansionTimeMs = templateEnd - templateStart;
    this.metrics.templateEventsGenerated = recurringTemplateEvents.length;

    // Step 5: Build location map for location-aware slot building
    // Includes both planners AND templates (both can have locations)
    const plannerLocationMap = new Map<string, string | null>();
    for (const planner of input.planners) {
      plannerLocationMap.set(planner.id, planner.locationId ?? null);
    }
    // Add template locations to the map
    for (const template of input.templates) {
      plannerLocationMap.set(template.id, template.locationId ?? null);
    }

    // Step 6: Build slots with location awareness (initial 2-week window)
    // Template masks are used directly - no SimpleEvent objects created
    const initialWeeks = 2;
    this.slotManager.clear();
    this.slotManager.buildDailySlots(
      currentDate,
      initialWeeks * 7,
      eventArray,
      perTemplateMasks,
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
      availableMinutesPerWeek:
        this.slotManager.getWeekAvailableMinutes(weekStart),
      metrics: this.metrics,
    };

    // Step 8: strategy
    const strategies: Array<{ strategy: SchedulingStrategy; weight: number }> =
      [
        {
          strategy: new UrgencyStrategy(input.config?.urgencyScores),
          weight:
            input.config?.strategyWeights?.urgency ??
            DEFAULT_STRATEGY_WEIGHTS.urgency,
        },
        {
          strategy: new EarliestSlotStrategy(),
          weight:
            input.config?.strategyWeights?.earliestSlot ??
            DEFAULT_STRATEGY_WEIGHTS.earliestSlot,
        },
      ];

    // Add location grouping strategy if travel time matrix is provided
    if (
      input.config?.travelTimeMatrix &&
      input.config.travelTimeMatrix.size > 0
    ) {
      strategies.push({
        strategy: new LocationGroupingStrategy(
          input.config.travelTimeMatrix,
          input.config?.locationGroupingScores,
          input.config?.locationGroupingPenalties
        ),
        weight:
          input.config?.strategyWeights?.locationGrouping ??
          DEFAULT_STRATEGY_WEIGHTS.locationGrouping,
      });
    }

    const strategy = new CompositeStrategy(strategies);

    // Step 9: schedule
    const scheduler = new Scheduler(this.slotManager, strategy, context);
    const schedulingResult = this.scheduleTasksAndGoals(
      input.planners,
      memoizedEventIds,
      largestTemplateGap,
      scheduler,
      perTemplateMasks,
      context,
      plannerLocationMap
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

    // Final event list includes:
    // 1. Scheduled non-template events (tasks, plans, completed items)
    // 2. Recurring template events (with rrule) for FullCalendar UI
    // 3. Travel events generated from timeline
    // NOTE: Template masks are used directly for slot calculation - no SimpleEvent objects needed
    const templateEventsForUI = context.scheduledEvents.filter(
      (e) => e.extendedProps?.itemType === "template"
    );
    const allEvents = [
      ...scheduledNonTemplateEvents,
      ...templateEventsForUI,
      ...travelEvents,
    ];

    // Detect trespassing events (overlapping events with different locations)
    // and mark them with red border indicators
    this.markTrespassingEvents(allEvents, plannerLocationMap);

    const endTime = performance.now();
    this.metrics.totalExecutionTimeMs = endTime - startTime;

    // Handle all debug logging
    logCalendarDebugInfo(input, {
      allEvents,
      travelEvents,
      recurringTemplateEvents,
      perTemplateMasks,
      largestTemplateGap,
      plannerLocationMap,
      strategies,
      schedulingResult,
      metrics: this.metrics,
    });

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
    allPlanners: Planner[],
    memoizedEventIds: Set<string>,
    largestTemplateGap: number,
    scheduler: Scheduler,
    perTemplateMasks: PerTemplateMask[],
    context: SchedulingContext,
    plannerLocationMap: Map<string, string | null>
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
          ).filter(
            (t) =>
              !taskIsCompleted(t) &&
              !scheduledTaskIds.has(t.id) &&
              !memoizedEventIds.has(t.id)
          );

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

        // Pass masks directly - no SimpleEvent generation needed
        this.slotManager.buildDailySlots(
          weekStart,
          7,
          weekEvents,
          perTemplateMasks,
          plannerLocationMap
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
   * Mark events that are trespassing (overlapping with different locations)
   * Modifies events in place to add trespassingTop/trespassingBottom to extendedProps
   */
  private markTrespassingEvents(
    events: SimpleEvent[],
    plannerLocationMap: Map<string, string | null>
  ): void {
    // Convert events to intervals with IDs and locations
    const intervals: IntervalWithId[] = events
      .filter((e) => e.extendedProps?.itemType !== "travel") // Skip travel events
      .map((e) => {
        // Get location from plannerLocationMap using the event's linked planner ID
        const plannerId = (e.extendedProps as { eventId?: string })?.eventId || e.id;
        const locationId = plannerLocationMap.get(plannerId) ?? null;

        return {
          start: new Date(e.start),
          end: new Date(e.end),
          locationId,
          eventId: e.id,
        };
      });

    // Detect trespassing
    const trespassingMap = detectTrespassingEvents(intervals);

    // Mark events with trespassing info
    for (const event of events) {
      const info = trespassingMap.get(event.id);
      if (info && event.extendedProps) {
        // Add trespassing indicators as display-only props (not in Prisma schema)
        // Similar to how travel events add extra props
        (event.extendedProps as Record<string, unknown>).trespassingStart =
          info.trespassingStart;
        (event.extendedProps as Record<string, unknown>).trespassingEnd =
          info.trespassingEnd;
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): SchedulingMetrics {
    return { ...this.metrics };
  }
}
