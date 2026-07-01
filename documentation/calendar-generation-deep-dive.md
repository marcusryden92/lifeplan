# Calendar Generation — Deep Dive

This document describes the `utils/calendar-generation/` engine: the code that turns the user's planners, templates, and previously persisted calendar into a fresh `{ events, categoryEvents, travelEvents, plannerScores }` payload on every regeneration.

The engine is a stateful pipeline. Read top-to-bottom; later sections assume the data structures and phase ordering established earlier.

> Scope. This is engine-only. Cross-cutting models that feed the engine (`Planner`, `EventTemplate`, `Category`, `Location`, `TravelTime`) are referenced where relevant but defined in `prisma/schemas/models/`.

---

## 1. High-Level Overview

`generateCalendar(...)` is a single-shot, deterministic transformation:

```
inputs:
  userId, weekStartDay,
  templates:       EventTemplate[]         (recurring weekly blocks)
  planners:        Planner[]               (tasks, goals, plans, etc.)
  previousCalendar:SimpleEvent[]           (so we can preserve memoized past)
  options:         GenerateCalendarOptions (travel matrix, categories, ...)

output:
  events:         SimpleEvent[]              // plans, scheduled tasks, completed, memoized
  categoryEvents: CategoryEvent[]            // materialized weekly category occurrences
  travelEvents:   TravelEvent[]              // travel blocks between scheduled items
  plannerScores:  Record<string, number>     // per-planner urgency scores (ephemeral, not persisted)
```

The pipeline is built on three central data structures:

- **The slot array** — a single mutable, time-sorted array (`TimeSlotManager.slots`) holding every minute of the scheduling horizon as a sealed union: `AvailableSlot | OccupiedSlot | CategorySlot | TravelSlot`.
- **The static-pass state machine** — walks the slot array in order and decides where to place travel between consecutive non-matching locations. Runs once preliminarily, then again at the seam after every incremental expansion.
- **The dynamic scheduler** — iterates priority-sorted candidate tasks/goals, scores remaining placeable slots, and reserves them (along with inbound/outbound travel) via splice.

