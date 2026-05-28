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
   - [Scheduling Loop (scheduleTasksAndGoals)](#scheduling-loop-scheduletasksandgoals)
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

**Helper modules (all under `helpers/<Name>/`, plain functions):**

```
scheduleTasksAndGoals  Candidate-pass loop with bounded horizon + incremental expansion
EventAssembler         Builds events (memoized, plan, completed, category wrappers, final list, trespass marking, border stamping)
PrioritySorter         Sorts candidates by urgency and category constraints
LocationMapper         Builds planner -> location lookup map
CalendarValidator      Input validation
TemplateExpander       Template -> SimpleEvents + per-template masks + per-day gap intervals
```

---

## Entry Point: CalendarGenerator.generate()

Location: `utils/calendar-generation/core/CalendarGenerator.ts`

### Input Structure (CalendarGenerationInput)

```typescript
interface CalendarGenerationInput {
  userId: string;
  weekStartDay: number; // 0-6 (Sunday-Saturday)
  templates: EventTemplate[]; // Recurring time blocks
  planners: Planner[]; // Tasks, goals, and plans to schedule
  previousCalendar: SimpleEvent[]; // Existing calendar events to preserve
  config?: CalendarGenerationConfig;
  categories?: Category[]; // Categories with time constraints
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

`CalendarGenerator.generate()` (~330 lines) delegates each phase to a function in `helpers/CalendarGenerator/`. The helpers are all flat — no nested subdirectories. Roughly:

```typescript
// utils/calendar-generation/helpers/CalendarGenerator/
import { validateInput } from "./validateInput";
import { buildInitialEventArray } from "./buildInitialEventArray";
import { expandTemplates } from "./expandTemplates";
import { buildLocationMap } from "./buildLocationMap";
import { buildPlannerCategoryMap } from "./buildPlannerCategoryMap";
import { prepareSchedulingContext } from "./prepareSchedulingContext";
import { buildSchedulingStrategy } from "./buildSchedulingStrategy";
import { prepareCandidates } from "./prepareCandidates";
import { assembleFinalEvents } from "./assembleFinalEvents";
import { buildLoggingLookups } from "./buildLoggingLookups";
import { emitDebugLog } from "./emitDebugLog";
```

### Phase 1: Validation

```typescript
const validation = validateInput(input);
```

Checks that required fields exist, planners have durations, etc. Returns early with failures if invalid.

### Phase 2: Build Initial Event Array

```typescript
const { eventArray, memoizedEventIds } = buildInitialEventArray(
  input.userId,
  input.planners,
  input.previousCalendar,
  currentDate,
);
```

Delegates to `EventAssembler` for three steps:

1. **Memoized events** -- past events from `previousCalendar` that are preserved (excluding templates and travel, which are regenerated)
2. **Plan events** -- fixed-time appointments (planners with `plannerType === "plan"` and a `starts` field), converted directly to SimpleEvents
3. **Completed events** -- tasks with `completedStartTime` and `completedEndTime`, placed at their completed times

`memoizedEventIds` tracks which planners are already placed so they won't be re-scheduled.

### Phase 3: Expand Templates

```typescript
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
  this.metrics,
);
```

1. `expandTemplates()` creates one SimpleEvent per template with an RRule for FullCalendar UI display
2. `getPerTemplateMasks()` creates compact "masks" for slot calculation -- a pattern describing which days/times each template blocks
3. `calculateLargestGap()` finds the biggest continuous free window in a typical week (legacy field; the entry-time too-large check now uses `maxEffectiveCapacityFor` in `helpers/Scheduler/capacityCheck.ts`, which additionally subtracts strict-category windows and applies a per-category window ceiling)

Also exposes a static `TemplateExpander.gapIntervalsForDay(masks, date)` helper that returns the day's gap intervals — used by the capacity-check module to compute per-task effective gaps.

**Template Mask Structure:**

```typescript
type PerTemplateMask = {
  templateId: string;
  title?: string;
  color?: string;
  locationId?: string | null;
  occurrences: TemplateDayDef[]; // Sparse list of weekdays with times
  startDateISO?: string; // Anchor date for interval-based templates
  intervalDays?: number; // Repeat every N days
};

type TemplateDayDef = {
  day: number; // 0-6 (Sunday-Saturday)
  times: TemplateTimeWithExceptions[];
};

type TemplateTimeWithExceptions = {
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  exceptions?: string[]; // ISO dates to skip
};
```

### Phase 4: Build Location Map

```typescript
const { locationMap, travelLocationMap } = buildLocationMap(
  input.planners,
  input.templates,
  input.categories || [],
);
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

