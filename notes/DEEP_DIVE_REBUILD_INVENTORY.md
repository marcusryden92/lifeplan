# Inventory for rebuilding the calendar-generation deep-dive

**Audience:** an agent that will write a brand-new [documentation/calendar-generation-deep-dive.md](../documentation/calendar-generation-deep-dive.md). The old version was written when several pieces of the engine looked different and has drifted from the code. Treat the old doc as **untrusted reference for structure only** — verify every claim against the files below.

**Scope.** This inventory is engine-only: `utils/calendar-generation/` plus the few cross-cutting files that the engine consumes (Prisma models, calendar types, related tests). For the rest of the app, see [CLAUDE_MD_REBUILD_INVENTORY.md](./CLAUDE_MD_REBUILD_INVENTORY.md). When the new deep-dive needs to mention something outside the engine (e.g., a Planner field), link it; don't re-document it.

**Do this rewrite first.** The CLAUDE.md rewrite has a ~15-line "engine summary" section that should be condensed *from the freshly-rewritten deep-dive*, not from the stale old one. Finishing this doc first gives the CLAUDE.md agent a known-good source to compress.

## How to use this list

The engine is a stateful pipeline. Read in this order:

1. **Public surface first** (entry, output shape, config).
2. **Models** (the data the engine moves around — especially the sealed `TimeSlot` union).
3. **Orchestrator + core classes** (how phases are wired).
4. **Helpers, module by module** (the actual logic).
5. **Strategies + utils**.
6. **Tests** (executable spec for the trickiest behaviors).
7. **Existing deep-dive + memory notes** (last — to avoid anchoring on stale framing).

When something feels surprising, check the relevant test or run with logging enabled (see "Observing the engine" below) before writing it up.

---

## 1. Public surface

- [utils/calendar-generation/calendarGeneration.ts](../utils/calendar-generation/calendarGeneration.ts) — `generateCalendar(input)` wrapper, the `logging` switchboard.
- [utils/calendar-generation/index.ts](../utils/calendar-generation/index.ts) — re-exports that define what's considered public API.
- [utils/calendar-generation/constants.ts](../utils/calendar-generation/constants.ts) — `SCHEDULING_CONFIG` (`HORIZON_CHUNK_DAYS`, `LOW_SLOT_WATERMARK`, `PLACEMENT_BUFFER_DAYS`, buffer constants, etc.). The numerical knobs that govern engine behavior live here — name them and explain what each one does.

## 2. Models (read these before anything else — types drive the whole flow)

- [utils/calendar-generation/models/SchedulingModels.ts](../utils/calendar-generation/models/SchedulingModels.ts) — `CalendarGenerationInput`, `SchedulingResult`, `SchedulingContext`, `SlotSelectionResult`, failure enums, etc.
- [utils/calendar-generation/models/TemplateModels.ts](../utils/calendar-generation/models/TemplateModels.ts) — `PerTemplateMask`.
- [utils/calendar-generation/models/TimeSlot.ts](../utils/calendar-generation/models/TimeSlot.ts) — **sealed discriminated union**: `AvailableSlot | OccupiedSlot | CategorySlot | TravelSlot`. The engine's central data structure; the deep-dive needs a clear visual of this union and the per-variant fields.
- Cross-cutting types the engine consumes:
  - [types/calendarTypes.d.ts](../types/calendarTypes.d.ts) — `WeekDayIntegers`, `TravelExtendedProps`, etc.
  - [types/models.d.ts](../types/models.d.ts) — `SimpleEvent`, `Planner`, `EventTemplate`.
  - [types/categoryTypes.d.ts](../types/categoryTypes.d.ts) — Category-related types.
- Prisma models that define the persisted shapes feeding the engine:
  - [prisma/schemas/models/calendar.prisma](../prisma/schemas/models/calendar.prisma) — `Planner`, `SimpleEvent`, `EventTemplate`.
  - [prisma/schemas/models/category.prisma](../prisma/schemas/models/category.prisma) — `Category` (`timeSlots` JSON shape, `isStrict`).
  - [prisma/schemas/models/location.prisma](../prisma/schemas/models/location.prisma) — `Location`, `TravelTime` (DRIVING/TRANSIT/BICYCLING/WALKING, baselines + overrides).