The horizon is **bounded** (28 days initially, see [constants.ts:80](../utils/calendar-generation/constants.ts#L80)). As the scheduler runs out of room, [expandSlots](../utils/calendar-generation/helpers/Scheduler/expandSlots.ts) appends another chunk from a marked pickup point. A single Plan a year out no longer balloons the initial slot array.

---

## 2. Public Surface

### Entry point

[utils/calendar-generation/calendarGeneration.ts](../utils/calendar-generation/calendarGeneration.ts) exports `generateCalendar(userId, weekStartDay, templates, planners, prevCalendar, options)`. It is a thin wrapper that:

1. Normalizes the optional `bufferTimeMinutes`-as-number legacy arg into a `GenerateCalendarOptions` object.
2. Builds a `LoggingConfig` from local flags (see [Debugging](#13-debugging-the-engine)).
3. Constructs `new CalendarGenerator(weekStartDay, input).generate()` and returns the resulting `{ events, categoryEvents, travelEvents, plannerScores }`.

### Module exports

[index.ts](../utils/calendar-generation/index.ts) re-exports the public surface: `generateCalendar`, the core classes (`CalendarGenerator`, `TimeSlotManager`, `Scheduler`), the strategy interface + built-ins, the model types (`TimeSlot` union, `SchedulingResult`, `SchedulingContext`, `SchedulingFailure`, etc.), the `dateTimeService`, the validation helpers, and the shard-model utilities from `timeSlotUtils`.

### Tunable constants

All scheduling knobs live in [constants.ts](../utils/calendar-generation/constants.ts). The key ones:

| Constant | Value | Purpose |
| --- | --- | --- |
| `SCHEDULING_CONFIG.HORIZON_CHUNK_DAYS` | 28 | Days the initial slot build covers; each expansion appends another chunk of this size. |
| `SCHEDULING_CONFIG.LOW_SLOT_WATERMARK` | 100 | When the slot array has fewer Available slots than this, the scheduler triggers proactive expansion before the next placement attempt. |
| `SCHEDULING_CONFIG.PLACEMENT_BUFFER_DAYS` | 3 | Tail buffer at the trailing edge of the horizon where dynamic placement is suppressed. Leaves room for the next expansion's static-pass resume. |
| `SCHEDULING_CONFIG.MAX_DAYS_TO_SEARCH` | 90 | Hard cap on how far ahead the slot finder will look. |
| `SCHEDULING_CONFIG.MAX_WEEKS_TO_SEARCH` | 12 | Cap on expansion iterations in the outer scheduler loop. |
| `SCHEDULING_CONFIG.MAX_ITERATIONS` | 10000 | Safety net against infinite loops. |
| `SCHEDULING_CONFIG.MIN_SLOT_SIZE` | 5 | Smallest slot the geometry helpers will preserve. |
| `SCHEDULING_CONFIG.ADJACENT_TRAVEL_TOLERANCE_MS` | 10 min | Slack for matching adjacent travel slots (used by `findAdjacentTravel*`). |
| `SchedulingFailureReason` | enum | `TOO_LARGE`, `NO_SLOTS`, `ITERATION_LIMIT`, `DEPENDENCY_CONFLICT`, `INVALID_TASK`, `TEMPLATE_ERROR`. |

Strategy weights and scoring values live separately in [strategies/defaultStrategy.ts](../utils/calendar-generation/strategies/defaultStrategy.ts) (covered in [Section 10](#10-strategies)).

---

## 3. Models

### The TimeSlot Union

[models/TimeSlot.ts](../utils/calendar-generation/models/TimeSlot.ts) defines the sealed union that flows through the entire pipeline:

```
Slot = AvailableSlot | OccupiedSlot | CategorySlot | TravelSlot

AvailableSlot   { type:"available",  start, end, durationMinutes,
                  prevLocationId?, nextLocationId? }

OccupiedSlot    { type:"occupied",   start, end, durationMinutes,
                  eventId, plannerType, eventType, locationId? }

CategorySlot    { type:"category",   start, end, durationMinutes,
                  categoryId, isStrictCategory,
                  currentLocationId, prevLocationId, nextLocationId,
                  trespassingStart?, trespassingEnd?,
                  isFinal? }

TravelSlot      { type:"travel",     start, end, durationMinutes,
                  eventId, eventType:"travel",
                  travelFromLocationId, travelToLocationId,
                  travelType: "preliminary" | "inbound" | "outbound",
                  insufficientTravel,                  // red marker
                  overconstrained?,                    // yellow marker
                  requiredTravelMinutes,
                  consumedCategoryIds?,
                  // --- shard model ---
                  travelId?,
                  originalType?: "available" | "category",
                  originalSourceStart?, originalSourceEnd?,
                  originalCategoryId?, originalLocationId?,
                  originalIsStrictCategory?,
                  originalPrevLocationId?, originalNextLocationId? }
```

A few invariants worth internalizing:

- `locationId === null` on Occupied means **"Anywhere"**. Travel decisions propagate *through* an Anywhere event rather than ending at it.
- `AvailableSlot.prevLocationId` / `nextLocationId` represent the location the user is at when the gap begins / ends. They are the only thing the static pass needs to decide whether and where travel goes.
- `CategorySlot.currentLocationId` is the category's own location (the user is *at* the category's location during the interior). `prevLocationId` / `nextLocationId` describe the surrounding context.
- `isFinal` is a single-instance pickup marker for incremental expansion; at most one slot in the array carries it (see [Section 8](#8-incremental-horizon-expansion)).
- `PlaceableSlot = AvailableSlot | CategorySlot` — strategies only score, and dynamic tasks only land in, one of these two.

### Scheduling Models

[models/SchedulingModels.ts](../utils/calendar-generation/models/SchedulingModels.ts) carries the shape contracts between phases:

- `CalendarGenerationInput` — the typed input to `CalendarGenerator`.
- `CalendarGenerationResult` extends `SchedulingResult` with `categoryEvents` and `travelEvents` (the orchestrator's full output).
- `SchedulingContext` — the bag of state passed to every scheduling call: `currentDate`, `weekStartDay`, `allPlanners`, `scheduledEvents`, `metrics`, `categories` (Map), `plannerLocationMap`, `plannerCategoryMap`, the optional `schedulerRecorder`, and the per-iteration `placementCutoffDate` (tail buffer).
- `SlotSelectionResult` — what `selectBestSlot` hands to `reserveTaskSlot`. Crucially carries `absorbableTravel` and `reclaimPrecedingGapTravel` as `TravelShardSpan | null`, so removal is by identity (`travelId`), not heuristic time search.
- `SchedulingFailure` — `{ taskId, taskTitle, reason: SchedulingFailureReason, details, context? }`.

### Template Models

[models/TemplateModels.ts](../utils/calendar-generation/models/TemplateModels.ts) defines `PerTemplateMask` — the normalized form templates take after expansion. `endMinutes` may exceed 1440 for midnight-crossing templates; downstream helpers handle the wrap.

---

## 4. The 11 Phases (CalendarGenerator)

[core/CalendarGenerator.ts](../utils/calendar-generation/core/CalendarGenerator.ts) is the orchestrator. Each phase delegates to a single function in [helpers/CalendarGenerator/](../utils/calendar-generation/helpers/CalendarGenerator/).

### Phase 1 — Validate input

[validateInput.ts](../utils/calendar-generation/helpers/CalendarGenerator/validateInput.ts) runs `validateGenerationInput` from the [CalendarValidator](../utils/calendar-generation/helpers/CalendarValidator/) module. On failure, returns immediately with `success: false` and empty arrays. Validation covers required fields (`userId`, `weekStartDay 0–6`), per-planner constraints (duration > 0 unless goal, `duration ≤ MINUTES_PER_WEEK`, valid deadline, plan items have `starts`), per-template constraints (`startDay 0–6`, `startTime "HH:MM"`, `duration ≤ MINUTES_PER_DAY`), and same-day template conflict detection.

### Phase 2 — Build initial event array

[buildInitialEventArray.ts](../utils/calendar-generation/helpers/CalendarGenerator/buildInitialEventArray.ts) combines three sources into a single `eventArray`:

1. **Memoized events** ([buildMemoizedEvents](../utils/calendar-generation/helpers/EventAssembler/buildMemoizedEvents.ts)) — items from `previousCalendar` whose start is before `now` and aren't templates/travel/category wrappers. Preserved verbatim.
2. **Plan events** ([buildPlanEvents](../utils/calendar-generation/helpers/EventAssembler/buildPlanEvents.ts)) — `Planner` rows with `plannerType: "plan"` and a `starts` timestamp, converted to `SimpleEvent` shape, minus already-memoized rows.
3. **Completed events** ([buildCompletedEvents](../utils/calendar-generation/helpers/EventAssembler/buildCompletedEvents.ts)) — tasks/goals with `completedStartTime`/`completedEndTime` set, rendered at their actual completion window (not the originally-scheduled window).

Returns `{ eventArray, memoizedEventIds }`. The ID set is used downstream to prevent the scheduler from re-scheduling already-frozen rows.

### Phase 3 — Expand templates

[expandTemplates.ts](../utils/calendar-generation/helpers/CalendarGenerator/expandTemplates.ts) wraps the [TemplateExpander](../utils/calendar-generation/helpers/TemplateExpander/) module:

- `expandTemplates` materializes each `EventTemplate` into recurring `SimpleEvent` blocks across the horizon.
- `getPerTemplateMasks` produces `PerTemplateMask[]` (one mask per day-of-week occurrence) — the normalized form the slot builder consumes.
- `calculateLargestGap` computes the single largest contiguous gap in a clean week. Used by old `TOO_LARGE` heuristics; see [capacityCheck](#9-capacity-gating--placement-buffer) for the current, more accurate gate.
- `gapIntervalsForDay` returns the unoccupied intervals for any specific day, accounting for midnight-crossing templates via `endDayOffset`.

Returns `{ filteredEvents, recurringTemplateEvents, perTemplateMasks, largestTemplateGap, updatedMetrics }`.

### Phase 4 — Build location and category maps

Two read-only derivations against the planner tree, computed before any slot work:

- [buildLocationMap.ts](../utils/calendar-generation/helpers/CalendarGenerator/buildLocationMap.ts) wraps [LocationMapper/buildLocationMap.ts](../utils/calendar-generation/helpers/LocationMapper/buildLocationMap.ts). Resolution order per planner: **(1)** own `locationId` (unless `useParentLocation`), **(2)** ancestor chain via `parentId`, **(3)** the planner's effective category's `locationId`.
- [buildPlannerCategoryMap.ts](../utils/calendar-generation/helpers/CalendarGenerator/buildPlannerCategoryMap.ts) resolves each planner's effective categoryId by walking the parent chain, with memoization (O(n) overall even for deep trees).

### Phase 5 — Filter scheduled categories

Inside the `CalendarGenerator` constructor, `input.categories` is filtered down to those that both **opt in** via `useTimeWindows: true` **and** have at least one window in `timeSlots`. This `scheduledCategories` list is what constrains slot geometry and the static pass; categories that don't meet both conditions still contribute location inheritance via the planner location map, but their windows and strictness do not affect scheduling.

### Phase 6 — Build slots + run preliminary travel pass

This is the most consequential phase. It happens in three sub-steps:

**6a. Build available slots.** [buildAvailableSlots](../utils/calendar-generation/helpers/TimeSlotManager/buildAvailableSlots.ts) produces the initial slot array covering `[today, today + HORIZON_CHUNK_DAYS]`:

1. Filter events/templates inside the horizon.
2. [inheritLocationFromCategoryPeriods](../utils/calendar-generation/helpers/TimeSlotManager/inheritLocationFromCategoryPeriods.ts) — for any Occupied interval fully inside a category period that has a location, stamp the category's location onto the interval so subsequent splits propagate location through it.
3. Find gaps between Occupied intervals → `AvailableSlot[]`.
4. [splitSlotsAtCategoryBoundaries](../utils/calendar-generation/helpers/TimeSlotManager/splitSlotsAtCategoryBoundaries.ts) — slice Available slots wherever a category period begins or ends. Inside a category window the fragment becomes a `CategorySlot`; outside it remains `AvailableSlot`. An entry-location cursor threads each split's `prevLocationId` / `nextLocationId`.
5. Propagate "Anywhere" locations forward (`prevLocationId`) and backward (`nextLocationId`) through the array, so a gap surrounded by located events inherits both ends.
6. Sort the unified slot array by start time.

**6b. Static travel pass.** `timeSlotManager.slots = [...builtSlots]`, then [staticEventTravelPass](../utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/staticEventTravelPass.ts) runs. See [Section 7](#7-the-static-travel-pass).

**6c. Drop past Available slots.** [dropPastAvailableSlots](../utils/calendar-generation/helpers/TimeSlotManager/dropPastAvailableSlots.ts) removes Available gaps ending at or before `currentDate`. Past Travel, Occupied, and Category slots remain (for memoized rendering).

### Phase 7 — Build the dynamic scheduling recorder

[SchedulerRecorder](../utils/calendar-generation/helpers/Scheduler/SchedulerRecorder.ts) is constructed with the same filter pattern as `TravelPassRecorder`: off unless `enableLogging && logging.dynamicScheduling`, optionally scoped to `[dateRangeStart, dateRangeEnd]`. Every `scheduleTask` call appends a record.

### Phase 8 — Prepare scheduling context

[prepareSchedulingContext.ts](../utils/calendar-generation/helpers/CalendarGenerator/prepareSchedulingContext.ts) packs everything into a single `SchedulingContext` object: current date, week start, planners, scheduled events, metrics, the `Category` lookup map, both planner→location and planner→category maps, and the scheduler recorder.

### Phase 9 — Prepare candidates

Urgency scoring runs once at the top of `CalendarGenerator.execute()` — before validation, before this phase — via [scoreCandidatesAndRootGoals](../utils/calendar-generation/helpers/PrioritySorter/sortByPriorityAndConstraints.ts). The pass covers scheduling candidates (standalone tasks + ready root goals) **plus every top-level uncompleted goal**, so consumers like the dashboard can rank goals the scheduler intentionally skipped (e.g. not-yet-ready ones) using the same denominator (sum of all planner durations). The resulting map is returned in `plannerScores` and passed into this phase.

Scoring itself: tasks without a deadline get `MIN_URGENCY_MULTIPLIER * priority`; tasks with a deadline use a sigmoid over deadline proximity (parameters in `URGENCY_CONFIG`: `CURVE_STEEPNESS: 4`, `CRITICAL_THRESHOLD: 0.7`, scaled into `[URGENCY_SCALE_MIN, URGENCY_SCALE_MAX] = [0.3, 1.0]`).

[prepareCandidates.ts](../utils/calendar-generation/helpers/CalendarGenerator/prepareCandidates.ts) returns the ordered list of planners the scheduler will try:

- Excludes memoized rows.
- Keeps only ready root goals and all tasks.
- Sorts via [sortByPriorityAndConstraints](../utils/calendar-generation/helpers/PrioritySorter/sortByPriorityAndConstraints.ts) — two-tier sort: category-constrained items first (because they have fewer eligible slots), then by descending **urgency score** looked up from the precomputed map. Urgency is not a strategy; it is decided here before any slot scoring.

### Phase 10 — Schedule tasks and goals

Constructs `new Scheduler(timeSlotManager, travelManager, strategy, context)` and calls `scheduleTasksAndGoals(...)`. See [Section 8](#8-incremental-horizon-expansion) for the outer loop; see [Section 6](#6-the-dynamic-scheduling-pipeline) for the per-task pipeline.

### Phase 11 — Assemble final events

[assembleFinalEvents.ts](../utils/calendar-generation/helpers/CalendarGenerator/assembleFinalEvents.ts) produces the three output arrays (a fourth output, `plannerScores`, comes from the Phase 9 scoring pass — see above):

- **`events`** — memoized + plan + completed + scheduled tasks + templates, with trespass flags stamped via [markTrespassingEvents](../utils/calendar-generation/helpers/EventAssembler/markTrespassingEvents.ts) and template events filtered out at the end via [assembleFinalEventList](../utils/calendar-generation/helpers/EventAssembler/assembleFinalEventList.ts).
- **`categoryEvents`** — [buildCategoryEvents](../utils/calendar-generation/helpers/EventAssembler/buildCategoryEvents.ts) materializes one `CategoryEvent` per `CategoryTimeWindow` per matching day across the horizon. IDs are composite: `` `${categoryTimeWindowId}|${YYYY-MM-DD-local}` ``. [stampCategoryEventBorders](../utils/calendar-generation/helpers/EventAssembler/stampCategoryEventBorders.ts) propagates `trespassingStart` / `trespassingEnd` flags from category slots and insufficient-travel slots onto the persisted rows.
- **`travelEvents`** — [generateTravelEvents](../utils/calendar-generation/helpers/TravelManager/generateTravelEvents.ts) merges contiguous shards of each logical travel back into a single `TravelEvent`, keyed by `travelId`.

The horizon for category wrapper expansion is re-derived from the final slot array via [deriveSchedulingHorizon](../utils/calendar-generation/helpers/TimeSlotManager/deriveSchedulingHorizon.ts); the latest slot's end is used, so wrappers extend with any expanded chunks.

---

## 5. Slot Building & Geometry

### Single mutable array

[TimeSlotManager](../utils/calendar-generation/core/TimeSlotManager.ts) is intentionally thin (~22 lines). Its only job is to hold the canonical `slots: Slot[]` array, sorted by start time. All geometry helpers operate on this array directly via `splice`. There is no per-day bucketing; filter by `slot.type` for kind-specific views.

### Buffer model for dynamic placement

The buffer rule is "**each unit owns its own leading and trailing buffer; travel sits flush against the task**". Inside a slot a dynamic placement looks like:

```
[slot.start] [leading buffer] [travel-before] [task] [travel-after] [trailing buffer] [slot.end]
```

Three special cases:

- If `selectBestSlot` discovers travel-before fits **standalone** in an earlier slot (via [canPlaceStandaloneTravelBefore](../utils/calendar-generation/helpers/TravelManager/canPlaceStandaloneTravelBefore.ts)), the task lands flush at `slot.start` — the standalone travel's end becomes the leading boundary and the earlier slot owns the buffer.
- If no travel-before is needed, the leading buffer still applies.
- Leftover slots after splicing are created flush with the unit's edges (no `+bufferMs` offset). The recursive "each placement owns its own buffer" rule yields exactly one buffer of separation between consecutive dynamic placements in the same slot, with no double-counting.

Static placements (plans, templates, category-wrapper travel) are always flush with their owning event; the buffer model only applies to dynamic tasks.

### Geometry helpers

[helpers/TimeSlotManager/](../utils/calendar-generation/helpers/TimeSlotManager/):

- `buildAvailableSlots` — initial 28-day slot build (see Phase 6a). Accepts a `startingLocationOverride` used at expansion seams.
- `splitSlotsAtCategoryBoundaries` — carve Available at category period edges; outside-fragments stay Available, inside-fragments become CategorySlots; threads entry-location across fragments.
- `inheritLocationFromCategoryPeriods` — stamp categories' locations onto Occupied intervals fully inside their windows.
- `expandSlotForDay` — resolve a single `CategoryTimeWindow` to concrete bounds for a given day. Handles overnight slots by adding 24h when `endTime ≤ startTime`.
- `findAllFittingSlots` — return all `PlaceableSlot[]` where `task.duration + bufferTimeMinutes` fits, respecting the task's category constraint and the per-iteration `placementCutoffDate`. Strict categories with a different categoryId are filtered out for uncategorized tasks too.
- `reserveSlotWithTravel` — atomic placement: removes any absorbed/reclaimed travel shards by `travelId`, splices in `[travel-before?, task, travel-after?]`, and reconstructs leftover Available/Category fragments via [restoreAbsorbedRange](../utils/calendar-generation/utils/timeSlotUtils.ts).
- `dropPastAvailableSlots` — strip Available slots ending ≤ `now`.
- `deriveSchedulingHorizon` — return the latest end across all slots (or a fallback). Used for category-wrapper materialization so expansion extends the wrappers too.
- `getDayAvailableMinutes` / `getDaySlots` — sum or list placeable slots overlapping a given day.

---

## 6. The Dynamic Scheduling Pipeline

[helpers/Scheduler/](../utils/calendar-generation/helpers/Scheduler/) implements a 5-phase per-task pipeline plus loop drivers.

### Per-task pipeline (`scheduleTask`)

[scheduleTask.ts](../utils/calendar-generation/helpers/Scheduler/scheduleTask.ts) runs the following for each candidate:

1. **`validateTask`** — `task.duration > 0`. On fail: `INVALID_TASK`.
2. **`findValidSlots`** — resolves the task's effective location (`plannerLocationMap`) and category (`plannerCategoryMap` or `task.categoryId`), then calls `findAllFittingSlots`. Returns `{ validSlots, fittingSlots, taskLocationId, constraintForTask }`. On empty: `NO_SLOTS`.
3. **`selectBestSlot`** — scores valid slots via the strategy, then walks candidates in descending score order. For each, computes travel-before / travel-after, inspects whether prior travel can be **absorbed** ([findAdjacentTravelFrom](../utils/calendar-generation/helpers/TravelManager/findAdjacentTravels.ts)) or a **preceding-gap return trip** can be **reclaimed** ([findPrecedingGapTravel](../utils/calendar-generation/helpers/TravelManager/findAdjacentTravels.ts)), and tests whether the effective slot capacity (extended over absorbable/reclaimable spans) can fit `requiredInside`. Accepts the first slot that fits. Returns a `SlotSelectionResult` carrying any `absorbableTravel: TravelShardSpan | null` and `reclaimPrecedingGapTravel: TravelShardSpan | null`.
4. **`reserveTaskSlot`** — computes the actual `taskStart` / `taskEnd` (accounting for buffer offset, standalone-before placement, and slot-start vs slot-interior position), opportunistically reserves a standalone travel-before if available, then calls `reserveSlotWithTravel` to perform the atomic splice. Absorb / reclaim shard removal is by `travelId` (no time-window search).
5. **`buildTaskEvent`** — constructs the `SimpleEvent`. If the placement falls inside a category window, the category's wrapper ID is attached for renderer grouping. Appends to `context.scheduledEvents` so subsequent placements see it.

### Outer loop (`scheduleTasksAndGoals`)

[scheduleTasksAndGoals.ts](../utils/calendar-generation/helpers/Scheduler/scheduleTasksAndGoals.ts) drives candidates to convergence.

- Per iteration: compute `placementCutoffDate = lastPlaceableSlotEnd − PLACEMENT_BUFFER_DAYS`.
- **Proactive expansion check**: count Available slots. Trigger [expandSlots](../utils/calendar-generation/helpers/Scheduler/expandSlots.ts) if either:
  - `availableCount < LOW_SLOT_WATERMARK`, **or**
  - The largest compatible slot for the biggest remaining task is smaller than that task's duration ([largestCompatibleSlotForLargestTask](../utils/calendar-generation/helpers/Scheduler/capacityCheck.ts)).
  - Then `continue` (skip the forward pass and re-check on the expanded array).
- **Forward pass**: walk candidates in reverse, calling [scheduleSingleTask](../utils/calendar-generation/helpers/Scheduler/scheduleSingleTask.ts) for tasks and [scheduleGoal](../utils/calendar-generation/helpers/Scheduler/scheduleGoal.ts) for goals. Splice out anything that scheduled or permanently failed; retain rows that failed with `NO_SLOTS` for retry.
- **Reactive backstop**: if candidates remain after a full forward pass, run `expandSlots` and loop again.
- Stops when candidates empty or `expansionsDone ≥ MAX_WEEKS_TO_SEARCH`.

### Goals

`scheduleGoal` resolves the goal's bottom-layer uncompleted tasks (via `getSortedTreeBottomLayer`), filters out completed / already-scheduled / memoized tasks, and schedules each in sequence using `goalAfterTime = previousTaskEnd` so the goal's children stay temporally clustered. Always returns `permanentFailure: false` — the retry loop handles `NO_SLOTS`.

---

## 7. The Static Travel Pass

[helpers/TravelManager/staticEventTravelPass/](../utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/) is the state machine that places travel between consecutive non-matching locations across the slot array. It runs once after the initial slot build (`preliminary` pass) and again at the seam after every [expandSlots](#8-incremental-horizon-expansion) call.

### The walk

[staticEventTravelPass.ts](../utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/staticEventTravelPass.ts) walks the slot array in order with a `while` loop. Handlers return the next index to process, so newly-spliced slots aren't re-processed. Occupied and Travel slots are skipped; Available slots go to [handleAvailable](../utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/handleAvailable.ts); Category slots go to [handleCategory](../utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/handleCategory.ts).

### Round-trip detection (`legTracker`)

[legTracker.ts](../utils/calendar-generation/helpers/TravelManager/legTracker.ts) maintains an ordered list of open outbound legs. `track(from, to)` returns:

- **`true`** when the trip closes an open leg (return trip — strict mirror match, or chained-return where `X → A` closes the chain starting at `A`).
- **`false`** when it opens a new leg.

`untrack(from, to)` rewinds a previously opened leg, used by absorb cascades when the dispatcher undoes a placed travel before replanning. Whether `track` returns true or false changes whether the new travel lands at slot-start (return — get back early) or slot-end (outbound — leave at last possible moment) in `handleAvailable`.

`TravelManager.resolveTravel(slot)` and `resolveCategoryEdge(slot, edge)` are the entry points; both call `legTracker.track` internally but only `resolveTravel` uses the return value for placement direction. For category edges, placement is fixed by the edge — `track` is called for round-trip bookkeeping only.

### Handler decisions

**`handleAvailable`** (transitions during free time):

| Situation | Action |
| --- | --- |
| prev === next (no transition) | skip |
| Travel fits in current slot | `placeTravelInCurrent` (start or end per `placeAtSlotStart`) |
| Too small, prev is Travel | `absorbAndReplan` — undo prior travel, merge with current, replan single longer travel at the tail |
| Too small, prev soft + next soft | `bleedAcrossPrevCurrentNext` |
| Too small, prev soft + next hard | `bleedIntoPrev` |
| Too small, prev hard + next soft | `bleedIntoNext` |
| Too small, prev hard + next hard | `fillCurrentWithAlert` (insufficient travel) |

**`handleCategory`** processes two edges per category slot.

- **Entry edge**: if `isFinal` is set, skip — entry was placed during the earlier pass; only the exit edge re-runs at the seam. Otherwise place entry travel at the head; if the slot is too small, `bypassCategoryCascade` walks forward to find a landing point.
- **Exit edge**: if no next slot exists, defer (set `isFinal` for expansion). If the next slot is Available, defer (the Available handler will pick it up). If the next slot is another Category, attempt symmetric-bleed splitting travel across both categories; on failure try backward absorb (`absorbAndReplanIntoNextCategory`), then forward cascade. If the next slot is Occupied, place at tail; if too small, try backward absorb through the category (`absorbAndReplanThroughCategory`) or trespass.

### Absorb / Bleed / Cascade

These are the three space-recovery strategies the handlers reach for when a single slot can't hold the travel.

- **absorb** ([absorb.ts](../utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/absorb.ts)) — Roll a previously placed travel and the current slot into a single absorb region, untrack the original leg(s) via `legTracker.untrack`, and replan one longer travel covering the merged region. Handles insufficient travel by extending into the next slot's head.
- **bleed** ([bleed.ts](../utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/bleed.ts)) — Place travel in current, then steal overflow time from soft (Available / Category) neighbors. Cascades when overflow exceeds a single neighbor. Trespass is marked only on **full interior consumption** — a partial bleed shortens the category without marking a boundary.
- **cascade** ([cascade.ts](../utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/cascade.ts)) — Forward or backward geometric walk to find a landing-spot Category or pinned location. Forward cascade is used when a category entry can't fit (walk past categories until a natural landing). Backward cascade is used for overconstrained category-to-category exits.

### Static-pass invariants (memory-encoded)

These are user-encoded invariants the static pass must respect; check them when modifying handler logic:

- **Overconstrained boundaries must align to original-fabric seams.** The shard model preserves original source boundaries via `originalSourceStart` / `originalSourceEnd`; cascade output should fall on those edges, not invented mid-interval boundaries.
- **Cascade absorbs fill the region with no leading Available.** A cascade-absorbed range becomes a contiguous travel span. Contrast bleed-recovery, which preserves "at origin" Available time where the user genuinely had a window.
- **Restore bleed-trimmed prev category to wrapper.** When a bleed shortens a category, the wrapper is reconstructed via [buildLandingSurvivor](../utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/slotShape.ts) so the renderer sees the full original category.
- **Jump intermediate category as 0-min overconstrained travel when surrounding categories share a location.** [dropUnreachableCategoryVisits](../utils/calendar-generation/helpers/TravelManager/dropUnreachableCategoryVisits.ts) pre-pass replaces an unreachable middle category with a zero-minute `overconstrained` travel at the surrounding location.

### Trespass marking

Trespass flags (`trespassingStart` / `trespassingEnd`) on `CategorySlot` indicate travel-into / travel-out-of that category would have fully consumed its interior. They are set during placement, cleared at the end of each iteration if the marker now sits strictly inside a Travel slot interior (the visible travel already conveys the crossing). Downstream, [stampCategoryEventBorders](../utils/calendar-generation/helpers/EventAssembler/stampCategoryEventBorders.ts) reads these flags and stamps them onto the persisted `CategoryEvent` rows so the renderer can draw red borders without re-running the engine.

### The `isFinal` pickup marker

The last action of every static pass is to mark the last category whose exit edge was deferred (because there was no next slot to place toward) with `isFinal: true`. The pass guarantees at most one slot in the array carries this flag at a time. The marker is the pickup point for the next `expandSlots` call.

---

## 8. Incremental Horizon Expansion

The slot horizon is bounded — initial build covers `HORIZON_CHUNK_DAYS = 28` days regardless of how far out the user has Plans. When the scheduler exhausts slots, [expandSlots](../utils/calendar-generation/helpers/Scheduler/expandSlots.ts) appends another chunk.

### The mechanism

1. **Find the pickup point.** Search for the slot with `isFinal === true` (set by the previous static pass). Pickup time = `isFinal.end`. If no marker exists (defensive fallback), pickup is the start of today.
2. **Compute chunk bounds.** `chunkEnd = endOfDay(pickupTime + HORIZON_CHUNK_DAYS - 1)`.
3. **Split the slot array.** Everything ending ≤ `pickupTime` is preserved verbatim (`preservedSlots`); everything after is discarded. The static pass's decisions on preserved slots are retained — they are not re-processed.
4. **Compute `startingLocationOverride`.** From the last preserved slot's outgoing location, so the freshly-built region's seam Available starts with an honest `prev`.
5. **Rebuild the new region.** Call `buildAvailableSlots({ startDate: pickupTime, ..., startingLocationOverride })` over the new chunk window.
6. **Combine and sort.** `[...preservedSlots, ...newSlots]`.
7. **Replay `legTracker` state.** Reset the tracker, then walk preserved Travel slots and call `legTracker.track(from, to)` once per **unique** `travelId` (skipping self-travels where `from === to`). This restores round-trip detection state so the seam re-decision behaves correctly.
8. **Resume the static pass.** Call `staticEventTravelPass` with `resumeIdx = index of isFinal slot in combined array` (or `0` if no marker existed). The pass picks up at exactly the deferred exit edge and proceeds across the new region. On completion it marks a fresh `isFinal` on the new last-deferred category.

### Why the tail buffer

`PLACEMENT_BUFFER_DAYS = 3` of trailing horizon room is left empty — `findAllFittingSlots` filters out slots starting past `lastPlaceableSlotEnd − PLACEMENT_BUFFER_DAYS`. This gives the next expansion's static-pass resume **empty room** to re-decide travel placement at the seam without colliding with already-placed dynamic events.

### Why proactive expansion matters

Without the proactive watermark check, the scheduler would burn iterations on tasks that can't possibly fit before triggering reactive expansion. Detecting "biggest task > biggest compatible slot" before the forward pass starts cuts straight to the expansion step.

### Regression coverage

[`__tests__/calendar-generation/expansion-seam.test.ts`](../__tests__/calendar-generation/expansion-seam.test.ts) is the only test currently in the engine's test directory. It is narrower than the section title implies: it guards the `CategoryEvent` ID format (`` `${categoryTimeWindowId}|${YYYY-MM-DD-local}` ``) by running `generateCalendar` with a single Plan three weeks out (which forces expansion) and asserting that every produced `CategoryEvent` ID matches the local-date pattern. The diff layer and the DB schema depend on this composite ID; a regression to UTC-instant keying would diverge near midnight UTC and would be caught here.

---

## 9. Capacity Gating & Placement Buffer

### `maxEffectiveCapacityFor`

[capacityCheck.ts](../utils/calendar-generation/helpers/Scheduler/capacityCheck.ts) computes the largest single duration a task could ever fit in a **clean week** (i.e. before any other tasks consume slots), accounting for:

1. **Template gaps** — `gapIntervalsForDay` produces each day's free intervals (between templates).
2. **Strict-category subtraction** — strict categories with a different `categoryId` than the task subtract from any gap they overlap (the task can never use them).
3. **Per-category ceiling** — if the task is itself categorized, the largest window in its own category is a hard ceiling.

Returns `min(categoryCeiling, largestGap)`. Cached per `taskCategoryId ?? "anywhere"` for the duration of a scheduling pass.

`scheduleSingleTask` and `scheduleGoal` call this at task entry. If `task.duration > maxCapacity`, the task is marked `TOO_LARGE` immediately — no iterations wasted attempting placement.

### `largestCompatibleSlotForLargestTask`

Same module, used by the proactive expansion check. Walks the slot array and returns the largest currently-existing slot the biggest remaining candidate could land in, honoring category strictness and the `placementCutoffDate`.

---

## 10. Strategies

[helpers/Scheduler/selectBestSlot.ts](../utils/calendar-generation/helpers/Scheduler/selectBestSlot.ts) scores slots via a single composite strategy.

### The interface

```typescript
interface SchedulingStrategy {
  readonly name: string;
  score(task: Planner, slot: PlaceableSlot, context: SchedulingContext): number; // 0.0–1.0
}
```

`PlaceableSlot = AvailableSlot | CategorySlot` — strategies never score Occupied or Travel slots.

### `CompositeStrategy`

[SchedulingStrategy.ts](../utils/calendar-generation/strategies/SchedulingStrategy.ts) holds an array of `{ strategy, weight }` pairs. `score` returns the weighted mean. `getDetailedScores` returns per-strategy raw values for debugging.

### Built-in strategies

- **`EarliestSlotStrategy`** ([EarliestSlotStrategy.ts](../utils/calendar-generation/strategies/EarliestSlotStrategy.ts)) — Linear decay: `score = max(0, 1 - daysFromNow / 14)`. Task-independent. Day 0 → 1.0, Day 14+ → 0.0.
- **`LocationGroupingStrategy`** ([LocationGroupingStrategy.ts](../utils/calendar-generation/strategies/LocationGroupingStrategy.ts)) — Examines the slot's `prevLocationId` / `nextLocationId` (or `currentLocationId` for `CategorySlot`) and applies a base sandwich-match score plus a travel-time penalty when locations don't match.

### Default constants (verbatim from [strategies/defaultStrategy.ts](../utils/calendar-generation/strategies/defaultStrategy.ts))

```typescript
DEFAULT_STRATEGY_WEIGHTS = {
  earliestSlot:     1.0,
  locationGrouping: 0.2,
};

DEFAULT_LOCATION_GROUPING_SCORES = {
  bothMatch:       0.95,  // both adjacent events match task location (sandwich)
  oneMatchOneOpen: 0.8,   // one end matches, other is open (start/end of day)
  oneMatch:        0.5,   // one end matches, other doesn't
  bothOpen:        0.7,   // both ends open (empty day)
  oneOpenNoMatch:  0.45,  // one end open, other doesn't match
  neitherMatch:    0.4,   // neither adjacent event matches
  noLocation:      0.5,   // task has no location (neutral)
};

DEFAULT_LOCATION_GROUPING_PENALTIES = {
  maxSingleTravelPenalty:     0.02,
  maxDoubleTravelPenalty:     0.03,
  singleTravelPenaltyDivisor: 600,   // penalty = travelMinutes / 600 (capped)
  doubleTravelPenaltyDivisor: 400,
};
```

### Strategy assembly

[buildSchedulingStrategy.ts](../utils/calendar-generation/helpers/CalendarGenerator/buildSchedulingStrategy.ts) always includes `EarliestSlotStrategy`. `LocationGroupingStrategy` is added only if a `travelTimeMatrix` was supplied. Weights default to `DEFAULT_STRATEGY_WEIGHTS` but can be overridden per call.

> Note: task urgency / deadline prioritization is **not** a strategy. Scores are computed once at the top of `CalendarGenerator.execute()` via `scoreCandidatesAndRootGoals` and consumed by `sortByPriorityAndConstraints` before any slot scoring.

---

## 11. The Shard Model & Identity-Based Absorb/Reclaim

[utils/timeSlotUtils.ts](../utils/calendar-generation/utils/timeSlotUtils.ts) implements the engine's identity-based travel manipulation.

### Why shards exist

A single logical travel can span multiple source slots (a bleed across prev-current-next produces three pieces — one per eaten source). Fusing them into a single `TravelSlot` would erase the original source identities, breaking restoration when the travel is later absorbed or reclaimed. Instead, each piece is emitted as its own `TravelSlot` shard sharing a common `travelId` (UUID).

### Shard fields

Each shard carries:

- **`travelId`** — UUID shared by all shards of one logical travel.
- **`originalType`** — `"available"` or `"category"` — the source kind.
- **`originalSourceStart`** / **`originalSourceEnd`** — the original fragment's boundaries before splicing.
- For category shards: **`originalCategoryId`**, **`originalLocationId`**, **`originalIsStrictCategory`**.
- For available shards: **`originalPrevLocationId`**, **`originalNextLocationId`**.

### Core operations

- **`createTravelShards(sources, ...)`** — given source fragments, produce N `TravelSlot`s with a shared `travelId` and the appropriate `original*` fields.
- **`collectShardSources(absorbedRange)`** — extract `ShardSource`s from an absorbed range, clipped to the absorb boundary; chained absorbs inherit `originalType` from existing shards.
- **`unplanTravel(slots, travelId)`** — remove all shards of a `travelId` and restore source fragments via `restoreShardSource`; adjacent restored siblings (Available↔Available, Category↔Category with same category/location) are merged.
- **`restoreAbsorbedRange(slots, start, end)`** — reconstruct Available/Category fragments inside `[start, end]`, recursively unpacking any travel shards there to their original sources. Used by `reserveSlotWithTravel` after splicing a placement into an absorbed region.
- **`reclaimTravelSlot(slot)`** — convert a `TravelSlot` back to a `PlaceableSlot` of the original kind (CategorySlot if `originalType === "category"`, else AvailableSlot).
- **`TravelShardSpan`** — `{ travelId, spanStart, spanEnd, shardIndices }`. Returned by `findAdjacentTravel*` and `findPrecedingGapTravel`; carries everything `reserveSlotWithTravel` needs to remove the span by identity.
- **`removeTravelSpanByTravelId` / `removeTravelSpanAt`** — safe multi-shard removal.

### Why identity-based removal matters

Earlier versions of the engine searched for adjacent travel by time-window heuristics. That broke when multi-shard travels straddled the heuristic boundary, when buffer offsets shifted positions, or when two unrelated travels happened to fall near the same time. Identity removal (carry the `TravelShardSpan` through `SlotSelectionResult`, remove all shards of that `travelId` in `reserveSlotWithTravel`) eliminates the entire class of false-positive removals.

The same pattern applies to inbound/outbound travel removal in the dynamic path: pre-existing travels are matched by exact end-position (`occ.end === task.start` for inbound, `occ.end === slot.end` for outbound) rather than by tolerance window.

---

## 12. Category System

A `Category` is a hierarchical organizational container with three engine-relevant attributes:

- **`timeSlots: CategoryTimeWindow[]`** — `[{ day, startTime, endTime, ... }]`. Day uses ISO weekday numbers (`0 = Sunday`, `1 = Monday`, ...).
- **`isStrict: boolean`** — if `true`, only items belonging to this category (effective categoryId match) can be scheduled in its windows. Other items are filtered out by `findAllFittingSlots` and by `maxEffectiveCapacityFor`'s strict-category subtraction.
- **`locationId: string | null`** — default location for items inside the category that don't carry one explicitly. Inherited via `LocationMapper` as the third fallback (after own location and parent chain).

A category only contributes to scheduling geometry if `useTimeWindows === true` **and** `timeSlots.length > 0` (filtered in `CalendarGenerator`'s constructor). Categories that fail either check still contribute location inheritance.

### Materialization

Each generation, `buildCategoryEvents` materializes one `CategoryEvent` row per `CategoryTimeWindow` per matching local day across the horizon. IDs are composite (`` `${windowId}|${YYYY-MM-DD-local}` ``), keyed on the **local** calendar date — not the UTC instant — so day boundaries near midnight UTC don't desync the diff layer. `stampCategoryEventBorders` propagates trespass flags from category slots and insufficient-travel slots onto these rows.

---

## 13. Debugging the Engine

The engine has a built-in switchboard at [calendarGeneration.ts:78–94](../utils/calendar-generation/calendarGeneration.ts#L78-L94). Set `enableLogging = true` and flip individual flags:

| Flag | What it dumps |
| --- | --- |
| `metrics` | Final `SchedulingMetrics` |
| `failures` | All `SchedulingFailure` rows |
| `finalEvents` | The final `SimpleEvent[]` |
| `leanCalendar` | Sorted output events with title / start / end / location — the most readable single dump |
| `travelDebug` | Travel pass diagnostics |
| `templateInfo` | Template expansion stats |
| `planners` / `templates` / `locations` | Echo of input |
| `strategySettings` | Active strategy weights / scores / penalties |
| `staticEventTravelPass` | Per-slot decision/action trail of every static pass (preliminary plus each `resume@<date>` expansion) — set via [TravelPassRecorder](../utils/calendar-generation/helpers/TravelManager/TravelPassRecorder.ts), formatted via [travelPassMessages](../utils/calendar-generation/helpers/TravelManager/travelPassMessages.ts) |
| `dynamicScheduling` | Per-task decision/action trail of every dynamic placement — set via [SchedulerRecorder](../utils/calendar-generation/helpers/Scheduler/SchedulerRecorder.ts), formatted via [schedulerMessages](../utils/calendar-generation/helpers/Scheduler/schedulerMessages.ts) |
| `dateRangeStart` / `dateRangeEnd` | Inclusive bounds applied to event-based dumps (`finalEvents`, `leanCalendar`, `travelDebug`) and the recorder trails. Either can be `null` to leave that side open. |

When investigating a misplaced travel block or a task that ended up in the wrong slot:

1. Set `enableLogging = true`.
2. Enable `leanCalendar` to confirm the symptom.
3. Enable `staticEventTravelPass` (for travel placement bugs) or `dynamicScheduling` (for task placement bugs).
4. Use `dateRangeStart` / `dateRangeEnd` to narrow output to the affected day or two.
5. Read the trail. Each recorder entry includes the decision branching, actions taken, and an end-state snapshot of the relevant slots.

[RecorderBase.ts](../utils/calendar-generation/utils/RecorderBase.ts) provides shared formatting (date stamps, slot labels, marker decoration); both recorders extend it.

---

## 14. Engine-Internal Utilities

[utils/](../utils/calendar-generation/utils/):

- **`dateTimeService.ts`** — centralized date helpers (week boundaries, day comparison, minute math, ISO parse/format, range overlap, day-key generation). **The engine should not call `date-fns` directly outside this file.**
- **`intervalUtils.ts`** — `findGaps` (Occupied intervals → Available slots with `prev`/`next` location), `eventsToIntervals`, `masksToIntervals`, `mergeIntervals`, `findLocationTransitions`, `detectTrespassingEvents`.
- **`loggingUtils.ts`** — `logCalendarDebugInfo` dispatcher and `filterEventsByLogRange` (open-bounded filter — `null` on either side leaves it open).
- **`RecorderBase.ts`** — base class for `TravelPassRecorder` + `SchedulerRecorder`.
- **`timeSlotUtils.ts`** — the shard model (Section 11). Also `getDurationMinutes`, `canFitDuration`, `doSlotsOverlap`, `splitSlot`, `occupySlot`, `createTravelSlot`, `isTravelSlot`.

---

## 15. Complete Data Flow

```
generateCalendar(...)
   │
   ▼
CalendarGenerator.generate()
   │
   ├─ (1)  validateInput                       → fail-fast on bad input
   ├─ (2)  buildInitialEventArray              → memoized + plan + completed events
   ├─ (3)  expandTemplates                     → recurring events + PerTemplateMask[]
   ├─ (4)  buildLocationMap + buildPlannerCategoryMap
   ├─ (5)  filter scheduledCategories          (useTimeWindows + timeSlots.length > 0)
   │
   ├─ (6a) buildAvailableSlots                 → initial 28-day slot array
   ├─ (6b) staticEventTravelPass               → preliminary travel placement; marks isFinal
   ├─ (6c) dropPastAvailableSlots              → strip Available slots ending ≤ now
   │
   ├─ (7)  construct SchedulerRecorder
   ├─ (8)  prepareSchedulingContext
   ├─ (9)  prepareCandidates                   → priority-sorted task/goal list
   │
   ├─ (10) Scheduler.scheduleTasksAndGoals
   │         │
   │         ▼
   │       loop while candidates remain:
   │         compute placementCutoffDate
   │         proactive expansion check (watermark / largest-task vs largest-compatible-slot)
   │           → if needed: expandSlots → continue
   │         forward pass:
   │           for each candidate in reverse:
   │             scheduleSingleTask / scheduleGoal
   │               → scheduleTask: validate → findValid → selectBest → reserve → buildEvent
   │             splice on scheduled or permanent failure
   │         if candidates remain → expandSlots (reactive backstop)
   │
   ├─ (11) deriveSchedulingHorizon → assembleFinalEvents
   │         → events, categoryEvents, travelEvents
   │
   └─ emitDebugLog (if logging enabled)
```

---

## 16. Key Gotchas & Edge Cases

- **The slot array is the truth.** Never compute placement from a separate "free time" cache. Always read from `TimeSlotManager.slots` after each splice.
- **Travel is shards, not slots.** When manipulating a logical travel, work via `travelId`. Don't search adjacent slots by time window — use `findAdjacentTravel*` / `findPrecedingGapTravel`, which return `TravelShardSpan` and let `reserveSlotWithTravel` remove by identity.
- **Buffer is owned by the unit, not the slot.** Each dynamic placement owns its own leading + trailing buffer. Travel sits flush against the task; the buffer is outside the `[travel-before, task, travel-after]` unit on both sides.
- **Standalone-before changes leading buffer ownership.** When travel-before fits in an earlier slot, the leading buffer is owned by that earlier slot — the task lands flush at `slot.start` in the current slot.
- **`null` locationId means "Anywhere", not "missing".** Travel propagates through Anywhere events instead of ending at them. Strategy scoring and travel placement honor this.
- **`isFinal` is a single-instance marker.** At most one slot carries it. If you see two, something is wrong.
- **`legTracker` must be replayed at the seam.** Without replay, round-trip detection in the expanded region treats every leg as new outbound. Replay deduplicates multi-shard travels by `travelId` and skips self-travels.
- **Strict category subtraction in `maxEffectiveCapacityFor`.** A strict category with a different categoryId blocks the entire window it overlaps, even if the window has free interior. The capacity check must subtract these.
- **Per-category ceiling.** A categorized task can never exceed the largest window of its own category, regardless of template gaps.
- **`placementCutoffDate` suppresses dynamic placement in the tail.** Don't try to "use the whole horizon" — leave the last `PLACEMENT_BUFFER_DAYS` empty so the next seam re-decision has room.
- **`useTimeWindows + timeSlots.length > 0` is the scheduling gate.** A category missing either still contributes location inheritance but does not constrain slot geometry.
- **CategoryEvent ID is local-date keyed.** `` `${windowId}|${YYYY-MM-DD-local}` ``. Never derive the date component from the UTC instant — the diff layer assumes local. See [`expansion-seam.test.ts`](../__tests__/calendar-generation/expansion-seam.test.ts).
- **Template events are filtered out of `events`.** They're consumed by the slot builder (as `PerTemplateMask[]`), not surfaced in the final `SimpleEvent[]`. The renderer reads recurring template instances separately.
- **Trespass flags propagate from slots to `CategoryEvent` rows.** Don't compute trespass in the renderer — the engine writes it via `stampCategoryEventBorders` so cold loads render correctly.
- **Urgency is not a strategy.** Strategy weights affect *slot scoring* only. Urgency scores are computed once at the top of `CalendarGenerator.execute()` (via `scoreCandidatesAndRootGoals`, which also covers non-candidate root goals so the dashboard can rank them) and consumed by `sortByPriorityAndConstraints` before any strategy runs. The same map is returned as `plannerScores`.