### Phase 5: Filter Scheduled Categories

The `CalendarGenerator` constructor filters `input.categories` once and stores the result as `this.scheduledCategories: Category[]` — keeping only categories that have at least one `timeSlot` defined. This array is threaded through to slot building, the travel pass, and the event assembler.

A `Map<categoryId, Category>` is built lazily inside `prepareSchedulingContext` for the one consumer (`findValidSlots`) that needs id-based lookup; everywhere else, the array form is sufficient.

Each `Category.timeSlots` entry carries the recurring rule (`{ days, startTime, endTime }`) — no pre-expansion into concrete dated periods happens here. Downstream consumers expand a rule for a specific day on demand via the `expandSlotForDay` helper.

### Phase 6: Build Initial Slots

```typescript
// Phase 6a: Build available slots over the full scheduling timeline
const builtSlots = buildAvailableSlots({
  planners: input.planners,
  startDate: setTimeOnDate(currentDate, "00:00"),
  existingEvents: filteredEvents,
  templateMasks: perTemplateMasks,
  categories: categoriesList,
  plannerLocationMap,
  enableLogging,
});
this.slotManager.availableSlots.push(...builtSlots);

// Phase 6b: Carve travel slots in a separate pass after slot building
const carved = staticEventTravelPass(
  !!plannerLocationMap,
  categoriesList,
  this.slotManager.occupiedSlots,
  travelManager,
  this.bufferTimeMinutes,
  this.slotManager.availableSlots,
);
this.slotManager.availableSlots = carved;
```

`buildAvailableSlots` operates over the full scheduling horizon in one call and:

- Filters existing events to those overlapping the scheduling range
- Converts events and template masks to intervals (with locations)
- Inherits category location into locationless intervals that fall inside a category period (`inheritLocationFromCategoryPeriods`)
- Calls `findGaps` to compute the available time between occupied intervals
- Splits the resulting gaps at category boundaries and tags each fragment with `categoryId` / `isStrictCategory` / location handoff (`splitSlotsAtCategoryBoundaries`)

`staticEventTravelPass` then walks the slot list and carves `TravelSlot` entries wherever `prevLocationId !== nextLocationId`, with special-case bypass logic for slots tight against category boundaries.

### Phase 7: Prepare Scheduling Context

```typescript
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
const candidates = prepareCandidates(
  input.planners,
  memoizedEventIds,
  currentDate,
);
```

Delegates to `PrioritySorter.sortByPriorityAndConstraints()`:

1. Filters to schedulable items: top-level goals (no parent, marked ready) and standalone tasks
2. Excludes already-memoized items
3. Sorts by: category-constrained items first, then by urgency score (highest first)

**Urgency Calculation** (private helper inside `helpers/PrioritySorter/sortByPriorityAndConstraints.ts`):

```typescript
function calculateTaskUrgency(task, context): number {
  if (!task.deadline) {
    return task.priority * 0.3; // No deadline = 30% of priority
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
  largestTemplateGap,           // kept for diagnostics; capacity check uses maxEffectiveCapacityFor
  perTemplateMasks,
  plannerLocationMap,
  this.scheduledCategories,
  travelPassRecorder,
);
```

The scheduler internally calls `scheduleTasksAndGoals` (in `helpers/Scheduler/`), which runs the candidate-pass loop with bounded horizon + incremental expansion. See the "Scheduling Loop (scheduleTasksAndGoals)" section below for the loop's structure.

### Phase 11: Assemble Final Events

```typescript
const allEvents = assembleFinalEvents(
  input.userId,
  travelManager,
  context,
  categoriesList,
  schedulingStartDate,
  schedulingEndDate,
  plannerLocationMap,
);
```

The constraints + date range are forwarded to `EventAssembler.buildCategoryWrapperEvents`, which lazily expands the rules into concrete dated `CategoryPeriod` instances purely for rendering the calendar background blocks — those concrete period objects exist only here, not in the rest of the pipeline.

Delegates to `EventAssembler` for:

1. **Travel events** -- `travelManager.generateTravelEvents(userId)` merges multi-shard `TravelSlot`s into one `SimpleEvent` per logical travel
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

Lightweight orchestrator (~330 lines) that holds the lifecycle state (`TimeSlotManager`, `TravelManager`, `CompositeStrategy`, metrics, both recorders) and delegates each phase to a function in `helpers/CalendarGenerator/`. All helpers are flat — no nested subdirectories.

**Helper files (`helpers/CalendarGenerator/*.ts`):**

