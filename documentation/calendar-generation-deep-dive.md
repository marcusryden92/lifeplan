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
   - [TaskSchedulingOrchestrator](#taskschedulingorchestrator)
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

**Helper Classes:**

```
TaskSchedulingOrchestrator   Week-by-week scheduling loop
EventAssembler               Builds events (memoized, plan, completed, category, final assembly)
PrioritySorter               Sorts candidates by urgency and category constraints
LocationMapper               Builds planner -> location lookup map
```

---

## Entry Point: CalendarGenerator.generate()

Location: `utils/calendar-generation/core/CalendarGenerator.ts`

### Input Structure (CalendarGenerationInput)

```typescript
interface CalendarGenerationInput {
  userId: string;
  weekStartDay: number;            // 0-6 (Sunday-Saturday)
  templates: EventTemplate[];      // Recurring time blocks
  planners: Planner[];             // Tasks, goals, and plans to schedule
  previousCalendar: SimpleEvent[]; // Existing calendar events to preserve
  config?: CalendarGenerationConfig;
  categories?: Category[];         // Categories with time constraints
}
```

### Output Structure (SchedulingResult)

```typescript
interface SchedulingResult {
  success: boolean;
  events: SimpleEvent[];
  failures: SchedulingFailure[];
  metrics: SchedulingMetrics;
}
```

---

## Step-by-Step Execution Flow

CalendarGenerator delegates each phase to a dedicated subfunction. The orchestrator itself is ~255 lines and calls these imports:

```typescript
// Subfunctions imported by CalendarGenerator
import { validateInput }             from "./CalendarGenerator/initialization/validateInput";
import { buildInitialEventArray }    from "./CalendarGenerator/initialization/buildInitialEventArray";
import { expandTemplates }           from "./CalendarGenerator/template-processing/expandTemplates";
import { buildLocationMap }          from "./CalendarGenerator/slot-building/buildLocationMap";
import { buildCategoryConstraints }  from "./CalendarGenerator/slot-building/buildCategoryConstraints";
import { buildInitialSlots }         from "./CalendarGenerator/slot-building/buildInitialSlots";
import { prepareSchedulingContext }  from "./CalendarGenerator/scheduling/prepareSchedulingContext";
import { buildSchedulingStrategy }   from "./CalendarGenerator/scheduling/buildSchedulingStrategy";
import { prepareCandidates }         from "./CalendarGenerator/scheduling/prepareCandidates";
import { assembleFinalEvents }       from "./CalendarGenerator/finalization/assembleFinalEvents";
```

### Phase 1: Validation

```typescript
const validation = validateInput(input);
```

Checks that required fields exist, planners have durations, etc. Returns early with failures if invalid.

### Phase 2: Build Initial Event Array

```typescript
const { eventArray, memoizedEventIds } = buildInitialEventArray(
  input.userId, input.planners, input.previousCalendar, currentDate
);
```

Delegates to `EventAssembler` for three steps:

1. **Memoized events** -- past events from `previousCalendar` that are preserved (excluding templates and travel, which are regenerated)
2. **Plan events** -- fixed-time appointments (planners with `itemType === "plan"` and a `starts` field), converted directly to SimpleEvents
3. **Completed events** -- tasks with `completedStartTime` and `completedEndTime`, placed at their completed times

`memoizedEventIds` tracks which planners are already placed so they won't be re-scheduled.

### Phase 3: Expand Templates

```typescript
const { recurringTemplateEvents, perTemplateMasks, largestTemplateGap, updatedMetrics } =
  expandTemplates(input.userId, input.templates, this.weekStartDay, currentDate, maxDaysAhead, enableLogging, this.metrics);
```

1. `expandTemplates()` creates one SimpleEvent per template with an RRule for FullCalendar UI display
2. `getPerTemplateMasks()` creates compact "masks" for slot calculation -- a pattern describing which days/times each template blocks
3. `calculateLargestGap()` finds the biggest continuous free window in a typical week, used to pre-reject tasks that can never fit

**Template Mask Structure:**

```typescript
type PerTemplateMask = {
  templateId: string;
  title?: string;
  color?: string;
  locationId?: string | null;
  occurrences: TemplateDayDef[];   // Sparse list of weekdays with times
  startDateISO?: string;           // Anchor date for interval-based templates
  intervalDays?: number;           // Repeat every N days
};

type TemplateDayDef = {
  day: number;                     // 0-6 (Sunday-Saturday)
  times: TemplateTimeWithExceptions[];
};

type TemplateTimeWithExceptions = {
  startTime: string;               // "09:00"
  endTime: string;                 // "17:00"
  exceptions?: string[];           // ISO dates to skip
};
```

### Phase 4: Build Location Map

```typescript
const { locationMap, travelLocationMap } = buildLocationMap(input.planners, input.templates, input.categories || []);
```

Builds **two** separate location maps via `LocationMapper`:

- **`locationMap`** -- used for display and scheduling context. Resolves location with full inheritance: own location → parent chain → category location.
- **`travelLocationMap`** -- used exclusively for travel time calculation. Resolves location via own location and parent chain only. Category location fallback is intentionally excluded.

The reason for the split: a task can visually belong to a category with a default location, but should not generate travel events unless it has an explicit location assignment on the item or its ancestors. Category location is a soft organizational default, not a physical travel constraint.

**Resolution order for each item:**
1. Plan items always use their own `locationId` (no inheritance)
2. If item has `useParentLocation=false` and owns a `locationId`: use it
3. Walk up parent chain for nearest ancestor with a `locationId`
4. (`locationMap` only) Fall back to category location via `categoryId`
5. Return `null` ("Anywhere")

### Phase 5: Build Category Constraints

```typescript
const { categoryConstraintMap, categoryPeriodsStatic, wrapperPeriodsForManager } =
  buildCategoryConstraints(input.categories, currentDate, this.weekStartDay, maxDaysAhead);
```

Builds category constraint data used throughout scheduling:

- `categoryConstraintMap` -- `Map<categoryId, CategoryConstraint>` for the Scheduler to look up time constraints
- `categoryPeriodsStatic` -- concrete time periods (start/end dates) for category wrapper events on the calendar
- `wrapperPeriodsForManager` -- periods with locations for the SlotBuilder to split slots at category boundaries

Uses `buildCategoryConstraintMap()` and `generateCategorySlotPeriods()` from `buildCategoryConstraints.ts`.

### Phase 6: Build Initial Slots

```typescript
buildInitialSlots(
  this.slotManager, currentDate, 2, filteredEvents, perTemplateMasks,
  plannerLocationMap, wrapperPeriodsForManager, enableLogging
);
```

1. Clears any existing slots
2. Sets category periods on the slot manager (for boundary splits)
3. Calls `slotManager.buildDailySlots()` for 14 days (2 weeks)

For each day, the SlotBuilder:
- Starts with 24 hours available
- Subtracts time blocked by templates (using masks)
- Subtracts time blocked by existing events (plans, completed items)
- Splits slots at category boundaries (so category-constrained tasks fit precisely)
- Creates travel slots where locations change
- Applies buffer time between events
- Merges adjacent available slots

### Phase 7: Prepare Scheduling Context

```typescript
const context = prepareSchedulingContext(
  input.userId, currentDate, this.weekStartDay, input.planners,
  filteredEvents, this.slotManager, this.metrics, categoryConstraintMap, plannerLocationMap
);
```

Creates a `SchedulingContext` object passed to the Scheduler. Contains everything needed to make scheduling decisions. `scheduledEvents` is mutable -- new events get added as tasks are scheduled.

### Phase 8: Build Scheduling Strategy

```typescript
const strategy = buildSchedulingStrategy({
  travelTimeMatrix: input.config?.travelTimeMatrix,
  strategyWeights: input.config?.strategyWeights,
  locationGroupingScores: input.config?.locationGroupingScores,
  locationGroupingPenalties: input.config?.locationGroupingPenalties,
});
```

Creates a `CompositeStrategy` combining:
- **EarliestSlotStrategy** (default weight: 1.0) -- prefers earlier slots
- **LocationGroupingStrategy** (default weight: 0.2) -- minimizes travel, only added if travel time matrix is provided

### Phase 9: Prepare Candidates

```typescript
const candidates = prepareCandidates(input.planners, memoizedEventIds, currentDate);
```

Delegates to `PrioritySorter.sortByPriorityAndConstraints()`:

1. Filters to schedulable items: top-level goals (no parent, marked ready) and standalone tasks
2. Excludes already-memoized items
3. Sorts by: category-constrained items first, then by urgency score (highest first)

**Urgency Calculation** (from `sortPlannersByPriority.ts`):

```typescript
function calculateTaskUrgency(task, context): number {
  if (!task.deadline) {
    return task.priority * 0.3;   // No deadline = 30% of priority
  }

  const minutesUntilDeadline = (deadline - currentDate) / 60000;
  let timeRatio = minutesUntilDeadline / totalEstimatedTime;
  timeRatio = clamp(timeRatio, 0, 1);

  // Sigmoid curve - urgency ramps up as deadline approaches
  const sigmoid = 1 / (1 + Math.exp(-4 * (timeRatio - 0.7)));
  const urgencyMultiplier = 1 - sigmoid;
  const scaledUrgency = 0.3 + 0.7 * urgencyMultiplier;

  return task.priority * scaledUrgency;
}
```

### Phase 10: Schedule Tasks and Goals

```typescript
const scheduler = new Scheduler(this.slotManager, strategy, context);
const orchestrator = new TaskSchedulingOrchestrator(this.slotManager, scheduler, this.weekStartDay);
const schedulingResult = orchestrator.scheduleTasksAndGoals(
  input.planners, candidates, memoizedEventIds, largestTemplateGap,
  perTemplateMasks, context, plannerLocationMap
);
```

The `TaskSchedulingOrchestrator` runs a week-by-week loop. See [TaskSchedulingOrchestrator](#taskschedulingorchestrator) for details.

### Phase 11: Assemble Final Events

```typescript
const allEvents = assembleFinalEvents(
  input.userId, this.slotManager, context, categoryPeriodsStatic, plannerLocationMap
);
```

Delegates to `EventAssembler` for:

1. **Travel events** -- converts travel slots stored during scheduling into SimpleEvents via `TravelConverter`
2. **Category wrapper events** -- creates background events for category time periods (visual indicators on the calendar)
3. **Final assembly** -- combines scheduled events, travel events, and category wrappers
4. **Trespassing detection** -- marks overlapping events at different locations (physically impossible conflicts)

### Phase 12: Return Results

```typescript
return {
  success: schedulingResult.failures.length === 0,
  events: allEvents,
  failures: [...schedulingResult.failures],
  metrics: this.metrics,
};
```

---

## Core Classes In Detail

### CalendarGenerator

Location: `utils/calendar-generation/core/CalendarGenerator.ts`

Lightweight orchestrator (~255 lines) that delegates each phase to imported subfunctions. Has no private methods for scheduling logic -- everything is modularized.

**Subfunction directory structure:**

```
CalendarGenerator/
├── initialization/
│   ├── validateInput.ts           # Input validation
│   └── buildInitialEventArray.ts  # Memoized + plan + completed events
├── template-processing/
│   └── expandTemplates.ts         # Template expansion wrapper
├── slot-building/
│   ├── buildLocationMap.ts        # Planner -> location lookup
│   ├── buildCategoryConstraints.ts # Category constraint + period generation
│   └── buildInitialSlots.ts       # Initial 2-week slot building
├── scheduling/
│   ├── prepareSchedulingContext.ts # SchedulingContext creation
│   ├── buildSchedulingStrategy.ts # CompositeStrategy assembly
│   └── prepareCandidates.ts       # Candidate filtering + priority sorting
└── finalization/
    └── assembleFinalEvents.ts     # Travel events + category wrappers + trespassing
```

### TimeSlotManager

Location: `utils/calendar-generation/core/TimeSlotManager.ts`

Orchestrator (~378 lines) that delegates to five specialized helper classes:

```typescript
class TimeSlotManager {
  private availableSlots: Map<string, TimeSlot[]>;  // day key -> available slots
  private occupiedSlots: Map<string, TimeSlot[]>;   // day key -> occupied slots
  private bufferTimeMinutes: number;

  // Helper instances
  private travelManager: TravelManager;
  private slotBuilder: SlotBuilder;
  private slotFinder: SlotFinder;
  private slotReserver: SlotReserver;
}
```

**Helper class directory structure:**

```
TimeSlotManager/
├── builder/    SlotBuilder      - Builds available slots from events and templates
├── converter/  TravelConverter  - Converts travel slots to SimpleEvents
├── finder/     SlotFinder       - Finds slots that fit tasks with constraints
├── reserver/   SlotReserver     - Reserves slots and manages travel placement
└── travel/     TravelManager    - Travel time calculations and standalone travel reservation
```

**Key Methods:**

| Method | Description |
|--------|-------------|
| `buildAvailableSlots(...)` | Builds available slots for a single day |
| `buildDailySlots(...)` | Builds slots across multiple days |
| `findAllFittingSlots(duration, afterDate, maxDays, categoryConstraint?)` | Returns all slots that can fit a task of given duration |
| `reserveSlotWithTravel(...)` | Reserves a slot and places travel before/after |
| `setCategoryPeriods(periods)` | Sets category time periods for boundary splitting |
| `canPlaceStandaloneTravelBefore(travelEnd, minutes)` | Checks if travel can be placed outside a slot |
| `reserveStandaloneTravelBefore/After(...)` | Places travel outside a task's slot |
| `reserveInsufficientTravelBefore/After(...)` | Handles travel slots that don't have enough space |
| `generateTravelEvents(userId)` | Converts stored travel slots to SimpleEvents |
| `findAdjacentTravelTo(nearTime, toLocationId)` | Finds reusable travel going to a destination |

### TemplateExpander

Location: `utils/calendar-generation/core/TemplateExpander.ts`

Converts `EventTemplate` records into usable formats.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `expandTemplates(userId, templates, startDate, endDate)` | Creates one SimpleEvent per template with an RRule for recurrence |
| `getPerTemplateMasks(templates)` | Creates compact masks for slot calculation |
| `calculateLargestGap(templates)` | Finds the biggest continuous available window in a week |

Templates that cross midnight are split into two day definitions (e.g., "Sleep 22:00-06:00" becomes day N 22:00-24:00 and day N+1 00:00-06:00).

### Scheduler

Location: `utils/calendar-generation/core/Scheduler.ts`

Core scheduling engine (~117 lines) that places tasks into time slots using strategies. Tracks metrics (tasks attempted, scheduled, failed, timing).

The `scheduleTask()` method delegates to a 5-phase pipeline:

```
validateTask -> findValidSlots -> selectBestSlot -> reserveTaskSlot -> buildTaskEvent
```

**Subfunction directory structure:**

```
Scheduler/
├── validation/
│   └── validateTask.ts       # Checks task has valid duration
├── slot-selection/
│   ├── findValidSlots.ts     # Gets all fitting slots, optionally filtered by category constraint
│   └── selectBestSlot.ts     # Scores slots with strategy, calculates travel, picks best
├── reservation/
│   └── reserveTaskSlot.ts    # Reserves the selected slot with travel
├── event-creation/
│   └── buildTaskEvent.ts     # Creates the SimpleEvent output
└── scheduling/
    ├── scheduleTask.ts       # Orchestrates the 5-phase pipeline
    └── scheduleTasks.ts      # Batch scheduling of multiple tasks
```

**Slot Selection Detail** (from `selectBestSlot.ts`):

1. Score all valid slots using the CompositeStrategy
2. Sort by score (highest first), then start time (earliest) as tiebreaker
3. For each scored slot, calculate travel requirements:
   - **Travel before:** if `prevLocationId` differs from task location, check if a same-location adjacent task exists whose travel-after can be absorbed (sets `canAbsorbPrevTravel=true`, `needTravelBefore=0`). Otherwise calculate travel minutes.
   - **Travel after:** if `nextLocationId` differs from task location, calculate travel-after needed. Then check for reusable existing travel going to `nextLocationId` near slot end (`findAdjacentTravelTo`). If reusable travel found, `effectiveTravelAfter=0`.
4. Verify capacity:
   - Base required: `task.duration + bufferMinutes`
   - Add travel-after cost: `effectiveTravelAfter + bufferMinutes` (if non-zero)
   - Add travel-before cost: `needTravelBefore + bufferMinutes` only if it *cannot* be placed outside the slot
   - Bonus capacity: if absorbing previous task's travel-after, that travel's duration is added to effective slot capacity
5. Return the first slot where `slotDuration >= requiredInside`

### TaskSchedulingOrchestrator

Location: `utils/calendar-generation/helpers/scheduling/TaskSchedulingOrchestrator.ts`

Manages the week-by-week scheduling loop (~249 lines). This is the core scheduling loop that the CalendarGenerator delegates to.

**The scheduling loop:**

```
while candidates remain AND weeksSearched < MAX_WEEKS_TO_SEARCH:
    for each candidate (iterating backwards for safe removal):
        if TASK:
            - Check if already scheduled (skip)
            - Size check vs largestTemplateGap (permanent failure if too large)
            - Call scheduler.scheduleTask(task)
            - On success: record event, remove from candidates
            - On NO_SLOTS: keep in candidates (retry next week)
            - On other failure: permanent failure, remove from candidates

        if GOAL:
            - Get child tasks via getSortedTreeBottomLayer()
            - Filter out completed and already-scheduled tasks
            - Schedule each child task sequentially (each must come after the previous)
            - On NO_SLOTS for any child: break, retry whole goal next week

    if candidates remain:
        weeksSearched++
        Build slots for the next week via slotManager.buildDailySlots()
```

---

## Strategy System

Location: `utils/calendar-generation/strategies/`

### Overview

The scheduling system uses a **weighted composite strategy** approach where multiple scoring strategies are combined to determine the best time slot for each task. Default weights and configurations are defined in `defaultStrategy.ts`.

Task urgency/deadline prioritization is handled by `PrioritySorter` **before** slot scoring. Strategies only score available slots, they don't determine task order.

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
    return scores.bothMatch;          // Default: 0.95 - Perfect sandwich
  }
  if ((prevMatches && !nextExists) || (nextMatches && !prevExists)) {
    return scores.oneMatchOneOpen;    // Default: 0.8 - One match, one open
  }
  if (prevMatches || nextMatches) {
    return scores.oneMatch - penalty; // Default: 0.5 - penalty
  }
  if (!prevExists && !nextExists) {
    return scores.bothOpen;           // Default: 0.7 - Empty day
  }
  if (!prevExists || !nextExists) {
    return scores.oneOpenNoMatch - penalty; // Default: 0.45 - penalty
  }

  // Neither matches, both exist
  return scores.neitherMatch - penalty;    // Default: 0.4 - penalty
}
```

**Default Configuration (from `defaultStrategy.ts`):**

```typescript
DEFAULT_STRATEGY_WEIGHTS = {
  earliestSlot: 1.0,
  locationGrouping: 0.2,
};