## 3. Core orchestrator + stateful classes

- [utils/calendar-generation/core/CalendarGenerator.ts](../utils/calendar-generation/core/CalendarGenerator.ts) — 11-phase orchestrator. Delegates each phase to a function in `helpers/CalendarGenerator/`. The deep-dive's "Step-by-Step Execution Flow" section should mirror these phases in order.
- [utils/calendar-generation/core/Scheduler.ts](../utils/calendar-generation/core/Scheduler.ts) — task placement + per-pass metrics.
- [utils/calendar-generation/core/TimeSlotManager.ts](../utils/calendar-generation/core/TimeSlotManager.ts) — thin holder for the canonical mutable `slots` array (~22 lines). The real work lives in `helpers/TimeSlotManager/`.
- [utils/calendar-generation/core/TravelManager.ts](../utils/calendar-generation/core/TravelManager.ts) — travel-time lookup + `legTracker` for round-trip detection.

## 4. Helpers (one module per phase / responsibility)

Read each module's `index.ts` first for the public shape, then dive into individual files as needed.

### CalendarGenerator phases

[utils/calendar-generation/helpers/CalendarGenerator/](../utils/calendar-generation/helpers/CalendarGenerator/) — one file per phase:

- `validateInput.ts`, `buildInitialEventArray.ts`, `expandTemplates.ts`, `buildLocationMap.ts`, `buildPlannerCategoryMap.ts`, `prepareSchedulingContext.ts`, `buildSchedulingStrategy.ts`, `prepareCandidates.ts`, `assembleFinalEvents.ts`, `buildLoggingLookups.ts`, `emitDebugLog.ts`.

### Input validation

[utils/calendar-generation/helpers/CalendarValidator/](../utils/calendar-generation/helpers/CalendarValidator/) — `validatePlanners.ts`, `validateTemplates.ts`, `validateGenerationInput.ts`, shared `types.ts`.

### Template expansion

[utils/calendar-generation/helpers/TemplateExpander/](../utils/calendar-generation/helpers/TemplateExpander/) — `expandTemplates.ts`, `getPerTemplateMasks.ts`, `calculateLargestGap.ts`, `gapIntervalsForDay.ts`.

### Slot management (where most of the geometry lives)

[utils/calendar-generation/helpers/TimeSlotManager/](../utils/calendar-generation/helpers/TimeSlotManager/) — `buildAvailableSlots.ts`, `splitSlotsAtCategoryBoundaries.ts`, `inheritLocationFromCategoryPeriods.ts`, `expandSlotForDay.ts`, `findAllFittingSlots.ts`, `reserveSlotWithTravel.ts`, `dropPastAvailableSlots.ts`, `deriveSchedulingHorizon.ts`, `getDayAvailableMinutes.ts`.

### Location mapping

[utils/calendar-generation/helpers/LocationMapper/](../utils/calendar-generation/helpers/LocationMapper/) — `buildLocationMap.ts` (own → parent chain → category fallback resolution).

### Priority sorting

[utils/calendar-generation/helpers/PrioritySorter/](../utils/calendar-generation/helpers/PrioritySorter/) — `sortByPriorityAndConstraints.ts` (urgency calculation is inlined here, not a separate strategy).

### Scheduler pipeline (5-phase per task)

[utils/calendar-generation/helpers/Scheduler/](../utils/calendar-generation/helpers/Scheduler/) — `validateTask.ts`, `findValidSlots.ts`, `selectBestSlot.ts`, `reserveTaskSlot.ts`, `buildTaskEvent.ts`, plus the loop drivers `scheduleTask.ts`, `scheduleTasks.ts`, `scheduleSingleTask.ts`, `scheduleGoal.ts`, `scheduleTasksAndGoals.ts`. Also: `expandSlots.ts` (incremental horizon expansion seam), `capacityCheck.ts` (`maxEffectiveCapacityFor` — `TOO_LARGE` gate), `SchedulerRecorder.ts` + `schedulerMessages.ts` (per-task decision trail).