| File                          | Purpose                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `validateInput.ts`            | Wraps `helpers/CalendarValidator/validateGenerationInput` and shapes failures   |
| `buildInitialEventArray.ts`   | Memoized + plan + completed events from `helpers/EventAssembler/`               |
| `expandTemplates.ts`          | Template expansion via `helpers/TemplateExpander/` (returns events + masks + gap) |
| `buildLocationMap.ts`         | Planner/template → location resolution                                          |
| `buildPlannerCategoryMap.ts`  | Memoized planner → categoryId via parent-chain walk                             |
| `prepareSchedulingContext.ts` | Builds the `SchedulingContext` object                                           |
| `buildSchedulingStrategy.ts`  | Wires up the `CompositeStrategy`                                                |
| `prepareCandidates.ts`        | Filters root goals + tasks, sorts via `helpers/PrioritySorter`                  |
| `assembleFinalEvents.ts`      | Travel events + category wrappers + trespass marking + border stamping          |
| `buildLoggingLookups.ts`      | Builds `{ categoryById, eventTitleById }` shared by both recorders              |
| `emitDebugLog.ts`              | Final debug-log payload + `logCalendarDebugInfo` call                           |

### TimeSlotManager

Location: `utils/calendar-generation/core/TimeSlotManager.ts`

Minimal class (~22 lines) — really just a holder for the canonical mutable `slots` array plus `bufferTimeMinutes` and `currentDate`. Slots are a sorted, contiguous array of `Slot` (`AvailableSlot | OccupiedSlot | CategorySlot | TravelSlot`); helpers operate on it directly by reference.

```typescript
export class TimeSlotManager {
  slots: Slot[] = [];
  readonly bufferTimeMinutes: number;
  readonly currentDate: Date;
  clear(): void { this.slots.length = 0; }
}
```

All slot-building / fitting / reserving logic lives in `helpers/TimeSlotManager/*.ts` as plain functions that take the `slots: Slot[]` array (or a `TimeSlotManager` instance for access to `bufferTimeMinutes`) as an argument:

| File                                       | Purpose                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `buildAvailableSlots.ts`                   | Initial slot generation: events → intervals → gaps → category-tagged fragments. Includes `propagateAnywhereLocations` for null-location handoff |
| `splitSlotsAtCategoryBoundaries.ts`        | Splits gaps at category start/end and tags fragments with `categoryId` / `isStrictCategory` |
| `inheritLocationFromCategoryPeriods.ts`    | Inherits category location into null-location intervals that fall inside a category period |
| `expandSlotForDay.ts`                      | Expands a single recurring category timeSlot rule to a concrete dated period for one day |
| `findAllFittingSlots.ts`                   | Returns slots big enough for `duration + bufferMs`; optionally filtered by category   |
| `reserveSlotWithTravel.ts`                 | The big one — splits the chosen availSlot, places task + travels, handles absorb / reclaim / inbound+outbound removal |
| `dropPastAvailableSlots.ts`                | Filters out Available slots ending before `now` (Travels/Occupied/Category kept) |
| `deriveSchedulingHorizon.ts`               | Inferred horizon end for finalization                                     |
| `getDayAvailableMinutes.ts`                | (with internal `getDaySlots`) Quick metric used by debugging              |

Travel-related helpers (`canPlaceStandaloneTravelBefore`, `reserveStandaloneTravelBefore/After`, `reserveInsufficientTravel{Before,After}`, `findAdjacentTravel{From,To,PrecedingGap}`, `generateTravelEvents`, `dropUnreachableCategoryVisits`, `staticEventTravelPass`) live under `helpers/TravelManager/` instead and are accessed through the `TravelManager` class facade in `core/`.

### TemplateExpander

Location: `utils/calendar-generation/helpers/TemplateExpander/`

Module of plain functions (no class). Used by `helpers/CalendarGenerator/expandTemplates.ts` and `helpers/Scheduler/capacityCheck.ts`.

| Function                                                 | Purpose                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `expandTemplates(userId, templates, startDate, weekStartDay)` | Returns `{ events, failureCount }` — one RRule-bearing SimpleEvent per template   |
| `getPerTemplateMasks(templates)`                         | Compact day-of-week / startMinutes / endMinutes masks for slot calculation    |
| `calculateLargestGap(templates)`                         | Largest gap in a clean week, used as a coarse diagnostic                      |
| `gapIntervalsForDay(masks, date)`                        | Day's gap intervals — used by `capacityCheck.maxEffectiveCapacityFor` to compute per-task ceilings |

Templates that cross midnight are split into two intervals when the masks are constructed (e.g., "Sleep 22:00-06:00" becomes day N 22:00-24:00 and day N+1 00:00-06:00).

