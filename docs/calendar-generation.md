# Calendar Generation Engine - Deep Dive

This document explains how the scheduling engine works, from input to final calendar output.

## Entry Point

The public API is `generateCalendar()` in `utils/calendar-generation/calendarGeneration.ts`. It accepts planners (tasks, goals, plans), event templates, previous calendar events, and optional configuration. It delegates to `CalendarGenerator.generate()` and returns an array of `SimpleEvent` objects.

## Architecture

The engine is split into four core classes, each with their own subfolder of extracted functions:

```
CalendarGenerator      (orchestrator)    -> CalendarGenerator/
    |
    ├── TimeSlotManager (slot state)     -> TimeSlotManager/
    ├── Scheduler       (task placement) -> Scheduler/
    └── TemplateExpander (recurring events)
```

**CalendarGenerator** runs a 12-phase pipeline. **TimeSlotManager** owns the available/occupied slot state and handles all travel time logic. **Scheduler** scores and places individual tasks into slots. **TemplateExpander** converts `EventTemplate` records into concrete recurring events using RRule.

## The 12-Phase Pipeline

### Phase 1: Input Validation
`CalendarGenerator/initialization/validateInput.ts`

Checks that the input has a valid userId and at least some data to work with. Returns validation failures if not.

### Phase 2: Build Initial Event Array
`CalendarGenerator/initialization/buildInitialEventArray.ts`

Collects events that are already placed and should not be moved:
- **Memoized events**: Events from the previous calendar that the user has manually positioned (identified by matching `completedStartTime`/`completedEndTime` on the planner).
- **Plan items**: Fixed-time appointments with a `starts` field.
- **Completed tasks**: Tasks where `completedStartTime` is set but don't have matching planners (orphaned completions).

These form the "occupied" baseline that the scheduler works around.

### Phase 3: Template Expansion
`CalendarGenerator/template-processing/expandTemplates.ts`

Each `EventTemplate` defines a recurring block (e.g., "Work" every Monday-Friday 9-17). The expander:
1. Builds an RRule for each template based on its day, start time, and duration.
2. Generates concrete occurrences from the current date forward (up to `maxDaysAhead`).
3. Produces `PerTemplateMask` objects that describe occupied intervals per template, used later to build available slots.
4. Tracks `largestTemplateGap` - the biggest gap between template events in a week. Tasks larger than this gap cannot be scheduled.

### Phase 4: Build Location Map
`CalendarGenerator/slot-building/buildLocationMap.ts`

Creates a `Map<string, string | null>` mapping each planner/template ID to its location ID. Tasks without an explicit location inherit their category's location. This map is used throughout scheduling to determine travel needs.

### Phase 5: Build Category Constraints
`CalendarGenerator/slot-building/buildCategoryConstraints.ts`

For each category with `timeSlots` defined, generates:
- **CategoryConstraint**: A function `canScheduleAtTime(date)` that returns whether a given time falls within the category's allowed windows.
- **Category periods**: Concrete time blocks for each category across the scheduling horizon, used for visualizing categories on the calendar and for travel injection.
- **Wrapper periods**: Category time windows formatted for the TimeSlotManager to understand strict/non-strict boundaries.

### Phase 6: Build Initial Slots
`CalendarGenerator/slot-building/buildInitialSlots.ts`

Calls `TimeSlotManager.buildDailySlots()` to create the initial set of available time slots. This works by:
1. Starting with a full day (midnight to midnight) for each day.
2. Subtracting all occupied intervals: template events, plan items, memoized events, completed tasks.
3. The result is a set of `TimeSlot` objects representing free time, keyed by day.

### Phase 7: Inject Category Travel
`CalendarGenerator/slot-building/injectCategoryTravel.ts`

At category boundaries (e.g., "Work" ending at 17:00, next event at a different location), travel time needs to be reserved. This phase:
1. Walks through category periods chronologically.
2. For each transition between locations, calculates travel time from the matrix.
3. Reserves travel slots at category boundaries so the scheduler doesn't place tasks in time that's needed for commuting.

