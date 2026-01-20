/**
 * CalendarGenerator
 *
 * Main orchestrator for calendar generation.
 * Coordinates TimeSlotManager, TemplateExpander, and Scheduler.
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { RuntimeEventExtendedProps } from "@/types/ui";
import { WeekDayIntegers } from "@/types/calendarTypes";
import { TimeSlotManager } from "./TimeSlotManager";
import { TemplateExpander, PerTemplateMask } from "./TemplateExpander";
import { Scheduler } from "./Scheduler";
import {
  CompositeStrategy,
  SchedulingStrategy,
} from "../strategies/SchedulingStrategy";
import { LocationGroupingStrategy } from "../strategies/LocationGroupingStrategy";
import { EarliestSlotStrategy } from "../strategies/EarliestSlotStrategy";
import { calculateTaskUrgency } from "../calendar-logic-helpers/sortPlannersByPriority";
import {
  CalendarGenerationInput,
  SchedulingResult,
  SchedulingContext,
  SchedulingMetrics,
  SchedulingFailure,
  CategoryConstraint,
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
import {
  buildCategoryConstraintMap,
  generateCategorySlotPeriods,
} from "../utils/categoryConstraintUtils";

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

    // Debug: Check what templates are blocking the schedule
    console.log("Templates expanded:", recurringTemplateEvents.length);
    if (recurringTemplateEvents.length > 0) {
      const workHourTemplates = recurringTemplateEvents.filter((t) => {
        const start = new Date(t.start);
        const hour = start.getHours();
        return hour >= 9 && hour < 17;
      });
      console.log(
        `Templates in work hours (9am-5pm): ${workHourTemplates.length}/${recurringTemplateEvents.length}`
      );
    }

    // Remove any old template events and add recurring definitions
    eventArray = eventArray.filter(
      (e) => e.extendedProps?.itemType !== "template"
    );
    eventArray.push(...recurringTemplateEvents);

    // Build per-template masks (used directly for slot building - no SimpleEvent generation needed)
    const perTemplateMasks = this.templateExpander.getPerTemplateMasks(
      input.templates
    );

    // Debug: Check template masks
    console.log("Template masks:", {
      count: perTemplateMasks.length,
      masks: perTemplateMasks.map((m) => ({
        templateTitle: input.templates.find((t) => t.id === m.templateId)
          ?.title,
        occurrences: m.occurrences.map((occ) => ({
          day: occ.day,
          times: occ.times.map((t) => ({
            startTime: t.startTime,
            endTime: t.endTime,
          })),
        })),
      })),
    });

    const templateEnd = performance.now();
    this.metrics.templateExpansionTimeMs = templateEnd - templateStart;
    this.metrics.templateEventsGenerated = recurringTemplateEvents.length;

    // Step 5: Build location map for location-aware slot building
    // Includes both planners AND templates (both can have locations)
    // If a planner lacks a location, inherit from its category (if defined)
    const plannerLocationMap = new Map<string, string | null>();
    const categoryById = new Map<string, { locationId: string | null }>();
    for (const c of input.categories || []) {
      // Normalize to null when undefined
      categoryById.set(c.id, { locationId: c.locationId ?? null });
    }

    for (const planner of input.planners) {
      const inheritedLocation =
        (planner.locationId ?? null) !== null
          ? planner.locationId
          : planner.categoryId
            ? (categoryById.get(planner.categoryId)?.locationId ?? null)
            : null;
      plannerLocationMap.set(planner.id, inheritedLocation ?? null);
    }
    // Add template locations to the map (templates don't inherit category)
    for (const template of input.templates) {
      plannerLocationMap.set(template.id, template.locationId ?? null);
    }

    // Step 6: Build slots with location awareness (initial 2-week window)
    // Template masks are used directly - no SimpleEvent objects created
    const initialWeeks = 2;
    this.slotManager.clear();

    // Debug: Check what events are blocking slots
    const workHourEvents = eventArray.filter((e) => {
      const start = new Date(e.start);
      const hour = start.getHours();
      return hour >= 9 && hour < 17;
    });

    console.log("Building slots from events:", {
      totalEvents: eventArray.length,
      workHourEvents: workHourEvents.length,
      workHourDetails: workHourEvents.slice(0, 5).map((e) => ({
        title: e.title,
        start: new Date(e.start).toLocaleTimeString(),
        end: new Date(e.end).toLocaleTimeString(),
        type: e.extendedProps?.itemType,
      })),
      eventTypes: eventArray.reduce(
        (acc, e) => {
          const type = e.extendedProps?.itemType || "unknown";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    });

    // If categories exist, pre-compute wrapper periods and pass to slot manager BEFORE building slots
    if (input.categories && input.categories.length > 0) {
      const categoryConstraintsListEarly = Array.from(
        (input.categories
          ? buildCategoryConstraintMap(input.categories)
          : new Map()
        ).values()
      ) as CategoryConstraint[];
      const searchEndDateStaticEarly = dateTimeService.shiftDays(
        weekStart,
        maxDaysAhead
      );
      const categoryPeriodsStaticEarly = generateCategorySlotPeriods(
        currentDate,
        searchEndDateStaticEarly,
        categoryConstraintsListEarly
      );
      const wrapperPeriodsForManagerEarly = categoryPeriodsStaticEarly
        .map((p) => ({
          start: p.start,
          end: p.end,
          locationId:
            categoryConstraintsListEarly.find((c) => c.id === p.categoryId)
              ?.locationId ?? null,
        }))
        .filter((w) => w.locationId !== null);
      if (wrapperPeriodsForManagerEarly.length > 0) {
        this.slotManager.setCategoryPeriods(wrapperPeriodsForManagerEarly);
      }
    }

    this.slotManager.buildDailySlots(
      currentDate,
      initialWeeks * 7,
      eventArray,
      perTemplateMasks,
      plannerLocationMap
    );

    // Pre-create static travel to/from category wrappers (like templates)
    if (input.categories && input.categories.length > 0) {
      const categoryConstraintsList = Array.from(
        (input.categories
          ? buildCategoryConstraintMap(input.categories)
          : new Map()
        ).values()
      ) as CategoryConstraint[];
      const searchEndDateStatic = dateTimeService.shiftDays(
        weekStart,
        maxDaysAhead
      );
      const categoryPeriodsStatic = generateCategorySlotPeriods(
        currentDate,
        searchEndDateStatic,
        categoryConstraintsList
      );

      const bufferMinutes = this.slotManager.getBufferTimeMinutes();

      // Provide wrapper periods with locations to TimeSlotManager for travel context
      const wrapperPeriodsForManager = categoryPeriodsStatic
        .map((p) => ({
          start: p.start,
          end: p.end,
          locationId:
            categoryConstraintsList.find((c) => c.id === p.categoryId)
              ?.locationId ?? null,
        }))
        .filter((w) => w.locationId !== null);
      if (wrapperPeriodsForManager.length > 0) {
        this.slotManager.setCategoryPeriods(wrapperPeriodsForManager);
      }

      for (const period of categoryPeriodsStatic) {
        // Only if category has a location
        const categoryLoc =
          categoryConstraintsList.find((c) => c.id === period.categoryId)
            ?.locationId ?? null;
        if (!categoryLoc) continue;

        // Build helper list of non-template, non-travel events inside this period (for precedence checks)
        const periodStart = new Date(period.start);
        const periodEnd = new Date(period.end);
        const nonTemplateEventsInPeriod = eventArray
          .filter((e) => {
            const type = e.extendedProps?.itemType;
            if (type === "template" || type === "travel") return false;
            const s = new Date(e.start);
            const eend = new Date(e.end);
            return s >= periodStart && s < periodEnd && eend > periodStart;
          })
          .sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
          );

        // Travel BEFORE: by default prev -> category, but if earliest event's travel intersects wrapper start,
        // route prev -> earliestEvent.location (item travel takes precedence)
        const daySlotsStart = this.slotManager.getDaySlots(period.start);
        const travelEndBefore = new Date(
          period.start.getTime() - bufferMinutes * 60000
        );
        const containingIndexBefore = daySlotsStart.findIndex(
          (s) =>
            s.isAvailable &&
            s.start.getTime() <= travelEndBefore.getTime() &&
            s.end.getTime() >= travelEndBefore.getTime()
        );
        if (containingIndexBefore !== -1) {
          const slotCtx = daySlotsStart[containingIndexBefore];
          const prevLoc = slotCtx.prevLocationId ?? null;
          if (prevLoc) {
            let placedBefore = false;
            const earliestEvent = nonTemplateEventsInPeriod[0];
            if (earliestEvent) {
              const evStart = new Date(earliestEvent.start);
              const extEarly = earliestEvent.extendedProps as
                | RuntimeEventExtendedProps
                | undefined;
              const plannerId: string = extEarly?.eventId ?? earliestEvent.id;
              const eventLoc = plannerLocationMap.get(plannerId) ?? null;
              if (eventLoc && eventLoc !== categoryLoc) {
                const minutesToEvent = this.slotManager.getTravelTime(
                  prevLoc,
                  eventLoc,
                  evStart
                );
                if (minutesToEvent > 0) {
                  const travelEndToEvent = new Date(
                    evStart.getTime() - bufferMinutes * 60000
                  );
                  const travelStartToEvent = new Date(
                    travelEndToEvent.getTime() - minutesToEvent * 60000
                  );
                  // precedence when travel starts before wrapper start
                  if (travelStartToEvent < periodStart) {
                    const canPlace =
                      this.slotManager.canPlaceStandaloneTravelBefore(
                        travelEndToEvent,
                        minutesToEvent
                      );
                    if (canPlace) {
                      this.slotManager.reserveStandaloneTravelBefore(
                        travelEndToEvent,
                        minutesToEvent,
                        prevLoc,
                        eventLoc,
                        `${earliestEvent.id}-precedence-before`
                      );
                      placedBefore = true;
                    }
                  }
                }
              }
            }

            if (!placedBefore) {
              const minutes = this.slotManager.getTravelTime(
                prevLoc,
                categoryLoc,
                period.start
              );
              if (
                minutes > 0 &&
                this.slotManager.canPlaceStandaloneTravelBefore(
                  travelEndBefore,
                  minutes
                )
              ) {
                this.slotManager.reserveStandaloneTravelBefore(
                  travelEndBefore,
                  minutes,
                  prevLoc,
                  categoryLoc,
                  `${period.categoryId}-${period.start.toISOString()}`
                );
              }
            }
          }
        }

        // Travel AFTER: by default category -> next, but if last event's travel starts before wrapper end,
        // route lastEvent.location -> next (item travel takes precedence)
        const daySlotsEnd = this.slotManager.getDaySlots(period.end);
        const travelStartAfter = new Date(
          period.end.getTime() + bufferMinutes * 60000
        );
        const containingIndexAfter = daySlotsEnd.findIndex(
          (s) =>
            s.isAvailable &&
            s.start.getTime() <= travelStartAfter.getTime() &&
            s.end.getTime() >= travelStartAfter.getTime()
        );
        if (containingIndexAfter !== -1) {
          const slotCtx = daySlotsEnd[containingIndexAfter];
          const nextLoc = slotCtx.nextLocationId ?? null;
          if (nextLoc) {
            let placedAfter = false;
            const lastEvent = [...nonTemplateEventsInPeriod]
              .filter((e) => new Date(e.end) <= periodEnd)
              .sort(
                (a, b) => new Date(b.end).getTime() - new Date(a.end).getTime()
              )[0];
            if (lastEvent) {
              const evEnd = new Date(lastEvent.end);
              const extLast = lastEvent.extendedProps as
                | RuntimeEventExtendedProps
                | undefined;
              const plannerId: string = extLast?.eventId ?? lastEvent.id;
              const eventLoc = plannerLocationMap.get(plannerId) ?? null;
              if (eventLoc) {
                const minutesFromEvent = this.slotManager.getTravelTime(
                  eventLoc,
                  nextLoc,
                  evEnd
                );
                if (minutesFromEvent > 0) {
                  const travelStartFromEvent = new Date(
                    evEnd.getTime() + bufferMinutes * 60000
                  );
                  if (travelStartFromEvent < periodEnd) {
                    const canPlace =
                      this.slotManager.canPlaceStandaloneTravelBefore(
                        new Date(
                          travelStartFromEvent.getTime() +
                            minutesFromEvent * 60000
                        ),
                        minutesFromEvent
                      );
                    if (canPlace) {
                      this.slotManager.reserveStandaloneTravelAfter(
                        travelStartFromEvent,
                        minutesFromEvent,
                        eventLoc,
                        nextLoc,
                        `${lastEvent.id}-precedence-after`
                      );
                      placedAfter = true;
                    }
                  }
                }
              }
            }

            if (!placedAfter) {
              const minutes = this.slotManager.getTravelTime(
                categoryLoc,
                nextLoc,
                period.end
              );
              if (minutes > 0) {
                const canPlace =
                  this.slotManager.canPlaceStandaloneTravelBefore(
                    new Date(travelStartAfter.getTime() + minutes * 60000),
                    minutes
                  );
                if (canPlace) {
                  this.slotManager.reserveStandaloneTravelAfter(
                    travelStartAfter,
                    minutes,
                    categoryLoc,
                    nextLoc,
                    `${period.categoryId}-${period.end.toISOString()}`
                  );
                }
              }
            }
          }
        }
      }
    }

    // Largest gap
    const largestTemplateGap = this.templateExpander.calculateLargestGap(
      input.templates
    ); // Comment: Use available slots instead to find the largest
    // slot? Presumably re-run function per new iteration of
    // available slots, cache too large items and only add them to
    // 'too large' array at the end

    // Step 7: Build category constraints map
    const categoryConstraints = input.categories
      ? buildCategoryConstraintMap(input.categories)
      : new Map();

    // Step 8: scheduling context
    const context: SchedulingContext = {
      currentDate,
      userId: input.userId,
      weekStartDay: input.weekStartDay as WeekDayIntegers,
      allPlanners: input.planners,
      scheduledEvents: [...eventArray],
      availableMinutesPerWeek:
        this.slotManager.getWeekAvailableMinutes(weekStart),
      metrics: this.metrics,
      categoryConstraints,
      plannerLocationMap,
    };

    // Step 9: strategy
    // Task ordering is handled by sortByPriority (urgency-based)
    // Slot scoring combines:
    // - EarliestSlotStrategy: baseline preference for earlier slots
    // - LocationGroupingStrategy: preference for location continuity
    const strategies: Array<{ strategy: SchedulingStrategy; weight: number }> =
      [
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

    // Step 10.5: Generate category wrapper events
    const categoryWrapperEvents: SimpleEvent[] = [];
    if (input.categories && input.categories.length > 0) {
      const categoryConstraintsList = Array.from(
        categoryConstraints.values()
      ) as CategoryConstraint[];
      const searchEndDate = dateTimeService.shiftDays(weekStart, maxDaysAhead);

      const categoryPeriods = generateCategorySlotPeriods(
        currentDate,
        searchEndDate,
        categoryConstraintsList
      );

      for (const period of categoryPeriods) {
        // Format times as HH:MM to match the slot times
        const startHours = String(period.start.getHours()).padStart(2, "0");
        const startMinutes = String(period.start.getMinutes()).padStart(2, "0");
        const endHours = String(period.end.getHours()).padStart(2, "0");
        const endMinutes = String(period.end.getMinutes()).padStart(2, "0");
        const startTimeStr = `${startHours}:${startMinutes}`;
        const endTimeStr = `${endHours}:${endMinutes}`;

        const wrapperId = `${period.categoryId}-${period.start.getDay()}-${startTimeStr}-${endTimeStr}`;

        const extendedPropsForWrapper: RuntimeEventExtendedProps = {
          id: uuidv4(),
          itemType: "category" as const,
          eventId: "",
          parentId: null,
          completedStartTime: null,
          completedEndTime: null,
          // UI-only fields below (not persisted)
          categoryId: period.categoryId,
          isStrict: period.isStrict,
          wrapperId: wrapperId,
        };

        categoryWrapperEvents.push({
          id: uuidv4(),
          title: `${period.categoryName} Time Slot`,
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          duration: Math.floor(
            (period.end.getTime() - period.start.getTime()) / 60000
          ),
          userId: input.userId,
          rrule: null,
          backgroundColor: period.categoryColor || "#3b82f6",
          borderColor: period.categoryColor || "#3b82f6",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          extendedProps: extendedPropsForWrapper,
        });
      }
    }
    // Final event list includes:
    // 1. Scheduled non-template events (tasks, plans, completed items)
    // 2. Recurring template events (with rrule) for FullCalendar UI
    // 3. Travel events generated from timeline
    // 4. Category wrapper events for time slot visualization
    // NOTE: Template masks are used directly for slot calculation - no SimpleEvent objects needed
    const templateEventsForUI = context.scheduledEvents.filter(
      (e) => e.extendedProps?.itemType === "template"
    );

    const allEvents = [
      ...scheduledNonTemplateEvents,
      ...templateEventsForUI,
      ...travelEvents,
      ...categoryWrapperEvents,
    ];

    // Detect trespassing and mark
    this.markTrespassingEvents(allEvents, plannerLocationMap);

    const endTime = performance.now();
    this.metrics.totalExecutionTimeMs = endTime - startTime;

    // Debug logging
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

    // Debug: Show scheduling order
    if (candidates.length > 0) {
      console.log(
        "Scheduling order (first should be A):",
        candidates.map((c) => c.title)
      );
    }

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
    const withUrgency = goalsAndTasks.map((item) => {
      // For goals, check if ANY child task has a category constraint
      let hasCategoryConstraint = item.categoryId !== null;

      if (item.itemType === "goal" && !hasCategoryConstraint) {
        // Check if any child tasks have category constraints
        const childTasks = allPlanners.filter((p) => {
          // Direct children or descendants
          let current = p;
          while (current.parentId) {
            if (current.parentId === item.id) return true;
            current =
              allPlanners.find((parent) => parent.id === current.parentId) ||
              current;
            if (!current.parentId) break;
          }
          return false;
        });
        hasCategoryConstraint = childTasks.some(
          (child) => child.categoryId !== null
        );
      }

      return {
        ...item,
        urgencyScore: calculateTaskUrgency(item, {
          currentDate: now,
          totalEstimatedTime,
        }),
        hasCategoryConstraint,
      };
    });

    // Sort by:
    // 1. Category constraint (tasks with constraints first)
    // 2. Urgency score (highest first)
    return withUrgency.sort((a, b) => {
      // Prioritize tasks with category constraints
      if (a.hasCategoryConstraint && !b.hasCategoryConstraint) return -1;
      if (!a.hasCategoryConstraint && b.hasCategoryConstraint) return 1;

      // Then by urgency
      return b.urgencyScore - a.urgencyScore;
    });
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
        const plannerId =
          (e.extendedProps as { eventId?: string })?.eventId || e.id;
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

    // Mark events with trespassing info - modify the events array with new objects
    const updatedEvents: SimpleEvent[] = [];
    for (const event of events) {
      const info = trespassingMap.get(event.id);
      if (info && event.extendedProps) {
        // Create a new event object with updated extendedProps
        const updatedProps: RuntimeEventExtendedProps = {
          ...(event.extendedProps || {}),
          trespassingStart: info.trespassingStart,
          trespassingEnd: info.trespassingEnd,
        };

        updatedEvents.push({
          ...event,
          extendedProps: updatedProps,
        });
      } else {
        updatedEvents.push(event);
      }
    }

    // Replace events array with updated one
    events.length = 0;
    events.push(...updatedEvents);
  }

  /**
   * Get current metrics
   */
  getMetrics(): SchedulingMetrics {
    return { ...this.metrics };
  }
}