### Scheduler

Location: `utils/calendar-generation/core/Scheduler.ts`

Core scheduling engine (~160 lines) that places tasks into time slots using strategies. Holds the per-pass metrics (tasks attempted, scheduled, failed, average time).

The `scheduleTask()` instance method delegates to the 5-phase pipeline in `helpers/Scheduler/scheduleTask.ts`:

```
validateTask -> findValidSlots -> selectBestSlot -> reserveTaskSlot -> buildTaskEvent
```

**Helper files (`helpers/Scheduler/*.ts`), flat:**

| File                            | Purpose                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `validateTask.ts`               | Duration sanity check                                                            |
| `findValidSlots.ts`             | Calls `findAllFittingSlots` with the right category constraint                   |
| `selectBestSlot.ts`             | Scores slots with the strategy, calculates travel-before / -after, decides absorb / reclaim, picks the first candidate with enough effective capacity. Returns a `SlotSelectionResult` with `absorbableTravel: TravelShardSpan \| null` and `reclaimPrecedingGapTravel: TravelShardSpan \| null` |
| `reserveTaskSlot.ts`            | Computes `effectiveSlotStart` (from `absorbableTravel.travelStart` / `reclaimPrecedingGapTravel.travelStart` / `selectedSlot.start`) and `offsetToTaskStart` (per the buffer model), tries standalone travel-before, calls `reserveSlotWithTravel` |
| `buildTaskEvent.ts`             | Builds the `SimpleEvent` output                                                  |
| `scheduleTask.ts`               | The 5-phase pipeline itself                                                      |
| `scheduleTasks.ts`              | Batch scheduling (not currently called by the main flow)                         |
| `scheduleTasksAndGoals.ts`      | The candidate-pass loop with horizon expansion (see "Scheduling Loop" below)     |
| `scheduleSingleTask.ts`         | Goal-/task-dispatcher used by `scheduleTasksAndGoals` (early `TOO_LARGE` check)  |
| `scheduleGoal.ts`               | Per-child loop for goals, threading `goalAfterTime` through subtasks             |
| `expandSlots.ts`                | Horizon expansion at the `isFinal` pickup point — preserves earlier decisions, rebuilds the new chunk, re-runs static pass with `legTracker` replay |
| `capacityCheck.ts`              | `maxEffectiveCapacityFor(task, ...)` (TOO_LARGE early-out) and `largestCompatibleSlotForLargestTask` (watermark check) |
| `SchedulerRecorder.ts`          | Per-task decision/action trail recorder                                          |
| `schedulerMessages.ts`          | Centralized message strings for the recorder                                     |

**Slot Selection Detail** (from `selectBestSlot.ts`):

1. Score all valid slots using the CompositeStrategy
2. Sort by score (highest first), then start time (earliest) as tiebreaker
3. For each scored slot, calculate travel requirements:
   - **Travel before:** if `prevLocationId` differs from task location, check if a same-location adjacent task exists whose travel-after can be absorbed (sets `canAbsorbPrevTravel=true`, `needTravelBefore=0`). Otherwise calculate travel minutes.
   - **Travel after:** if `nextLocationId` differs from task location, calculate travel-after needed. Then check for reusable existing travel going to `nextLocationId` near slot end (`findAdjacentTravelTo`). If reusable travel found, `effectiveTravelAfter=0`.
4. Verify capacity:
   - Base required: `task.duration + bufferMinutes`
   - Add travel-after cost: `effectiveTravelAfter + bufferMinutes` (if non-zero)
   - Add travel-before cost: `needTravelBefore + bufferMinutes` only if it _cannot_ be placed outside the slot
   - Bonus capacity: if absorbing previous task's travel-after, that travel's duration is added to effective slot capacity
5. Return the first slot where `slotDuration >= requiredInside`

### Scheduling Loop (scheduleTasksAndGoals)

Location: `utils/calendar-generation/helpers/Scheduler/scheduleTasksAndGoals.ts`

Manages the candidate-pass scheduling loop with bounded horizon and incremental expansion.

**The scheduling loop:**