### Travel placement (the most subtle module)

[utils/calendar-generation/helpers/TravelManager/](../utils/calendar-generation/helpers/TravelManager/) — `getTravelTime.ts`, `canPlaceStandaloneTravelBefore.ts`, `reserveStandaloneTravelBefore.ts`, `reserveStandaloneTravelAfter.ts`, `reserveInsufficientTravel.ts`, `findAdjacentTravels.ts`, `dropUnreachableCategoryVisits.ts`, `generateTravelEvents.ts`, `legTracker.ts`, `TravelPassRecorder.ts`, `travelPassMessages.ts`, `travelPassUtils.ts`.

Sub-module — the static-event travel-pass state machine:
[utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/](../utils/calendar-generation/helpers/TravelManager/staticEventTravelPass/) — `staticEventTravelPass.ts` (entry), `handleAvailable.ts`, `handleCategory.ts`, `absorb.ts`, `bleed.ts`, `cascade.ts`, `placement.ts`, `slotShape.ts`, `lookups.ts`. The deep-dive should walk one slot through this state machine with a worked example.

### Event assembly

[utils/calendar-generation/helpers/EventAssembler/](../utils/calendar-generation/helpers/EventAssembler/) — `buildMemoizedEvents.ts`, `buildPlanEvents.ts`, `buildCompletedEvents.ts`, `buildCategoryEvents.ts`, `markTrespassingEvents.ts`, `stampCategoryEventBorders.ts`, `assembleFinalEventList.ts`.

## 5. Strategies

- [utils/calendar-generation/strategies/SchedulingStrategy.ts](../utils/calendar-generation/strategies/SchedulingStrategy.ts) — `SchedulingStrategy` interface + `CompositeStrategy`. Note: `PlaceableSlot = AvailableSlot | CategorySlot` (strategies only score slots a task could land in).
- [utils/calendar-generation/strategies/defaultStrategy.ts](../utils/calendar-generation/strategies/defaultStrategy.ts) — `DEFAULT_STRATEGY_WEIGHTS`, `DEFAULT_LOCATION_GROUPING_SCORES`, `DEFAULT_LOCATION_GROUPING_PENALTIES`. Copy these constants verbatim — they're authoritative.
- [utils/calendar-generation/strategies/EarliestSlotStrategy.ts](../utils/calendar-generation/strategies/EarliestSlotStrategy.ts).
- [utils/calendar-generation/strategies/LocationGroupingStrategy.ts](../utils/calendar-generation/strategies/LocationGroupingStrategy.ts) — sandwich-match scoring + travel-time penalties.

## 6. Engine-internal utilities

- [utils/calendar-generation/utils/RecorderBase.ts](../utils/calendar-generation/utils/RecorderBase.ts) — shared base for `TravelPassRecorder` and `SchedulerRecorder`.
- [utils/calendar-generation/utils/dateTimeService.ts](../utils/calendar-generation/utils/dateTimeService.ts) — centralized date utilities; the engine should not call `date-fns` directly outside this file.
- [utils/calendar-generation/utils/intervalUtils.ts](../utils/calendar-generation/utils/intervalUtils.ts) — `findGaps`, `eventsToIntervals`, `masksToIntervals`.
- [utils/calendar-generation/utils/loggingUtils.ts](../utils/calendar-generation/utils/loggingUtils.ts) — `logCalendarDebugInfo`, `filterEventsByLogRange`.
- [utils/calendar-generation/utils/timeSlotUtils.ts](../utils/calendar-generation/utils/timeSlotUtils.ts) — the **shard model**: `TravelShardSpan`, `removeTravelSpan{At,ByTravelId}`, `reclaimTravelSlot`, `restoreAbsorbedRange`. Identity-based absorb/reclaim runs through here.