### Phase 8: Prepare Scheduling Context
`CalendarGenerator/scheduling/prepareSchedulingContext.ts`

Builds a `SchedulingContext` object that the Scheduler and strategies use:
- Current date, user ID, week start day
- References to the slot manager and metrics
- Category constraint map (which categories allow scheduling when)
- Planner location map
- List of all currently scheduled events (for adjacency checks in strategies)

### Phase 9: Build Scheduling Strategy
`CalendarGenerator/scheduling/buildSchedulingStrategy.ts`

Creates a `CompositeStrategy` from the configured weights:
- **EarliestSlotStrategy** (default weight: 1.0) - Scores slots higher the earlier they are.
- **LocationGroupingStrategy** (default weight: 0.2) - Scores slots higher when adjacent events share the same location, reducing travel.

The composite strategy normalizes all scores into a weighted sum.

### Phase 10: Prepare Candidates
`CalendarGenerator/scheduling/prepareCandidates.ts`

Filters the input planners to find items that actually need scheduling:
- Excludes items that are already memoized (placed manually).
- Excludes completed items.
- Excludes goals that aren't marked as ready.
- Excludes plan items (they're fixed-time, already placed in Phase 2).
- Sorts remaining candidates by priority using `sortPlannersByPriority` (deadline urgency, then priority number).

### Phase 11: Schedule Tasks and Goals
`TaskSchedulingOrchestrator.scheduleTasksAndGoals()`

This is where the main scheduling loop runs. For each candidate:

1. **Validate** (`Scheduler/validation/validateTask.ts`): Check that the task has a valid duration and doesn't exceed the largest template gap.

2. **Find valid slots** (`Scheduler/slot-selection/findValidSlots.ts`):
   - Resolve the task's location (explicit, or inherited from category).
   - Call `TimeSlotManager.findAllFittingSlots()` to get all slots where the task's duration fits.
   - Filter by category constraints if the task belongs to a category with time windows.

3. **Select best slot** (`Scheduler/slot-selection/selectBestSlot.ts`):
   - Score each valid slot using the composite strategy.
   - Sort by score (highest first).
   - For each scored slot (starting with the best), calculate travel requirements:
     - Look at the event before and after this slot.
     - If locations differ, look up travel time from the matrix.
     - Check if existing travel can be reused (e.g., there's already a travel slot going to this location).
     - Check if standalone travel can be placed before/after the task.
     - Verify the slot has enough capacity for the task + travel + buffer.
   - Return the first slot that works.

4. **Reserve slot** (`Scheduler/reservation/reserveTaskSlot.ts`):
   - Calculate exact start/end times, accounting for travel-before offset.
   - Place standalone travel-before if needed.
   - Call `TimeSlotManager.reserveSlotWithTravel()` which splits the available slot and creates occupied entries for the task and any travel.

5. **Build event** (`Scheduler/event-creation/buildTaskEvent.ts`):
   - Create a `SimpleEvent` with the calculated times, colors, and extended properties.
   - If the task belongs to a category, wrap it with the category's ID for calendar display.

Goals are handled by scheduling their child tasks in dependency order.

### Phase 12: Assemble Final Events
`CalendarGenerator/finalization/assembleFinalEvents.ts`

Combines all events into the final output:
- Template events (from Phase 3)
- Pre-placed events (memoized, plans, completed - from Phase 2)
- Newly scheduled task events (from Phase 11)
- Travel events generated from occupied travel slots
- Category background events for calendar visualization

## TimeSlotManager Internals

The slot manager maintains two maps, both keyed by day string (`"2024-03-15"`):

- `availableSlots`: Free time intervals where tasks can be placed.
- `occupiedSlots`: Reserved intervals (tasks, templates, travel).

Each `TimeSlot` has:
```typescript
{
  start: Date;
  end: Date;
  durationMinutes: number;
  eventId?: string;
  eventType?: string;
  locationId?: string | null;
  travelFromLocationId?: string;
  travelToLocationId?: string;
  isInsufficientTravel?: boolean;
}
```

### Slot Reservation

When a task is placed, the available slot is split. If a 2-hour free slot exists from 10:00-12:00 and a 30-minute task is placed at 10:00, the slot becomes a 90-minute slot from 10:30-12:00, and a new occupied slot covers 10:00-10:30.

Travel slots work the same way but carry additional metadata (`travelFromLocationId`, `travelToLocationId`) that gets converted to travel events at the end.

### Helper Classes

- **SlotBuilder**: Constructs initial available slots by subtracting occupied intervals from full days.
- **SlotFinder**: Searches available slots for ones that fit a given duration, optionally filtered by category constraint.
- **SlotReserver**: Splits available slots and creates occupied entries when reserving time.
- **TravelManager**: Calculates travel times from the matrix, places standalone travel before/after tasks, handles insufficient travel (when there's not enough gap for full travel time), and manages reusable travel detection.
- **TravelConverter**: At the end of generation, converts all occupied travel slots into `SimpleEvent` objects.
- **CategoryContext**: Tracks category periods by day for location inheritance lookups.

## Travel Time System

Travel times are pre-calculated and stored in the database (not computed during scheduling). The matrix maps `(fromLocationId, toLocationId)` to travel durations with three time-of-day variants: rush hour, regular, and night.

During scheduling, travel is handled in two ways:

1. **Category boundary travel** (Phase 7): Reserved proactively at transitions between category time windows.
2. **Per-task travel** (Phase 11): Calculated when placing each task by looking at what's adjacent.

Travel events appear as separate blocks on the calendar showing origin, destination, and duration.

### Travel Placement Rules

- If the previous event is at Location A and the task is at Location B, travel-before is needed.
- If the task is at Location B and the next event is at Location C, travel-after is needed.
- If a travel slot already exists going to the right location (reusable travel), it's reused instead of creating a new one.
- If there's not enough gap for full travel time, an "insufficient travel" slot is created as a warning.

## Strategy System

Strategies score how well a task fits in a given slot. Each returns a value between 0.0 (terrible fit) and 1.0 (perfect fit). The `CompositeStrategy` multiplies each score by its weight and sums them.

### EarliestSlotStrategy

Simple: earlier slots score higher. Implemented as `1.0 - (minutesFromNow / totalSearchWindowMinutes)`.

### LocationGroupingStrategy

Looks at the events immediately before and after a candidate slot. Scores are based on location matching patterns:
- Both neighbors match the task's location: 0.95 (sandwich pattern, no travel needed)
- One matches, other end is open: 0.8
- Neither matches: 0.4

This causes the scheduler to cluster tasks at the same location, reducing travel events.

## Configuration

All tunable parameters are in `utils/calendar-generation/constants.ts`:

- `SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH` (90): How far ahead to look for slots.
- `SCHEDULING_CONFIG.MIN_SLOT_SIZE` (5): Ignore slots smaller than 5 minutes.
- `SCHEDULING_CONFIG.TRAVEL_SEARCH_WINDOW_MS`: How far to look for reusable adjacent travel.
- `LOCATION_CONFIG`: Rush hour / regular / night time boundaries for travel time lookups.
- `URGENCY_CONFIG`: Parameters for deadline-based priority sorting.

Strategy weights and scoring thresholds are in `strategies/defaultStrategy.ts`.

## Adding a New Strategy

1. Create a class implementing `SchedulingStrategy` in `utils/calendar-generation/strategies/`.
2. Implement `score(task, slot, context)` returning 0.0 to 1.0.
3. Add a weight in `strategies/defaultStrategy.ts`.
4. Register it in `CalendarGenerator/scheduling/buildSchedulingStrategy.ts`.