```
while candidates remain AND expansionsDone < MAX_WEEKS_TO_SEARCH:
    Publish per-iteration context state:
        - context.placementCutoffDate = computePlacementCutoff(slots)
          (= max placeable-slot end - PLACEMENT_BUFFER_DAYS;
          findAllFittingSlots and the watermark both honor it)

    Proactive watermark check (before attempting any candidate):
        - availableCount = count of Available slots in slot array
        - biggestRemaining = max candidate.duration
        - biggestFit = largestCompatibleSlotForLargestTask(...)
        if availableCount < LOW_SLOT_WATERMARK OR biggestFit < biggestRemaining:
            expandSlots(...); expansionsDone++; continue

    for each candidate (iterating backwards for safe removal):
        if TASK:
            - Skip if already scheduled
            - Check task.duration > maxEffectiveCapacityFor(task, ...)
              (category-aware TOO_LARGE — strict-category subtraction + per-category
              window ceiling; permanent failure if exceeded)
            - Call scheduler.scheduleTask(task)
            - On success: record event, remove from candidates
            - On NO_SLOTS: keep in candidates (retry after expansion)
            - On other failure: permanent failure, remove

        if GOAL:
            - Get child tasks via getSortedTreeBottomLayer()
            - Filter out completed / already-scheduled
            - Per-child capacity check (same maxEffectiveCapacityFor)
            - Schedule each child sequentially (each must come after the previous)
            - On NO_SLOTS for any child: break, retry whole goal after expansion

    if candidates remain (reactive backstop):
        expandSlots(...); expansionsDone++
```

`expandSlots` (in `helpers/Scheduler/expandSlots.ts`) finds the `isFinal`-flagged CategorySlot, preserves everything ending at or before its end, calls `buildAvailableSlots` for the new chunk with `startingLocationOverride` set to the preserved Cat's location, replays `legTracker` state from preserved Travels (skipping self-travels and deduping multi-shard travels by `travelId`), and re-runs `staticEventTravelPass` starting at the resumed Cat's index. The end-of-pass `markLastCategoryAsFinal` moves the marker to the new last Category.

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

### Slot Model

Location: `utils/calendar-generation/models/TimeSlot.ts`

`Slot` is a **sealed discriminated union** of four shapes, distinguished by `type`. The canonical slots array is `Slot[]`, sorted by start, contiguous (no gaps), non-overlapping. Helpers operate on it directly by reference and a final sort happens at the end of each `reserveSlotWithTravel` call.

```typescript
type Slot = AvailableSlot | OccupiedSlot | CategorySlot | TravelSlot;
type PlaceableSlot = AvailableSlot | CategorySlot;  // slots a task can land in

interface AvailableSlot {
  type: "available";
  start: Date; end: Date; durationMinutes: number;
  prevLocationId: string | null;   // location user is at when slot starts
  nextLocationId: string | null;   // location user is heading to when slot ends
}

interface OccupiedSlot {
  type: "occupied";
  start: Date; end: Date; durationMinutes: number;
  eventId: string;
  plannerType: PlannerType;        // plan / template / goal / task
  eventType: EventType;            // planner | template
  locationId?: string | null;      // present only for static-pass-built Occupieds
}

interface CategorySlot {
  type: "category";
  start: Date; end: Date; durationMinutes: number;
  categoryId: string;
  isStrictCategory: boolean;
  currentLocationId: string | null; // user's location while inside this category fragment
  prevLocationId: string | null;
  nextLocationId: string | null;
  // Optional state markers — only present on fragments that touch the original boundary
  trespassingStart?: boolean;       // travel-pass had to consume the category's head
  trespassingEnd?: boolean;         // travel-pass had to consume the category's tail
  isFinal?: boolean;                // pickup point for the next horizon expansion
}

interface TravelSlot {
  type: "travel";
  start: Date; end: Date; durationMinutes: number;
  eventId: string;                  // legacy single-shard identifier
  travelId?: string;                // multi-shard identifier — all shards of one logical travel share this
  eventType: EventType.travel;
  travelType: "preliminary" | "inbound" | "outbound";
  travelFromLocationId: string | null;
  travelToLocationId: string | null;
  insufficientTravel: boolean;
  requiredTravelMinutes: number;
  // Shard provenance (for unplan / restore-absorbed-range)
  originalType?: "available" | "category";
  originalSourceStart?: Date; originalSourceEnd?: Date;
  // ...one set of fields per originalType
  // Category fragment context (when travel was carved out of a category)
  categoryId?: string | null; isStrictCategory?: boolean;
}
```

**Multi-shard travels.** A single logical travel can span multiple slot fragments (e.g. a bleed-across-prev-current-next eats portions of three source slots). Each fragment is a `TravelSlot` with the same `travelId`. Helpers in `utils/timeSlotUtils.ts` work with the *span* abstraction instead of individual shards: `findTravelShardSpan` walks contiguous shards by `travelId`, `removeTravelSpanAt` / `removeTravelSpanByTravelId` remove every shard atomically, `unplanTravel` removes shards *and* restores the underlying Available/Category source.