## 7. Tests (executable spec — trust these)

- [__tests__/calendar-generation/expansion-seam.test.ts](../__tests__/calendar-generation/expansion-seam.test.ts) — covers the incremental-expansion seam invariants (`isFinal` pickup, `legTracker` replay, dedup of multi-shard travels by `travelId`). The clearest single test for the trickiest part of the engine.

## 8. Observing engine behavior (verify, don't guess)

The engine has a built-in debug logger. To check a claim before writing it:

- Open [utils/calendar-generation/calendarGeneration.ts](../utils/calendar-generation/calendarGeneration.ts), set `enableLogging = true`, flip the relevant flag(s):
  - `staticEventTravelPass` — per-slot decision/action trail of the static travel pass (preliminary + each `resume@<date>` expansion).
  - `dynamicScheduling` — per-task decision/action trail of dynamic placement.
  - `leanCalendar` — sorted output events with location info.
  - `metrics`, `failures`, `finalEvents`, `travelDebug`, `templateInfo`, `planners`, `templates`, `locations`, `strategySettings`.
- Use `dateRangeStart` / `dateRangeEnd` to narrow event-based dumps.

Recorder messages are formatted in `helpers/Scheduler/schedulerMessages.ts` and `helpers/TravelManager/travelPassMessages.ts` — useful when interpreting trail output or quoting message text in the doc.

## 9. Memory notes that encode engine invariants

These are user-authored invariants that need to be respected in the rewrite (or, where they describe vestigial pieces, flagged for cleanup):

- `C:/Users/Marcus/.claude/projects/c--Users-Marcus-Desktop-Lifeplan/memory/project_preliminary_travel_pass_invariants.md` — overconstrained-boundary rules (must align to original-fabric seams; cascade absorbs fill the region with no leading Available; restore bleed-trimmed prev category to wrapper; jump intermediate category as 0-min overconstrained travel when surrounding categories share a location). The deep-dive's static-pass section should reflect these.
- `C:/Users/Marcus/.claude/projects/c--Users-Marcus-Desktop-Lifeplan/memory/project_category_constraint_vestige.md` — `CategoryConstraint` is leftover from a prior schema; treat any mention of it as legacy and don't elevate it in the new doc.
- `C:/Users/Marcus/.claude/projects/c--Users-Marcus-Desktop-Lifeplan/memory/feedback_no_category_abbreviation.md` — always spell "category", never "cat", in prose/comments/identifiers.

## 10. Existing deep-dive (structural reference only)

[documentation/calendar-generation-deep-dive.md](../documentation/calendar-generation-deep-dive.md) — read **last**, after you've built your own mental model from the code. Its high-level outline is a reasonable starting skeleton (existing top-level sections: High-Level Overview, Entry Point, Step-by-Step Execution Flow, Core Classes In Detail, Strategy System, Data Models, Travel Time System, Category System, Utility Functions, Complete Data Flow Diagram, Key Gotchas and Edge Cases, Debugging Tips) but:

- Verify every code excerpt against the current files — refactors have moved code around.
- Verify every numerical constant against [constants.ts](../utils/calendar-generation/constants.ts) and [defaultStrategy.ts](../utils/calendar-generation/strategies/defaultStrategy.ts).
- Verify class/file-path names — several have changed (e.g., `TemplateExpander` is no longer a class).
- The "Gotchas" section likely needs new entries for incremental expansion, the shard model, identity-based absorb/reclaim, capacity-aware `TOO_LARGE`, and the placement buffer (none of which existed in the original architecture).

---

## House rules for the rewrite

- No emojis. No pointless or task-narrative comments in code examples.
- Spell out "category" everywhere — never "cat".
- Examples should be runnable / type-checkable shape — don't invent fields that aren't on the model.
- When in doubt about a behavior, flip a logging flag and watch the trail rather than guessing.
