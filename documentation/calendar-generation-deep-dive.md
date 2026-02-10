# Calendar Generation System - Deep Dive Documentation

This document explains the complete flow of the calendar generation system. It covers every step from input to output, all the supporting classes, and how they interact.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Entry Point: CalendarGenerator.generate()](#entry-point-calendargeneratorgenerate)
3. [Step-by-Step Execution Flow](#step-by-step-execution-flow)
4. [Core Classes In Detail](#core-classes-in-detail)
   - [CalendarGenerator](#calendargenerator)
   - [TimeSlotManager](#timeslotmanager)
   - [TemplateExpander](#templateexpander)
   - [Scheduler](#scheduler)
5. [Strategy System](#strategy-system)
6. [Data Models](#data-models)
7. [Travel Time System](#travel-time-system)
8. [Category System](#category-system)
9. [Utility Functions](#utility-functions)
10. [Complete Data Flow Diagram](#complete-data-flow-diagram)

---

## High-Level Overview

The calendar generation system takes a user's tasks, goals, templates (recurring events), and existing calendar events, then automatically schedules all unscheduled tasks into available time slots.

**Key Concepts:**

- **Planner**: A task, goal, or plan item that needs to be scheduled or organized
- **Template**: A recurring event (like "Sleep 10pm-6am" or "Work 9am-5pm") that blocks time
- **Category**: Organizational container with time-based scheduling constraints (can be strict or non-strict)
- **SimpleEvent**: The output format - actual calendar events with start/end times
- **TimeSlot**: An available window of time where tasks can be placed

**The Four Core Classes:**

```
CalendarGenerator (orchestrator)
    ├── TimeSlotManager (manages available time slots)
    ├── TemplateExpander (converts templates to time blocks)
    └── Scheduler (places tasks into slots using strategies)
```

---

## Entry Point: CalendarGenerator.generate()

Location: `utils/calendar-generation/core/CalendarGenerator.ts:54-300`

### Input Structure (CalendarGenerationInput)

```typescript
interface CalendarGenerationInput {
  userId: string; // Who this calendar belongs to
  weekStartDay: number; // 0-6 (Sunday-Saturday)
  templates: EventTemplate[]; // Recurring time blocks
  planners: Planner[]; // Tasks, goals, and plans to schedule
  previousCalendar: SimpleEvent[]; // Existing calendar events to preserve
  config?: CalendarGenerationConfig; // Optional settings
}
```

### Output Structure (SchedulingResult)

```typescript
interface SchedulingResult {
  success: boolean; // True if all tasks were scheduled
  events: SimpleEvent[]; // The complete calendar (past + scheduled + templates)
  failures: SchedulingFailure[]; // Tasks that couldn't be scheduled
  metrics: SchedulingMetrics; // Performance/debug info
}
```

---

## Step-by-Step Execution Flow

### Step 1: Initialization and Validation (Lines 54-94)

```typescript
generate(input: CalendarGenerationInput): SchedulingResult {
  const startTime = performance.now();
  this.metrics = this.createEmptyMetrics();

  // Create TimeSlotManager with buffer time and travel matrix
  const bufferTimeMinutes = input.config?.bufferTimeMinutes ?? 0;
  this.slotManager = new TimeSlotManager(
    this.weekStartDay,
    new Date(),
    bufferTimeMinutes,
    input.config?.travelTimeMatrix
  );

  // Validate input (checks for required fields, valid durations, etc.)
  const validation = CalendarValidator.validateGenerationInput({...});
  // Returns early if validation fails
}
```

**What happens:**

1. Performance timer starts
2. Fresh metrics object created
3. TimeSlotManager instantiated with buffer time between events
4. Input validated (user ID exists, planners have durations, etc.)

### Step 2: Memoized Events (Lines 100-114)

```typescript
// Filter out template and travel events - templates are regenerated, travel is recalculated
const memoizedEventIds = new Set<string>();
if (input.previousCalendar.length > 0) {
  const pastEvents = input.previousCalendar.filter(
    (e) =>
      currentDate > new Date(e.end) &&
      e.extendedProps?.itemType !== "template" &&
      e.extendedProps?.itemType !== "travel",
  );
  pastEvents.forEach((e) => memoizedEventIds.add(e.id));
  eventArray.push(...pastEvents);
}
```

**What happens:**

- Past events (already completed) are preserved from the previous calendar
- Template events are excluded (they'll be regenerated)
- Travel events are excluded (they'll be recalculated)
- `memoizedEventIds` tracks which events are already "done" so they won't be re-scheduled

### Step 3: Add Plan Items (Lines 117-122)

```typescript
eventArray = this.addPlanItems(
  input.userId,
  input.planners,
  eventArray,
  memoizedEventIds,
);
```

**What happens:**

- Plan items have fixed times (`starts` field) - they're appointments
- Converted directly to SimpleEvents at their specified times
- Not subject to automatic scheduling

**The addPlanItems method (Lines 536-579):**

```typescript
private addPlanItems(...): SimpleEvent[] {
  const planItems = planners.filter(
    (task) => task.itemType === "plan" && !memoizedEventIds.has(task.id)
  );

  for (const plan of planItems) {
    if (plan.starts && plan.duration) {
      const end = new Date(
        new Date(plan.starts).getTime() + plan.duration * 60000
      );
      eventArray.push({
        // Creates SimpleEvent with fixed start/end times
        start: plan.starts,
        end: end.toISOString(),
        extendedProps: { itemType: "plan", ... }
      });
    }
  }
  return eventArray;
}
```

### Step 4: Add Completed Items (Lines 125-130)

```typescript
eventArray = this.addCompletedItems(
  input.userId,
  input.planners,
  eventArray,
  memoizedEventIds,
);
```

**What happens:**

- Tasks that have `completedStartTime` and `completedEndTime` are already done
- They're added to the calendar at their completed times
- Won't be re-scheduled

### Step 5: Expand Templates (Lines 132-159)

```typescript
const templateStart = performance.now();
const weekStart = dateTimeService.getWeekFirstDate(
  currentDate,
  input.weekStartDay,
);
const searchEndDate = dateTimeService.shiftDays(weekStart, maxDaysAhead);

// Create recurring template events for FullCalendar UI
const recurringTemplateEvents = this.templateExpander.expandTemplates(
  input.userId,
  input.templates,
  weekStart,
  searchEndDate,
);

// Remove old templates, add new ones
eventArray = eventArray.filter((e) => e.extendedProps?.itemType !== "template");
eventArray.push(...recurringTemplateEvents);

// Build per-template masks for slot calculation
const perTemplateMasks = this.templateExpander.getPerTemplateMasks(
  input.templates,
);
```

**What happens:**

1. Calculate the scheduling window (current week start to maxDaysAhead)
2. `expandTemplates()` creates ONE SimpleEvent per template with an RRule (recurrence rule)
3. `getPerTemplateMasks()` creates a compact representation for slot calculation

**Template Masks Explained:**

Templates are converted to "masks" - a pattern that says "on Monday, block 9am-5pm; on Tuesday, block 9am-5pm".

```typescript
type PerTemplateMask = {
  templateId: string;
  title?: string;
  locationId?: string | null;
  occurrences: TemplateDayDef[]; // Sparse list of weekdays with times
};

type TemplateDayDef = {
  day: number; // 0-6 (Sunday-Saturday)
  times: TemplateTimeWithExceptions[];
};

type TemplateTimeWithExceptions = {
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  exceptions?: string[]; // Dates to skip
};
```

### Step 6: Build Location Map (Lines 162-172)

```typescript
const plannerLocationMap = new Map<string, string | null>();
for (const planner of input.planners) {
  plannerLocationMap.set(planner.id, planner.locationId ?? null);
}
for (const template of input.templates) {
  plannerLocationMap.set(template.id, template.locationId ?? null);
}
```

**What happens:**

- Creates a lookup map: planner/template ID -> location ID
- Used for travel time calculation between events
- `null` location means "everywhere" (no travel needed)

### Step 7: Build Initial Time Slots (Lines 174-183)

```typescript
const initialWeeks = 2;
this.slotManager.clear();
this.slotManager.buildDailySlots(
  currentDate,
  initialWeeks * 7, // 14 days
  eventArray,
  perTemplateMasks,
  plannerLocationMap,
);
```

**What happens:**

1. Clear any existing slots
2. For each day in the 14-day window:
   - Start with 24 hours available
   - Subtract time blocked by templates (using masks)
   - Subtract time blocked by existing events (plans, completed items)
   - Create travel slots where locations change
   - Apply buffer time between events
   - Result: list of available TimeSlots per day

**The buildAvailableSlots method (TimeSlotManager Lines 125-198):**

```typescript
buildAvailableSlots(startDate, endDate, existingEvents, templateMasks, plannerLocationMap) {
  // 1. Convert existing events to intervals (with location info)
  const eventIntervals = eventsToIntervals(relevantEvents, plannerLocationMap);

  // 2. Convert template masks to intervals for this day
  const templateIntervals = masksToIntervals(templateMasks, startDate);

  // 3. Combine all occupied intervals
  const occupiedIntervals = [...eventIntervals, ...templateIntervals];

  // 4. Find gaps between occupied intervals
  const gaps = findGaps(occupiedIntervals, startDate, endDate);

  // 5. Convert gaps to TimeSlots
  let slots = gapsToTimeSlots(gaps);

  // 6. Apply buffer time to slots that have preceding events
  if (this.bufferTimeMinutes > 0) {
    slots = slots.map((slot) => {
      // Shrink slot start by buffer amount
      // ...
    });
  }

  // 7. Create travel slots between adjacent events
  this.processTravelTransitions(startDate, allIntervals, slots);

  // 8. Merge adjacent available slots
  return TimeSlotUtils.mergeAdjacentSlots(slots);
}
```

### Step 8: Calculate Largest Template Gap (Lines 186-188)

```typescript
const largestTemplateGap = this.templateExpander.calculateLargestGap(
  input.templates,
);
```

**What happens:**

- Finds the biggest continuous free window in a typical week
- Used to reject tasks that are too long to ever fit
- Example: If templates block everything except 2-hour windows, a 3-hour task will fail immediately

### Step 9: Create Scheduling Context (Lines 191-200)

```typescript
const context: SchedulingContext = {
  currentDate,
  userId: input.userId,
  weekStartDay: input.weekStartDay,
  allPlanners: input.planners,
  scheduledEvents: [...eventArray],
  availableMinutesPerWeek: this.slotManager.getWeekAvailableMinutes(weekStart),
  metrics: this.metrics,
};
```

**What happens:**

- Creates a context object passed to the Scheduler
- Contains everything needed to make scheduling decisions
- `scheduledEvents` is a mutable array - new events get added here

### Step 10: Configure Strategies (Lines 207-234)

```typescript
const strategies: Array<{ strategy: SchedulingStrategy; weight: number }> = [
  {
    strategy: new EarliestSlotStrategy(),
    weight:
      input.config?.strategyWeights?.earliestSlot ??
      DEFAULT_STRATEGY_WEIGHTS.earliestSlot,
  },
];

// Add location grouping strategy if travel matrix provided
if (input.config?.travelTimeMatrix && input.config.travelTimeMatrix.size > 0) {
  strategies.push({
    strategy: new LocationGroupingStrategy(
      input.config.travelTimeMatrix,
      input.config?.locationGroupingScores,
      input.config?.locationGroupingPenalties,
    ),
    weight:
      input.config?.strategyWeights?.locationGrouping ??
      DEFAULT_STRATEGY_WEIGHTS.locationGrouping,
  });
}

const strategy = new CompositeStrategy(strategies);
```

**What happens:**

- Creates scoring strategies for slot selection
- **EarliestSlotStrategy**: Prefers earlier slots (today > tomorrow > next week)
  - Default weight: 1.0
- **LocationGroupingStrategy**: Prefers slots that minimize travel (if travel matrix provided)
  - Default weight: 0.2
  - Only added if travel time data exists
- Strategies are combined with weights using CompositeStrategy

**Default Strategy Configuration** (from `defaultStrategy.ts`):

```typescript
DEFAULT_STRATEGY_WEIGHTS = {
  earliestSlot: 1.0,
  locationGrouping: 0.2,
};
```

The location grouping weight is intentionally low (0.2) to act as a tie-breaker rather than a dominant factor. This prevents over-prioritizing weekend slots just because they have matching neighbors.

### Step 11: Schedule Tasks and Goals (Lines 237-246)

```typescript
const scheduler = new Scheduler(this.slotManager, strategy, context);
const schedulingResult = this.scheduleTasksAndGoals(
  input.planners,
  memoizedEventIds,
  largestTemplateGap,
  scheduler,
  perTemplateMasks,
  context,
  plannerLocationMap,
);
```

**This is the core scheduling loop.** Let's break it down:

#### The scheduleTasksAndGoals Method (Lines 306-480)

```typescript
private scheduleTasksAndGoals(...): { success, newEvents, failures } {
  const events: SimpleEvent[] = [];
  const failures: SchedulingFailure[] = [];
  const scheduledTaskIds = new Set<string>();

  // STEP A: Get initial candidates
  let candidates: Planner[] = allPlanners.filter((item) =>
    ((item.itemType === "goal" && !item.parentId && item.isReady) ||
     item.itemType === "task") &&
    !memoizedEventIds.has(item.id)
  );

  // STEP B: Sort by priority/urgency
  candidates = this.sortByPriority(allPlanners, candidates);

  // ... scheduling loop continues
}
```

**Candidate Selection Logic:**

- Top-level goals (no parent, marked ready) - these contain tasks to schedule
- Standalone tasks (not part of a goal)
- Excludes already-scheduled items (memoized)

**Priority Sorting (Lines 628-653):**

```typescript
private sortByPriority(allPlanners, goalsAndTasks): Planner[] {
  const now = new Date();
  const totalPlannerTime = allPlanners.reduce((acc, p) => acc + p.duration, 0);

  const withUrgency = goalsAndTasks.map((item) => ({
    ...item,
    urgencyScore: calculateTaskUrgency(item, {
      currentDate: now,
      totalEstimatedTime: totalPlannerTime,
    }),
  }));

  // Higher urgency = scheduled first
  return withUrgency.sort((a, b) => b.urgencyScore - a.urgencyScore);
}
```

**Urgency Calculation (sortPlannersByPriority.ts):**

```typescript
function calculateTaskUrgency(task, context): number {
  if (!task.deadline) {
    return task.priority * 0.3; // No deadline = 30% priority
  }

  const deadline = new Date(task.deadline);
  const minutesUntilDeadline = (deadline - currentDate) / 60000;

  // Ratio: how much time until deadline vs total work
  let timeRatio = minutesUntilDeadline / totalEstimatedTime;
  timeRatio = clamp(timeRatio, 0, 1);

  // Sigmoid curve - urgency ramps up as deadline approaches
  const sigmoid = 1 / (1 + Math.exp(-4 * (timeRatio - 0.7)));
  const urgencyMultiplier = 1 - sigmoid;

  // Scale from 0.3 to 1.0
  const scaledUrgency = 0.3 + 0.7 * urgencyMultiplier;

  return task.priority * scaledUrgency;
}
```

**The Week-by-Week Scheduling Loop (Lines 343-464):**

```typescript
let weekStart = dateTimeService.getWeekFirstDate(
  context.currentDate,
  this.weekStartDay,
);
let weeksSearched = 0;

while (candidates.length > 0 && weeksSearched < MAX_WEEKS_TO_SEARCH) {
  // Try scheduling each candidate (iterate backwards for safe removal)
  for (let i = candidates.length - 1; i >= 0; i--) {
    const item = candidates[i];

    if (item.itemType === "task") {
      // Skip if already scheduled
      if (scheduledTaskIds.has(item.id)) {
        candidates.splice(i, 1);
        continue;
      }

      // Size check - reject if too big
      if (largestTemplateGap && item.duration > largestTemplateGap) {
        failures.push({
          taskId: item.id,
          reason: SchedulingFailureReason.TOO_LARGE,
          details: `Duration (${item.duration}) exceeds largest gap (${largestTemplateGap})`,
        });
        candidates.splice(i, 1);
        continue;
      }

      // TRY TO SCHEDULE
      const result = scheduler.scheduleTask(item);

      if (result.success && result.event) {
        events.push(result.event);
        scheduledTaskIds.add(item.id);
        candidates.splice(i, 1);
      } else if (result.failure) {
        if (result.failure.reason !== NO_SLOTS) {
          failures.push(result.failure);
          candidates.splice(i, 1);
        }
        // If NO_SLOTS, keep in candidates - might fit in next week
      }
    } else if (item.itemType === "goal") {
      // Goals contain tasks - schedule them in dependency order
      const goalTasks = getSortedTreeBottomLayer(allPlanners, item.id).filter(
        (t) => !taskIsCompleted(t) && !scheduledTaskIds.has(t.id),
      );

      let goalAfterTime: Date | undefined = undefined;

      for (const task of goalTasks) {
        // Schedule task after the previous one in the goal
        const res = scheduler.scheduleTask(task, goalAfterTime);

        if (res.success && res.event) {
          events.push(res.event);
          scheduledTaskIds.add(task.id);
          // Next task must come after this one
          goalAfterTime = new Date(res.event.end);
        }
        // ... error handling
      }
    }
  }

  // If candidates remain, expand to next week
  if (candidates.length > 0) {
    weeksSearched += 1;
    weekStart = dateTimeService.shiftDays(weekStart, 7);

    // Build slots for the new week
    this.slotManager.buildDailySlots(
      weekStart,
      7,
      weekEvents,
      perTemplateMasks,
      plannerLocationMap,
    );
  }
}
```

### Step 12: Generate Travel Events (Lines 253-272)

```typescript
const scheduledNonTemplateEvents = context.scheduledEvents.filter(
  (e) => e.extendedProps?.itemType !== "template",
);

// Convert travel slots to SimpleEvents
const travelEvents = this.slotManager.generateTravelEvents(input.userId);

// Combine all events
const templateEventsForUI = context.scheduledEvents.filter(
  (e) => e.extendedProps?.itemType === "template",
);
const allEvents = [
  ...scheduledNonTemplateEvents,
  ...templateEventsForUI,
  ...travelEvents,
];
```

**What happens:**

- During scheduling, travel time was tracked as "occupied slots" (not events)
- Now convert those travel slots to actual SimpleEvents for the calendar
- Travel events show up as gray blocks between events at different locations

### Step 13: Mark Trespassing Events (Lines 276)

```typescript
this.markTrespassingEvents(allEvents, plannerLocationMap);
```

**What happens:**

- Detects overlapping events with different locations
- These are "trespassing" - physically impossible to be in two places
- Marks events with red borders so the user can see the conflict

### Step 14: Return Results (Lines 294-300)

```typescript
return {
  success: schedulingResult.failures.length === 0,
  events: allEvents,
  failures: schedulingResult.failures,
  metrics: this.metrics,
};
```

---

## Core Classes In Detail

### TimeSlotManager

Location: `utils/calendar-generation/core/TimeSlotManager.ts`

**Purpose:** Manages available time slots and tracks what's occupied.

**Key Data Structures:**

```typescript
class TimeSlotManager {
  private availableSlots: Map<string, TimeSlot[]>; // day key -> available slots
  private occupiedSlots: Map<string, TimeSlot[]>; // day key -> occupied slots (including travel)
  private bufferTimeMinutes: number;
  private travelTimeMatrix: Map<string, TravelTimeEntry> | null;
}
```

**Key Methods:**

#### `buildAvailableSlots(startDate, endDate, existingEvents, templateMasks, plannerLocationMap)`

Constructs available time slots for a day by:

1. Finding all occupied intervals (events + templates)
2. Computing gaps between occupied intervals
3. Applying buffer time
4. Creating travel slots at location transitions

#### `findAllFittingSlots(durationMinutes, afterDate, maxDaysToSearch)`

Returns all slots that can fit a task of given duration.

- Searches day by day from afterDate
- Returns slots with location info (prevLocationId, nextLocationId)
- Used by Scheduler to get candidates for scoring

#### `reserveSlotWithTravel(start, end, eventId, eventType, taskLocationId, travelBefore, travelAfter, prevLocationId, nextLocationId)`

Reserves a slot for a task, handling travel:

1. Finds the containing available slot
2. Creates travel-before if needed (at slot start)
3. Marks task time as occupied
4. Creates free space between task and travel-after
5. Creates travel-after at slot end (anchored to next event)
6. Updates adjacent slots' location references

#### `generateTravelEvents(userId)`

Converts all travel slots to SimpleEvents for display.

### TemplateExpander

Location: `utils/calendar-generation/core/TemplateExpander.ts`

**Purpose:** Converts EventTemplate records into usable formats.

**Key Methods:**

#### `expandTemplates(userId, templates, startDate, endDate)`

Creates one SimpleEvent per template with an RRule for recurrence.
Used for FullCalendar UI display.

#### `getPerTemplateMasks(templates)`

Creates compact masks for slot calculation:

```typescript
{
  templateId: "abc",
  locationId: "work",
  occurrences: [
    { day: 1, times: [{ startTime: "09:00", endTime: "17:00" }] },  // Monday
    { day: 2, times: [{ startTime: "09:00", endTime: "17:00" }] },  // Tuesday
    // ...
  ]
}
```

#### `calculateLargestGap(templates)`

Finds the biggest continuous available window in a week.
Used to pre-reject tasks that can never fit.

### Scheduler

Location: `utils/calendar-generation/core/Scheduler.ts`

**Purpose:** Places tasks into time slots using strategies.

#### `scheduleTask(task, afterTime?)`

The main scheduling method:

```typescript
scheduleTask(task: Planner, afterTime?: Date): { success, event?, failure? } {
  // 1. Validate task
  if (!task.duration || task.duration <= 0) {
    return { success: false, failure: { reason: INVALID_TASK } };
  }

  const taskLocationId = task.locationId ?? null;

  // 2. Find all slots that can fit the base requirement
  const fittingSlots = this.slotManager.findAllFittingSlots(
    task.duration,
    afterTime || this.context.currentDate
  );

  if (fittingSlots.length === 0) {
    return { success: false, failure: { reason: NO_SLOTS } };
  }

  // 3. Score ALL slots using strategy
  const scoredSlots = this.scoreSlots(task, fittingSlots);

  // 4. Iterate through scored slots, find first with enough capacity
  const bufferMinutes = this.slotManager.getBufferTimeMinutes();

  for (const scoredSlot of scoredSlots) {
    const slot = fittingSlots.find(s => s.start.getTime() === scoredSlot.slot.start.getTime());

    // Calculate travel times based on location
    let needTravelBefore = 0;
    let needTravelAfter = 0;

    if (taskLocationId) {
      // Travel BEFORE: needed if prev location differs
      if (slot.prevLocationId && slot.prevLocationId !== taskLocationId) {
        needTravelBefore = this.slotManager.getTravelTime(
          slot.prevLocationId, taskLocationId, slot.start
        );
      }

      // Travel AFTER: needed if next location differs
      if (slot.nextLocationId && slot.nextLocationId !== taskLocationId) {
        needTravelAfter = this.slotManager.getTravelTime(
          taskLocationId, slot.nextLocationId, slot.start
        );
      }
    }

    // Check for reusable travel (existing travel to same destination)
    let effectiveTravelAfter = needTravelAfter;
    if (needTravelAfter > 0 && slot.nextLocationId) {
      const reusable = this.slotManager.findAdjacentTravelTo(slot.end, slot.nextLocationId);
      if (reusable) {
        effectiveTravelAfter = 0;  // Reuse existing travel
      }
    }

    // Calculate total required time
    const numBuffers = 1 + (needTravelBefore > 0 ? 1 : 0);
    const totalRequired = task.duration + needTravelBefore + effectiveTravelAfter +
                         numBuffers * bufferMinutes;

    // Check capacity
    if (slot.durationMinutes >= totalRequired) {
      selectedSlot = slot;
      break;
    }
  }

  if (!selectedSlot) {
    return { success: false, failure: { reason: NO_SLOTS } };
  }

  // 5. Calculate task times
  const offsetToTaskStart = travelBefore > 0 ? travelBefore + bufferMinutes : 0;
  const taskStartDate = addMinutes(selectedSlot.start, offsetToTaskStart);
  const taskEndDate = addMinutes(taskStartDate, task.duration);

  // 6. Reserve the slot
  this.slotManager.reserveSlotWithTravel(
    taskStartDate, taskEndDate, task.id, task.itemType,
    taskLocationId, travelBefore, travelAfter,
    selectedSlot.prevLocationId, selectedSlot.nextLocationId
  );

  // 7. Create and return the event
  const event: SimpleEvent = {
    id: task.id,
    title: task.title,
    start: taskStartDate.toISOString(),
    end: taskEndDate.toISOString(),
    // ...
  };

  this.context.scheduledEvents.push(event);
  return { success: true, event };
}
```

---

## Strategy System

Location: `utils/calendar-generation/strategies/`

### Overview

The scheduling system uses a **weighted composite strategy** approach where multiple scoring strategies are combined to determine the best time slot for each task. Default weights and configurations are defined in [defaultStrategy.ts](utils/calendar-generation/strategies/defaultStrategy.ts).

**Key Strategy Files:**

- `SchedulingStrategy.ts` - Base interface and CompositeStrategy implementation
- `defaultStrategy.ts` - Default weights and scoring configurations
- `EarliestSlotStrategy.ts` - Prefers earlier time slots
- `LocationGroupingStrategy.ts` - Minimizes travel time

**Note:** Task urgency/deadline prioritization is handled by `sortPlannersByPriority` **before** slot scoring. Strategies only score available slots, they don't determine task order.

### SchedulingStrategy Interface

```typescript
interface SchedulingStrategy {
  readonly name: string;
  score(task: Planner, slot: TimeSlot, context: SchedulingContext): number;
  // Returns 0.0 to 1.0 (higher = better)
}
```

### CompositeStrategy

Combines multiple strategies with weights:

```typescript
class CompositeStrategy implements SchedulingStrategy {
  score(task, slot, context): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const { strategy, weight } of this.strategies) {
      const strategyScore = strategy.score(task, slot, context);
      totalScore += strategyScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }
}
```

### EarliestSlotStrategy

Location: `utils/calendar-generation/strategies/EarliestSlotStrategy.ts`

Provides baseline preference for scheduling tasks sooner rather than later.

```typescript
score(_task, slot, context): number {
  const now = context.currentDate;
  const daysFromNow = (slot.start - now) / MS_PER_DAY;

  // Score decays linearly over 14 days
  // Day 0 = 1.0, Day 7 = 0.5, Day 14 = 0.0
  return Math.max(0, 1 - daysFromNow / 14);
}
```

**Default Weight:** 1.0 (from `DEFAULT_STRATEGY_WEIGHTS.earliestSlot`)

### LocationGroupingStrategy

Location: `utils/calendar-generation/strategies/LocationGroupingStrategy.ts`

Scores based on "sandwich" pattern to minimize travel. Uses configurable scores from `defaultStrategy.ts`:

```typescript
score(task, slot): number {
  if (!task.locationId) return scores.noLocation;  // Default: 0.5 (neutral)

  const prevMatches = slot.prevLocationId === task.locationId;
  const nextMatches = slot.nextLocationId === task.locationId;
  const prevExists = slot.prevLocationId !== null;
  const nextExists = slot.nextLocationId !== null;

  // Calculate travel time penalties
  const totalTravelTime = calculateTravelTime(prevLocation, nextLocation);

  if (prevMatches && nextMatches) {
    return scores.bothMatch;  // Default: 0.95 - Perfect sandwich
  }
  if ((prevMatches && !nextExists) || (nextMatches && !prevExists)) {
    return scores.oneMatchOneOpen;  // Default: 0.8 - One match, one open
  }
  if (prevMatches || nextMatches) {
    const penalty = Math.min(
      penalties.maxSingleTravelPenalty,
      totalTravelTime / penalties.singleTravelPenaltyDivisor
    );
    return scores.oneMatch - penalty;  // Default: 0.5 - penalty
  }
  if (!prevExists && !nextExists) {
    return scores.bothOpen;  // Default: 0.7 - Empty day
  }
  if (!prevExists || !nextExists) {
    const penalty = Math.min(
      penalties.maxSingleTravelPenalty,
      totalTravelTime / penalties.singleTravelPenaltyDivisor
    );
    return scores.oneOpenNoMatch - penalty;  // Default: 0.45 - penalty
  }

  // Neither matches, both exist
  const penalty = Math.min(
    penalties.maxDoubleTravelPenalty,
    totalTravelTime / penalties.doubleTravelPenaltyDivisor
  );
  return scores.neitherMatch - penalty;  // Default: 0.4 - penalty
}
```

**Default Configuration (from `defaultStrategy.ts`):**

```typescript
DEFAULT_LOCATION_GROUPING_SCORES = {
  bothMatch: 0.95, // Both adjacent events match
  oneMatchOneOpen: 0.8, // One match, one open
  oneMatch: 0.5, // One match, one doesn't
  bothOpen: 0.7, // Both open (empty day)
  oneOpenNoMatch: 0.45, // One open, one doesn't match
  neitherMatch: 0.4, // Neither matches
  noLocation: 0.5, // Task has no location
};

DEFAULT_LOCATION_GROUPING_PENALTIES = {
  maxSingleTravelPenalty: 0.02,
  maxDoubleTravelPenalty: 0.03,
  singleTravelPenaltyDivisor: 600, // Travel minutes / 600
  doubleTravelPenaltyDivisor: 400, // Travel minutes / 400
};
```

---

## Data Models

### TimeSlot

```typescript
interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
  isAvailable: boolean;
  eventId?: string; // What's occupying this slot
  eventType?: "task" | "goal" | "plan" | "template" | "travel" | "category";
  prevLocationId?: string | null; // Location of event BEFORE this slot
  nextLocationId?: string | null; // Location of event AFTER this slot

  // Travel-specific fields
  travelFromLocationId?: string | null;
  travelToLocationId?: string | null;
  insufficientTravel?: boolean;
  requiredTravelMinutes?: number;
}
```

### SchedulingContext

```typescript
interface SchedulingContext {
  currentDate: Date;
  userId: string;
  weekStartDay: number;
  allPlanners: Planner[];
  scheduledEvents: SimpleEvent[]; // Mutable - events added here
  availableMinutesPerWeek: number;
  metrics: SchedulingMetrics;
}
```

### SchedulingFailure

```typescript
interface SchedulingFailure {
  taskId: string;
  taskTitle: string;
  reason: SchedulingFailureReason; // TOO_LARGE | NO_SLOTS | INVALID_TASK | etc.
  details: string;
  context?: Record<string, unknown>;
}
```

---

## Travel Time System

### How Travel Works

1. **Location Map:** Each planner/template has an optional `locationId`
2. **Travel Matrix:** Maps `"fromLocationId->toLocationId"` to travel times
3. **Time Periods:** Rush hour, regular, night have different travel times

### Travel Time Lookup

```typescript
getTravelTime(fromLocationId, toLocationId, timeOfDay): number {
  if (!fromLocationId || !toLocationId || fromLocationId === toLocationId) {
    return 0;  // No travel needed
  }

  const entry = travelTimeMatrix.get(`${fromLocationId}->${toLocationId}`);
  if (!entry) return 0;

  const hour = timeOfDay.getHours();

  if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 19)) {
    return entry.rushHourMinutes;  // Rush hour
  } else if (hour >= 22 || hour < 6) {
    return entry.nightMinutes;     // Night
  } else {
    return entry.regularMinutes;   // Regular
  }
}
```

### Travel Slot Layout

When scheduling a task at a different location than neighbors:

```
[Previous Event @ Location A]
[TRAVEL: A -> B] (travel-before)
[BUFFER]
[TASK @ Location B]
[BUFFER]
[FREE SPACE]
[BUFFER]
[TRAVEL: B -> C] (travel-after, anchored to end)
[Next Event @ Location C]
```

**Travel Shifting:** When a new task is added in the FREE SPACE, travel-after shifts forward to stay adjacent to the next event.

### "Anywhere" Tasks

Tasks with `locationId: null` are considered "everywhere" - they don't need travel:

- No travel-before needed
- No travel-after needed
- They're "transparent" for travel purposes

---

## Category System

### Overview

Categories provide organizational structure with time-based scheduling constraints. They enable users to define when certain types of tasks should be scheduled and whether those time slots are exclusive.

### Category Model

```typescript
interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;

  // Time constraint slots (JSON array)
  // Format: [{ days: [1,3,5], startTime: "08:00", endTime: "17:00" }, ...]
  // days: 0=Sunday, 1=Monday, ... 6=Saturday
  timeSlots: TimeSlotDefinition[] | null;

  // Strict mode control
  isStrict: boolean; // true = only category items allowed in slots
  // false = other items can fill empty space

  // Optional location inheritance
  locationId?: string | null;

  // Hierarchical structure
  parentId?: string | null;

  userId: string;
}
```

### How Categories Work

1. **Time Slot Definition**: Categories can define specific time windows when their items should be scheduled

   - Example: "Work" category with weekday 9am-5pm slots
   - Example: "Exercise" category with Mon/Wed/Fri 6-7am slots

2. **Strict vs Non-Strict Mode**:

   - **Strict (`isStrict: true`)**: Only items from this category can occupy the defined time slots
     - Other tasks will be blocked from these times
     - Ensures dedicated time for specific activities
   - **Non-Strict (`isStrict: false`)**: Category items are preferred but other items can fill empty space
     - More flexible scheduling
     - Good for optional or aspirational categories

3. **Location Inheritance**: Items without a specific location inherit the category's location

   - Example: "Work" category with office location applies to all work tasks by default

4. **Visual Representation**: Categories appear as background events on the calendar
   - Shows time constraints visually
   - Helps users understand their scheduling structure
   - Rendered using [CategoryWrapperEvent.tsx](components/events/CategoryWrapperEvent.tsx)

### Integration with Scheduling

Categories affect the scheduling system in two ways:

1. **Slot Generation**: TimeSlotManager treats category time slots similarly to templates

   - Category slots reduce available time (like templates)
   - But can be "filled" if non-strict mode

2. **Task Filtering**: Scheduler respects category constraints
   - Tasks with `categoryId` are preferentially placed in category time slots
   - Non-category tasks avoid strict category slots

### Example Use Cases

**Software Engineer's Schedule:**

```typescript
{
  name: "Deep Work",
  timeSlots: [
    { days: [1,2,3,4,5], startTime: "09:00", endTime: "12:00" }
  ],
  isStrict: true,  // No meetings or other tasks during this time
  locationId: "home-office"
}
```

**Fitness Routine:**

```typescript
{
  name: "Exercise",
  timeSlots: [
    { days: [1,3,5], startTime: "06:00", endTime: "07:00" }
  ],
  isStrict: false,  // Preferred time, but flexible if needed
  locationId: "gym"
}
```

---

## Utility Functions

### intervalUtils.ts

**`findGaps(occupiedIntervals, rangeStart, rangeEnd)`**
Finds available time between occupied intervals.

**`eventsToIntervals(events, plannerLocationMap)`**
Converts SimpleEvents to intervals with location info.

**`masksToIntervals(masks, date)`**
Converts template masks to intervals for a specific date.

**`detectTrespassingEvents(intervals)`**
Finds overlapping events with different locations.

### dateTimeService.ts

**`getWeekFirstDate(date, weekStartDay)`**
Gets the first day of the week containing `date`.

**`shiftDays(date, days)`**
Adds/subtracts days from a date.

**`addDuration(date, minutes)`**
Adds minutes to a date.

### sortPlannersByPriority.ts

**`calculateTaskUrgency(task, context)`**
Computes urgency score based on deadline proximity.

### goalPageHandlers.ts

**`getSortedTreeBottomLayer(planners, goalId)`**
Gets all tasks in a goal tree, sorted by dependencies.

---

## Complete Data Flow Diagram

```
INPUT
  │
  ├── planners: Planner[]  (tasks, goals, plans)
  ├── templates: EventTemplate[]  (recurring blocks)
  ├── previousCalendar: SimpleEvent[]  (existing events)
  └── config: CalendarGenerationConfig

  ▼

STEP 1: VALIDATION
  │
  ├── Validate required fields
  └── Return early if invalid

  ▼

STEP 2: PRESERVE PAST EVENTS
  │
  ├── Filter past events from previousCalendar
  ├── Exclude templates (regenerated)
  └── Exclude travel (recalculated)

  ▼

STEP 3: ADD FIXED-TIME EVENTS
  │
  ├── Add plan items (appointments)
  └── Add completed items

  ▼

STEP 4: EXPAND TEMPLATES
  │
  ├── expandTemplates() → SimpleEvents with RRule
  └── getPerTemplateMasks() → compact masks for slots

  ▼

STEP 5: BUILD LOCATION MAP
  │
  └── planner ID → location ID

  ▼

STEP 6: BUILD TIME SLOTS
  │
  ├── For each day:
  │   ├── Convert events to intervals
  │   ├── Convert masks to intervals
  │   ├── Find gaps (available time)
  │   ├── Apply buffers
  │   └── Create travel slots
  └── Store in availableSlots Map

  ▼

STEP 7: PREPARE SCHEDULING
  │
  ├── Calculate largestTemplateGap
  ├── Create SchedulingContext
  ├── Configure strategies (Earliest + Location)
  └── Create CompositeStrategy

  ▼

STEP 8: SCHEDULING LOOP
  │
  ├── Get candidates (tasks + ready goals)
  ├── Sort by urgency
  └── For each week until done:
      │
      ├── For each candidate:
      │   │
      │   ├── If TASK:
      │   │   ├── Check size (vs largestGap)
      │   │   ├── Find fitting slots
      │   │   ├── Score slots with strategy
      │   │   ├── Check capacity (task + travel + buffer)
      │   │   ├── Reserve slot
      │   │   └── Create SimpleEvent
      │   │
      │   └── If GOAL:
      │       └── Schedule child tasks in order
      │
      └── If candidates remain:
          └── Expand slots to next week

  ▼

STEP 9: GENERATE TRAVEL EVENTS
  │
  └── Convert travel slots to SimpleEvents

  ▼

STEP 10: DETECT TRESPASSING
  │
  └── Mark overlapping different-location events

  ▼

OUTPUT
  │
  ├── success: boolean
  ├── events: SimpleEvent[]  (complete calendar)
  ├── failures: SchedulingFailure[]
  └── metrics: SchedulingMetrics
```

---

## Key Gotchas and Edge Cases

### 1. Tasks vs Goals

- Tasks are scheduled directly
- Goals are containers - their child tasks are scheduled in dependency order
- `getSortedTreeBottomLayer()` extracts the actual tasks from a goal tree

### 2. The "afterTime" Parameter

When scheduling goal tasks, each task must come after the previous:

```typescript
let goalAfterTime: Date | undefined;
for (const task of goalTasks) {
  const res = scheduler.scheduleTask(task, goalAfterTime);
  if (res.success) {
    goalAfterTime = new Date(res.event.end); // Next task after this
  }
}
```

### 3. Travel Reuse

If existing travel already goes to the right destination, it's reused:

```typescript
const reusable = this.slotManager.findAdjacentTravelTo(
  slot.end,
  slot.nextLocationId,
);
if (reusable) {
  effectiveTravelAfter = 0; // Don't reserve new space
}
```

### 4. Week Expansion

If no slots found in current week, the system expands:

- Builds slots for next week
- Continues trying candidates
- Stops after MAX_WEEKS_TO_SEARCH (12 weeks)

### 5. Memoization

Events from `previousCalendar` that are past and non-template/non-travel are preserved and not re-scheduled.

### 6. Buffer Time Layout

Buffers separate items, not surround them:

```
[TRAVEL] [BUFFER] [TASK] [BUFFER] [FREE] [BUFFER] [TRAVEL]
```

---

## Debugging Tips

Enable logging in config:

```typescript
config: {
  enableLogging: true,
  logging: {
    metrics: true,
    failures: true,
    leanCalendar: true,  // Shows sorted events with locations
  }
}
```

Check `loggingUtils.ts` for available logging options.