**`TravelShardSpan`** is the value-typed handle the scheduler passes around to identify a logical travel:

```typescript
type TravelShardSpan = {
  travelId: string;
  startIdx: number; endIdx: number; shards: TravelSlot[];
  travelStart: Date; travelEnd: Date;       // aggregate geometry
  travelFromLocationId: string | null;
  travelToLocationId: string | null;
};
```

This is what flows through `SlotSelectionResult.absorbableTravel` and `SlotSelectionResult.reclaimPrecedingGapTravel` — the id is the source of truth for which travel to remove; the geometry is used to anchor the adjacent-availSlot lookup.

**Utility module:** `utils/timeSlotUtils.ts` exposes `getDurationMinutes`, `canFitDuration`, `doSlotsOverlap`, `splitSlot`, `occupySlot`, `createTravelSlot`, `createTravelShards`, `shardSourceFromAvailable / FromCategory`, `collectShardSources`, `findTravelShardSpan`, `removeTravelSpanAt`, `removeTravelSpanByTravelId`, `isTravelSlot`, `reclaimTravelSlot`, `unplanTravel`, `restoreAbsorbedRange`.

### SchedulingContext

```typescript
interface SchedulingContext {
  currentDate: Date;
  userId: string;
  weekStartDay: number;
  allPlanners: Planner[];
  scheduledEvents: SimpleEvent[];        // Mutable — events added here as tasks are placed
  metrics: SchedulingMetrics;            // Mutable — updated during scheduling
  categories?: Map<string, Category>;    // Built lazily inside prepareSchedulingContext
  plannerLocationMap?: Map<string, string | null>;
  plannerCategoryMap?: Map<string, string | null>;  // Resolved via parent-chain walk
  schedulerRecorder?: SchedulerRecorder | null;
  placementCutoffDate?: Date | null;     // Set per-iteration; suppresses placement in the tail PLACEMENT_BUFFER_DAYS
}
```

### SlotSelectionResult

```typescript
interface SlotSelectionResult {
  selectedSlot: PlaceableSlot;
  travelBefore: number;
  travelAfter: number;
  reusableTravelStart: Date | null;
  taskLocationId: string | null | undefined;
  absorbableTravel: TravelShardSpan | null;        // Identity-based — used by reserveSlotWithTravel
  reclaimPrecedingGapTravel: TravelShardSpan | null;
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

### Category (scheduling view)

The engine uses the Prisma `Category` type directly (`Category = Prisma.CategoryGetPayload<{ include: { timeSlots: true } }>`). The fields the scheduling code actually reads:

```typescript
type Category = {
  id: string;
  name: string;
  color: string | null;
  timeSlots: CategoryTimeSlot[];  // DB rows: { id, categoryId, days, startTime, endTime }
  isStrict: boolean;
  locationId: string | null;
  // ...plus icon, sortOrder, parentId, userId, createdAt, updatedAt — unused by scheduling
};
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

### Travel Slot Layout (Dynamic Placement)

Per the buffer model, a dynamic placement occupies a flush `[travel-before, task, travel-after]` unit inside its slot, with a leading + trailing buffer between the unit and each slot boundary:

```
[slot.start] [leading buf] [TRAVEL A→B] [TASK @ B] [TRAVEL B→C] [trailing buf] [slot.end]
```

No buffer between travel and task. The leftover-tail starts flush at the unit's trailing edge (`travelAfterEnd`, or `task.end` if no travel-after); the next placement in that leftover owns its own leading buffer, so consecutive units are separated by exactly one `bufferMs` gap (and recursion preserves the trailing-buffer rule).

**Standalone travel-before:** if `canPlaceStandaloneTravelBefore` finds room for travel-before in an earlier slot ending at `selectedSlot.start`, the standalone travel is reserved there, `effectiveTravelBefore = 0`, and the task lands flush at `slot.start` (the standalone travel's end is the leading boundary — no buffer is added at this slot's level).

**Travel reuse (after).** `findAdjacentTravelTo(slot.end, slotNextLoc)` looks for a `TravelShardSpan` whose `travelEnd` equals `slot.end` exactly. If found, `effectiveTravelAfter = 0` and the leftover-tail ends at the reused travel's start.

**Absorb-prev-travel (id-based).** When the previous unit's outbound travel can be absorbed (same-location adjacency, `selectBestSlot` calls `findAdjacentTravelFrom`), the `TravelShardSpan` flows through `SlotSelectionResult.absorbableTravel`. `reserveSlotWithTravel` removes the span by `travelId` via `removeTravelShards`, then extends the abutting `availSlot` back over the freed region (matched by exact-position: `availSlot.start === removed.spanEnd`, with a guard against producing a malformed slot).