DEFAULT_LOCATION_GROUPING_SCORES = {
  bothMatch: 0.95,
  oneMatchOneOpen: 0.8,
  oneMatch: 0.5,
  bothOpen: 0.7,
  oneOpenNoMatch: 0.45,
  neitherMatch: 0.4,
  noLocation: 0.5,
};

DEFAULT_LOCATION_GROUPING_PENALTIES = {
  maxSingleTravelPenalty: 0.02,
  maxDoubleTravelPenalty: 0.03,
  singleTravelPenaltyDivisor: 600,
  doubleTravelPenaltyDivisor: 400,
};
```

The location grouping weight is intentionally low (0.2) to act as a tie-breaker rather than a dominant factor. This prevents over-prioritizing weekend slots just because they have matching neighbors.

---

## Data Models

### TimeSlot

Location: `utils/calendar-generation/models/TimeSlot.ts`

```typescript
interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
  isAvailable: boolean;
  eventId?: string;
  eventType?: "task" | "goal" | "plan" | "template" | "travel";
  prevLocationId?: string | null;
  nextLocationId?: string | null;

  // Travel-specific fields
  travelFromLocationId?: string | null;
  travelToLocationId?: string | null;
  insufficientTravel?: boolean;
  requiredTravelMinutes?: number;
}
```

`TimeSlotUtils` provides static helpers: `getDurationMinutes`, `canFitDuration`, `doSlotsOverlap`, `mergeAdjacentSlots`, `splitSlot`, `occupySlot`, `createTravelSlot`, `isTravelSlot`, `reclaimTravelSlot`.

### SchedulingContext

```typescript
interface SchedulingContext {
  currentDate: Date;
  userId: string;
  weekStartDay: number;
  allPlanners: Planner[];
  scheduledEvents: SimpleEvent[];         // Mutable - events added here
  availableMinutesPerWeek: number;
  metrics: SchedulingMetrics;
  categoryConstraints?: Map<string, CategoryConstraint>;
  plannerLocationMap?: Map<string, string | null>;
}
```

### SchedulingFailure

```typescript
interface SchedulingFailure {
  taskId: string;
  taskTitle: string;
  reason: SchedulingFailureReason;  // TOO_LARGE | NO_SLOTS | INVALID_TASK | etc.
  details: string;
  context?: Record<string, unknown>;
}
```

### CategoryConstraint

```typescript
interface CategoryConstraint {
  id: string;
  name: string;
  color?: string | null;
  timeSlots: CategoryTimeSlot[];
  isStrict: boolean;
  locationId?: string | null;
}
```

---

## Travel Time System

### How Travel Works

1. **Location Map:** Each planner/template has an optional `locationId`. The `travelLocationMap` resolves this via own location and parent chain only (category fallback excluded — see Phase 4).
2. **Travel Matrix:** Maps `"fromLocationId->toLocationId"` to travel times
3. **Time Periods:** Rush hour, regular, night have different travel times

### Travel Time Lookup

Handled by `TravelManager`:

```typescript
getTravelTime(fromLocationId, toLocationId, timeOfDay): number {
  if (!fromLocationId || !toLocationId || fromLocationId === toLocationId) {
    return 0;
  }

  const entry = travelTimeMatrix.get(`${fromLocationId}->${toLocationId}`);
  if (!entry) return 0;

  const hour = timeOfDay.getHours();

  if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 19)) {
    return entry.rushHourMinutes;  // 7-9am, 4-7pm
  } else if (hour >= 22 || hour < 6) {
    return entry.nightMinutes;     // 10pm-6am
  } else {
    return entry.regularMinutes;
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
[TRAVEL: B -> C] (travel-after, anchored to end)
[Next Event @ Location C]
```

**Travel-before placement:** The Scheduler first checks if travel-before can be placed *outside* the slot (in the previous slot's free space via `canPlaceStandaloneTravelBefore`). Travel can start inside the buffer zone before a slot, not just within the slot's boundaries. If placement outside fails, falls back to including travel-before inside the slot.

**Travel shifting:** When a new task is added in the FREE SPACE, travel-after shifts forward to stay adjacent to the next event.

**Travel reuse:** If existing travel already goes to the right destination (checked via `findAdjacentTravelTo`), it's reused and no new travel space is reserved. The search window for adjacency is `bufferTime + 10 minutes` to allow some tolerance.

**Insufficient travel:** When there isn't enough space for the full required travel time, `reserveInsufficientTravelBefore/After` creates a travel slot marked with `insufficientTravel: true` and `requiredTravelMinutes` for the originally needed duration. These render in red on the calendar.

**Travel-before conflict removal:** When reserving a slot, `SlotReserver` automatically removes any existing travel going to the same destination that ends near the task's start time (within the search window). This handles the case where a task fills a gap that was previously bridged by travel.

**Previous travel absorption:** If a same-location task is scheduled adjacent to the current task's slot, and the previous task already has travel-after going away from that shared location, the `SlotReserver` can absorb (reclaim) that travel slot. This frees up the space and is reflected as additional effective capacity in slot selection.

**Pre-carved vs dynamic travel:** `SlotReserver` distinguishes travel created during slot-building (pre-carved category/gap travel, named `travel-gap-*` or `travel-insufficient-*`) from travel placed during task scheduling. When reclaiming absorbed travel, only pre-carved travel is removed — dynamic task-to-task travel is preserved.

**Force mode:** `reserveStandaloneTravelBefore/After` has a `force` parameter used for category-boundary travel. In force mode, travel is placed at full duration even if it overlaps available slots, and those overlapping slots are marked unavailable.

### "Anywhere" Tasks

Tasks with `locationId: null` are considered "Anywhere" -- they don't need travel:

- No travel-before needed
- No travel-after needed
- They're "transparent" for travel purposes -- the `prevLocationId` passes through unchanged

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
  timeSlots: TimeSlotDefinition[] | null;
  // Format: [{ days: [1,3,5], startTime: "08:00", endTime: "17:00" }, ...]
  // days: 0=Sunday, 1=Monday, ... 6=Saturday
  isStrict: boolean;
  locationId?: string | null;
  parentId?: string | null;
  userId: string;
}
```

### How Categories Work

1. **Time Slot Definition**: Categories can define specific time windows when their items should be scheduled
   - Example: "Work" category with weekday 9am-5pm slots
   - Example: "Exercise" category with Mon/Wed/Fri 6-7am slots

2. **Strict vs Non-Strict Mode**:
   - **Strict (`isStrict: true`)**: Only items from this category can occupy the defined time slots. Other tasks will be blocked from these times.
   - **Non-Strict (`isStrict: false`)**: Category items are preferred but other items can fill empty space. More flexible scheduling.

3. **Location Inheritance**: Items without a specific location inherit the category's location. The `buildLocationMap` function handles this by checking the planner's `categoryId` and falling back to the category's `locationId`.

4. **Visual Representation**: Categories appear as background events on the calendar, rendered using `CategoryWrapperEvent.tsx`. Generated by `EventAssembler.buildCategoryWrapperEvents()`.

### Integration with Scheduling

Categories affect the scheduling system in several concrete ways:

1. **Constraint Map**: `buildCategoryConstraints()` generates a `Map<categoryId, CategoryConstraint>` that the `SchedulingContext` carries. When `findValidSlots()` looks for slots, it can filter by `categoryConstraint` to only return slots within the category's defined time windows.

2. **Slot Boundary Splitting**: The `SlotBuilder` receives `wrapperPeriodsForManager` (category periods with locations) and splits available slots at category boundaries. This ensures category-constrained tasks fit precisely within their defined windows.

3. **Priority Sorting**: `PrioritySorter.sortByPriorityAndConstraints()` gives precedence to tasks with category constraints (they're scheduled first). This ensures constrained tasks get their preferred time windows before unconstrained tasks fill them.

4. **Location Inheritance**: Category locations flow into the `plannerLocationMap`, so travel calculations account for category-default locations.

### Example Use Cases

**Software Engineer's Schedule:**

```typescript
{
  name: "Deep Work",
  timeSlots: [
    { days: [1,2,3,4,5], startTime: "09:00", endTime: "12:00" }
  ],
  isStrict: true,
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
  isStrict: false,
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

**`startOfDay(date)` / `endOfDay(date)`**
Returns start/end of a day.

**`setTimeOnDate(date, timeString)`**
Sets a time string like "09:00" on a date.

### sortPlannersByPriority.ts

**`calculateTaskUrgency(task, context)`**
Computes urgency score based on deadline proximity using a sigmoid curve.

### goalPageHandlers.ts

**`getSortedTreeBottomLayer(planners, goalId)`**
Gets all leaf tasks in a goal tree, sorted by dependencies.

---

## Complete Data Flow Diagram

```
INPUT
  |
  +-- planners: Planner[]
  +-- templates: EventTemplate[]
  +-- previousCalendar: SimpleEvent[]
  +-- config: CalendarGenerationConfig
  +-- categories?: Category[]
  v

PHASE 1: VALIDATION  [validateInput]
  |
  +-- Validate required fields
  +-- Return early if invalid
  v

PHASE 2: BUILD INITIAL EVENTS  [buildInitialEventArray -> EventAssembler]
  |
  +-- Memoize past events (exclude templates + travel)
  +-- Add plan items (fixed-time appointments)
  +-- Add completed items
  v

PHASE 3: EXPAND TEMPLATES  [expandTemplates -> TemplateExpander]
  |
  +-- expandTemplates() -> SimpleEvents with RRule
  +-- getPerTemplateMasks() -> compact masks for slots
  +-- calculateLargestGap() -> max task duration check
  v

PHASE 4: BUILD LOCATION MAP  [buildLocationMap]
  |
  +-- planner/template ID -> location ID
  +-- Includes category location inheritance
  v

PHASE 5: BUILD CATEGORY CONSTRAINTS  [buildCategoryConstraints]
  |
  +-- categoryConstraintMap for Scheduler
  +-- categoryPeriodsStatic for wrapper events
  +-- wrapperPeriodsForManager for slot boundary splits
  v

PHASE 6: BUILD TIME SLOTS  [buildInitialSlots -> SlotBuilder]
  |
  +-- Set category periods on slot manager
  +-- For each day (14 days):
  |   +-- Convert events to intervals
  |   +-- Convert masks to intervals
  |   +-- Find gaps (available time)
  |   +-- Split at category boundaries
  |   +-- Apply buffers
  |   +-- Create travel slots
  +-- Store in availableSlots Map
  v

PHASE 7: PREPARE CONTEXT  [prepareSchedulingContext]
  |
  +-- Create SchedulingContext with category constraints
  v

PHASE 8: BUILD STRATEGY  [buildSchedulingStrategy]
  |
  +-- Create CompositeStrategy (Earliest + Location)
  v

PHASE 9: PREPARE CANDIDATES  [prepareCandidates -> PrioritySorter]
  |
  +-- Filter: top-level goals + standalone tasks
  +-- Sort: category-constrained first, then by urgency
  v

PHASE 10: SCHEDULING LOOP  [TaskSchedulingOrchestrator]
  |
  +-- For each week until done:
  |   +-- For each candidate:
  |   |   +-- If TASK:
  |   |   |   +-- Size check (vs largestGap)
  |   |   |   +-- Scheduler.scheduleTask():
  |   |   |       +-- validateTask
  |   |   |       +-- findValidSlots (+ category filter)
  |   |   |       +-- selectBestSlot (score + travel calc)
  |   |   |       +-- reserveTaskSlot
  |   |   |       +-- buildTaskEvent
  |   |   +-- If GOAL:
  |   |       +-- Get child tasks in dependency order
  |   |       +-- Schedule each sequentially
  |   +-- If candidates remain:
  |       +-- Expand slots to next week
  v

PHASE 11: ASSEMBLE FINAL EVENTS  [assembleFinalEvents -> EventAssembler]
  |
  +-- Generate travel SimpleEvents from stored travel slots
  +-- Generate category wrapper events
  +-- Combine all events
  +-- Mark trespassing events (location conflicts)
  v

OUTPUT
  |
  +-- success: boolean
  +-- events: SimpleEvent[]  (complete calendar)
  +-- failures: SchedulingFailure[]
  +-- metrics: SchedulingMetrics
```

---

## Key Gotchas and Edge Cases

### 1. Tasks vs Goals

- Tasks are scheduled directly
- Goals are containers -- their child tasks are scheduled in dependency order
- `getSortedTreeBottomLayer()` extracts the actual leaf tasks from a goal tree

### 2. The "afterTime" Parameter

When scheduling goal tasks, each task must come after the previous:

```typescript
let goalAfterTime: Date | undefined;
for (const task of goalTasks) {
  const res = scheduler.scheduleTask(task, goalAfterTime);
  if (res.success) {
    goalAfterTime = new Date(res.event.end);
  }
}
```

### 3. Travel Reuse and Absorption

**Reuse:** If existing travel already goes to the right destination, no new travel-after is needed:

```typescript
const reusable = slotManager.findAdjacentTravelTo(slot.end, slot.nextLocationId);
if (reusable) {
  effectiveTravelAfter = 0;
}
```

**Absorption:** If the previous task shares the same location, its outbound travel-after can be reclaimed. `selectBestSlot` detects this and sets `canAbsorbPrevTravel=true`. When `SlotReserver` executes, it removes that travel slot and expands the available window backward, so the absorbed travel minutes become usable capacity for the current task's slot.

### 4. Week Expansion

If no slots found in current week, the system expands:

- Builds slots for next week
- Continues trying candidates
- Stops after MAX_WEEKS_TO_SEARCH (constant from `constants.ts`)

### 5. Memoization

Events from `previousCalendar` that are past and non-template/non-travel are preserved and not re-scheduled.

### 6. Buffer Time Layout

Buffers separate items, not surround them:

```
[TRAVEL] [BUFFER] [TASK] [BUFFER] [FREE] [TRAVEL]
```

### 7. Category-Constrained Task Priority

Tasks with category constraints are scheduled first (via `PrioritySorter`) to ensure they get their preferred time windows before unconstrained tasks fill the available slots.

### 8. Standalone Travel Placement

Travel-before is preferentially placed *outside* the task's slot. The Scheduler checks via `canPlaceStandaloneTravelBefore` and only falls back to inside-slot placement when there's no room in the preceding slot.

---

## Debugging Tips

Enable logging via the config:

```typescript
config: {
  enableLogging: true,
  logging: {
    metrics: true,
    failures: true,
    leanCalendar: true,  // Sorted events with locations
  }
}
```

Check `loggingUtils.ts` for all available logging options. The `LoggingConfig` interface defines: `metrics`, `failures`, `finalEvents`, `travelDebug`, `templateInfo`, `planners`, `templates`, `locations`, `strategySettings`, `leanCalendar`.