**Reclaim preceding gap travel (id-based).** When a static-pass return-trip can be bypassed, the gap travel's `TravelShardSpan` flows through `SlotSelectionResult.reclaimPrecedingGapTravel` and the same pattern applies — remove by `travelId`, extend the abutting `availSlot` back, set `prevLocationId` to the gap travel's origin.

**Inbound / outbound travel removal:** when placing a fresh travel-before / travel-after, any pre-existing travel whose `end` equals `task.start` (inbound) or `slot.end` (outbound) and whose `travelToLocationId` matches is collected by `travelId` into a `Set` and then removed via `removeTravelShards`. Exact-position match, no tolerance window. Multi-shard handled naturally because we only need to find one shard of a span to identify it.

**Insufficient travel:** when there isn't enough space for the full required travel time, `reserveInsufficientTravelBefore/After` creates a travel slot marked with `insufficientTravel: true` and `requiredTravelMinutes` for the originally needed duration. These render in red on the calendar.

**Force mode:** `reserveStandaloneTravelBefore/After` accepts a `force` parameter used for category-boundary travel by the static pass. In force mode, travel is placed at full duration even if it overlaps available slots, and those overlapping slots are trimmed/marked accordingly.

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

1. **Constraint Map**: `prepareSchedulingContext` builds a `Map<categoryId, Category>` inline from `scheduledCategories` and stashes it on the `SchedulingContext`. When `findValidSlots()` looks for slots, it can filter by category to only return slots within the category's defined time windows.

2. **Slot Boundary Splitting**: `buildAvailableSlots` calls `splitSlotsAtCategoryBoundaries(scheduledCategories, gaps)`, which iterates day-by-day, lazily expands each category's recurring time-slot rules via `expandSlotForDay`, and splits the available slots at category start/end boundaries — tagging each fragment with its `categoryId`, `isStrictCategory`, and the right location handoff for travel calculation.

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

### helpers/PrioritySorter/sortByPriorityAndConstraints.ts

`sortByPriorityAndConstraints(allPlanners, goalsAndTasks, currentDate, plannerCategoryMap?)` — the public sort. Internally:
- `hasCategoryConstraint(item, allPlanners, plannerCategoryMap?)` — true if the item (or any descendant for goals) has an effective categoryId
- `calculateTaskUrgency(task, context)` — sigmoid-based urgency score over deadline proximity, scaled by `priority`

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

PHASE 5: FILTER SCHEDULED CATEGORIES  [CalendarGenerator constructor]
  |
  +-- scheduledCategories: Category[] (filtered for non-empty timeSlots)
  +-- Map<categoryId, Category> built inline in prepareSchedulingContext
      (no pre-expansion; rules expanded per-day on demand)
  v

PHASE 6: BUILD TIME SLOTS
  |
  +-- 6a: buildAvailableSlots (over full horizon)
  |   +-- Events + masks -> intervals
  |   +-- inheritLocationFromCategoryPeriods on null-location intervals
  |   +-- findGaps -> available slots
  |   +-- splitSlotsAtCategoryBoundaries (tag categoryId, fix location handoff)
  |
  +-- 6b: staticEventTravelPass
  |   +-- Walk slot chain, carve TravelSlots at location transitions
  |   +-- Direct-bypass / return-absorption for slots tight against categories
  |
  +-- Store in slotManager.availableSlots
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

PHASE 10: SCHEDULING LOOP  [scheduleTasksAndGoals]
  |
  +-- Per-iteration: publish context.placementCutoffDate (max placeable end - PLACEMENT_BUFFER_DAYS)
  +-- Proactive watermark: if availableCount < LOW_SLOT_WATERMARK
  |   OR biggestCompatibleSlot < biggestRemainingTask:
  |       expandSlots(...); continue
  +-- For each candidate (back-to-front for safe removal):
  |   +-- If TASK:
  |   |   +-- Capacity check: task.duration > maxEffectiveCapacityFor(...) -> permanent TOO_LARGE
  |   |   +-- Scheduler.scheduleTask():
  |   |       +-- validateTask
  |   |       +-- findValidSlots (+ category filter, placementCutoffDate)
  |   |       +-- selectBestSlot (score + travel calc + absorb/reclaim decisions)
  |   |       +-- reserveTaskSlot
  |   |       +-- buildTaskEvent
  |   |   +-- success: record event, remove from candidates
  |   |   +-- NO_SLOTS: keep in candidates, retry after expansion
  |   |   +-- other failure: permanent, remove
  |   +-- If GOAL:
  |       +-- getSortedTreeBottomLayer() -> leaf tasks in dep order
  |       +-- Per-child capacity check
  |       +-- Schedule each sequentially (afterTime chained between children)
  |       +-- NO_SLOTS for any child: break, retry whole goal after expansion
  +-- Reactive backstop: if candidates remain, expandSlots and loop
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

**Reuse:** If existing travel already goes to the right destination, no new travel-after is created:

```typescript
const reusable = travelManager.findAdjacentTravelTo(slot.end, slot.nextLocationId);
if (reusable) {
  effectiveTravelAfter = 0;
  // reusable is a TravelShardSpan; its travelStart caps the leftover-tail
}
```

**Absorption:** if the previous unit's outbound travel goes away from this task's location, it can be reclaimed. `selectBestSlot` calls `findAdjacentTravelFrom`, gets back a `TravelShardSpan`, and stores it as `absorbableTravel` in `SlotSelectionResult`. `reserveSlotWithTravel` then removes every shard by `travelId` (`removeTravelShards(occupiedSlots, absorbableTravel.travelId)`) and back-extends the abutting availSlot — identified by exact-position match against `removed.spanEnd`. The freed travel duration becomes usable capacity (`selectBestSlot` adds `spanDur` to `effectiveCapacity` when sizing the candidate).

### 4. Incremental Horizon Expansion

The initial slot horizon is bounded at `SCHEDULING_CONFIG.HORIZON_CHUNK_DAYS` (28 days). When the scheduler runs short of slots, `expandSlots` extends another chunk past the previous pickup point. Two triggers:

- **Proactive watermark**: before each candidate pass, if `availableCount < LOW_SLOT_WATERMARK` OR the biggest remaining task can't fit any compatible slot.
- **Reactive backstop**: after a full failed pass, if any candidates remain.

The pickup point is the `isFinal`-flagged CategorySlot set at the end of the previous static pass. Preserved slots keep their decisions; only the region past pickup is rebuilt. `legTracker` state is replayed from preserved Travels so round-trip detection works at the seam. The static pass resumes at the isFinal Cat's index — its deferred exit edge now sees the new region and plans the appropriate travel.

A trailing `PLACEMENT_BUFFER_DAYS` of the horizon is off-limits to dynamic placement, so the next expansion's resume has clean room to re-decide travels at the seam.

Stops after `MAX_WEEKS_TO_SEARCH` expansions.

### 5. Memoization

Events from `previousCalendar` that are past and non-template/non-travel are preserved and not re-scheduled.

### 6. Buffer Time Layout

A dynamic placement enforces a single buffer between the unit and each slot boundary. Travel is flush with the task (no buffer between them). The unit owns its leading + trailing buffers:

```
[slot.start] [leading buf] [TRAVEL] [TASK] [TRAVEL] [trailing buf] [slot.end]
```

When two placements end up in the same slot (via the leftover-tail), the second placement's leading buffer is the *only* buffer between them — no double-counting. Static placements (plans, templates, category-wrapper travel) are flush with their owning event and don't participate in the buffer model.

### 7. Category-Constrained Task Priority

Tasks with category constraints are scheduled first (via `PrioritySorter`) to ensure they get their preferred time windows before unconstrained tasks fill the available slots.

### 8. Standalone Travel Placement

Travel-before is preferentially placed _outside_ the task's slot. The Scheduler checks via `canPlaceStandaloneTravelBefore` and only falls back to inside-slot placement when there's no room in the preceding slot.

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

Check `loggingUtils.ts` for all available logging options. The `LoggingConfig` interface defines: `metrics`, `failures`, `finalEvents`, `travelDebug`, `templateInfo`, `planners`, `templates`, `locations`, `strategySettings`, `leanCalendar`, `staticEventTravelPass`, `dynamicScheduling`, `dateRangeStart`, `dateRangeEnd`.

Two structured recorder traces are most useful for debugging slot/travel issues:

- **`staticEventTravelPass`** dumps the per-slot decision/action trail from every static-pass run. Each iteration shows the slot being processed, the decision branches taken, the action emitted, and the slot-array end state. Multi-pass runs (initial preliminary + each expansion `resume@<date>`) are grouped by pass label.
- **`dynamicScheduling`** dumps the per-task decision/action trail from `scheduleTask`. Each task shows the candidate slots evaluated, capacity checks, location/travel logic, the placement, and the resulting end state.

Both honor `dateRangeStart`/`dateRangeEnd` to focus on a single day or week. Failed tasks always log regardless of range (failures often happen because nothing fit in the desired window, which is exactly the case you want to see).
