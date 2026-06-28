# Handoff: CategoryEvent + TravelEvent Persistence Refactor

## Context

LifePlan's calendar had a P0 bug: on cold load, category-window backgrounds and travel events were missing until the user clicked "Regenerate." Both were being produced by the scheduling engine on each run and stuffed into the `SimpleEvent[]` array with random UUIDs. They were persisted, but on next regen they all looked new (UUIDs changed), so the diff destroyed and recreated them every time — and on a fresh page load, until regen ran once, the calendar showed only persisted plans/tasks with no chrome around them.

The refactor replaces the random-UUID-in-SimpleEvent pattern with two new dedicated tables, `CategoryEvent` and `TravelEvent`, each with **deterministic IDs** derived from their identity. Idempotent regen, stable diffs, survives reloads. Templates already lived in `EventTemplate` and were expanded at render time with RRule — they're now treated the same way (no longer baked into SimpleEvent at all).

Two review passes after the initial implementation hardened it: ID scheme switched to local-date keying for DST stability, dead engine-side timestamp fields removed, `skipDuplicates` flag (which was masking ID-collision bugs) dropped, legacy SimpleEvent rows filtered at the renderer, weekly-stride DST bug in CategoryEvent expansion fixed, multi-shard travel merge defended against endpoint mismatch, autoregen gated against perpetual re-fire on navigation, per-row updates folded into delete + createMany.

## High-level architecture

Four render streams now feed FullCalendar, instead of one:

1. **Persisted SimpleEvents** — plans + scheduled tasks (the only thing left in `SimpleEvent`)
2. **EventTemplates** — expanded at render time from RRule config (never persisted as occurrences)
3. **CategoryEvents** — materialized table; one row per category-window occurrence; carries `trespassingStart`/`trespassingEnd` trespass markers
4. **TravelEvents** — materialized table; one row per travel block; carries `insufficientTravel`/`overconstrained` flags and a snapshot of `travelMinutes`/`requiredTravelMinutes`

The engine still computes all four. What changed is where the output goes:

- `assembleFinalEvents` (engine entry to the result tuple) now returns `{ events, categoryEvents, travelEvents }` instead of one flat `SimpleEvent[]`
- Diff/sync handles each table independently (per-table change groups in `DatabaseChanges`)
- Redux state has dedicated fields (`categoryEvents`, `travelEvents`) alongside `calendar`
- `Calendar.tsx` merges the four streams in a `useMemo` and hands the result to FullCalendar

### Deterministic ID schemes — local-time, not UTC

- `CategoryEvent.id = ${categoryTimeWindowId}|${YYYY-MM-DD}` where `YYYY-MM-DD` is the LOCAL calendar date of the occurrence's start (see `buildCategoryEvents.ts`)
- `TravelEvent.id = ${fromLocationId ?? "anywhere"}|${toLocationId ?? "anywhere"}|${YYYY-MM-DDTHH:mm}` where the date+time portion is local-time (see `generateTravelEvents.ts`)

**Tradeoff is local-stable vs UTC-stable, not "stable everywhere."** A UTC-keyed scheme would survive the user changing machine timezone (re-keying the same persisted row produces the same id) but would shift across DST (a "Monday 8 AM work" window keyed by UTC instant produces different ids on either side of a clock change). The local-time scheme inverts that: same id week-to-week through DST, but a user who travels with their laptop and changes TZ will get fresh ids on next regen. That's the intentional call — "9 AM gym" tracks user intent, not the underlying UTC instant. Pipe separators avoid hyphen ambiguity with CUIDs / UUIDs / ISO dates. Minute precision matches the scheduler's resolution.

### DST-aware weekly stride

`buildCategoryEvents`'s `expandPeriods` walks the horizon with `searchBase.setDate(searchBase.getDate() + 7)` — NOT a fixed 7×86400000ms UTC stride. The fixed-UTC stride drifts the local day-of-week by an hour at every DST boundary; on fall-back it landed at "Monday 23:00 local" instead of "Tuesday 00:00 local," and since the next iteration kept the same UTC offset, every subsequent Tuesday occurrence was skipped permanently. `setDate(+7)` keeps the iteration wall-clock aligned through DST.

### Shard merge guards against endpoint mismatch

`mergeShardsIntoLogicalTravels` in `generateTravelEvents.ts` collapses multiple slot fragments of the same logical travel (same `travelId`, contiguous in time) into one rendered block. Refuses to merge when adjacent shards disagree on `travelFromLocationId` or `travelToLocationId` — a static-pass bug that produced A→B + C→D under the same `travelId` would otherwise silently flatten to a fictional A→D row with the middle leg gone. On mismatch, logs a warning and keeps the shards separate so the inconsistency is visible.

### Engine timestamps and `stripDbMetadata`

The engine emits `createdAt: ""` and `updatedAt: ""` on every row. The DB owns those fields: `createdAt` is filled by the column default (`NOW()::text`), `updatedAt` by the sync handler at write time. The diff layer in `compareCalendarData.ts` uses `stripDbMetadata` to drop both fields before per-row comparison — necessary because the prev side may hold DB-loaded rows (with real timestamps) while the current side holds engine output (empty).

This is contract-correct, not a workaround. The engine is not the source of truth for those fields and explicitly opts out of producing them.

### Sync handler shape: delete + createMany, no per-row UPDATE

`categoryEventHandlers` and `travelEventHandlers` do NOT issue per-row UPDATEs. Updates collapse to delete + recreate at the same deterministic id: two batched queries replace N round-trips. The cost is that `createdAt` resets on every content change — acceptable because nothing in the app reads it. The transaction makes the swap atomic.

This is enabled by the design constraint that both tables are entirely engine-derived (no user edits, no other writers, no application code reads timestamps). It is NOT safe to copy this pattern to handlers for `Planner`, `SimpleEvent`, `Category`, etc. — those have user edits, FK relations that survive across regens, and audit-meaningful timestamps.

`syncCalendarData.ts` raises the Prisma interactive-transaction timeout from the 5s default to 30s — the first regen after a fresh load still does a single large `createMany` per table.

### Production data risk

Migrations are purely additive (CREATE TABLE x2). No destructive operations. Legacy `SimpleEvent` rows with `extendedProps.eventType IN ('category', 'travel', 'template')` exist in prod from the old engine — the new engine no longer produces them, and the diff destroys them on the first regen post-deploy.

No renderer filter, no cleanup migration. LifePlan currently has one prod user (solo dev); the brief double-render window between deploy and first manual Regenerate is acceptable. If the user-count ever grows, revisit either a one-shot `DELETE FROM "SimpleEvents" WHERE extendedProps.eventType IN ('category','travel','template')` cleanup or a renderer-side filter.

### First-load behavior

CategoryEvent/TravelEvent rows survive reloads, so a fresh page load shows them without needing regen. For users who haven't regenerated since deploy (or brand-new users), `CalendarProvider` fires a one-shot autoregen after the initial fetch resolves.

The gating is deliberately careful to prevent perpetual re-fire:

- `isInitialColdLoadRef` snapshots `isCalendarLoaded` at mount. If redux already had the loaded state from a prior navigation (we're remounting, not cold-loading), the autoregen branch is permanently inert for the rest of this mount.
- Precondition requires either a category with at least one time window OR a planner with a locationId. `categories.length > 0` is NOT sufficient — a category with no time windows produces zero CategoryEvents, leaving `hasNoChrome` true forever and re-firing on every reload.
- A `useRef` gate prevents double-fire within the same mount.

Triggers `updateAll()` (the implicit-regen path through the thunk), NOT `manuallyRefreshCalendar`. The narrower "user has unfinished overdue tasks they want to control" concern is preserved — overdue detection is part of the explicit user-click path.

### Expansion seam — deterministic by construction

The scheduling engine does incremental horizon expansion (chunk-by-chunk). Each expansion replays past decisions from preserved Travels and re-runs the static-pass starting at the `isFinal` Category. The earlier draft of this doc framed seam ID stability as a deferred risk; on closer reading, it isn't:

- `buildCategoryEvents` runs **once at the end** of generation, after all expansion. It walks `Categories` across `[schedulingStartDate, schedulingEndDate]` with `setDate(+7)` — a single deterministic enumeration. CategoryEvent ID = `windowId|local-date`. Same Categories + same range → same IDs, regardless of how many expansion chunks ran during scheduling.
- TravelEvent IDs derive from `slot.start`. `expandSlots` preserves the slot array verbatim up to `isFinal` — preserved slots are byte-identical pre/post-expansion, so their IDs don't shift. Fresh placements in the new chunk get new IDs (which is correct).

The four tests at `__tests__/calendar-generation/expansion-seam.test.ts` cover the realistic failure modes:

- Determinism: two runs of `generateCalendar` with identical input produce identical CategoryEvent id sets.
- Input-stability: adding unrelated planner items doesn't shift CategoryEvent ids.
- Id format: every id matches `${categoryTimeWindowId}|${YYYY-MM-DD}`.
- Local-date derivation: the date component of each id matches `new Date(row.start)`'s local date.

The remaining latent risks live in the date math itself — DST drift (now guarded by the `setDate(+7)` stride), or someone reverting the local-date keying back to UTC instants (caught by the local-date-derivation test).

### Cascade behavior

- `CategoryEvent.categoryTimeWindowId` → `CategoryTimeWindow.id` ON DELETE CASCADE — fires on row DELETE, NOT on row UPDATE. Editing a window's startTime / endTime / day leaves materialized CategoryEvents with stale spans until the next regen rewrites them. Deleting a window cascades to its CategoryEvents.
- `CategoryEvent.categoryId` → `Category.id` ON DELETE CASCADE
- `TravelEvent.fromLocationId` / `toLocationId` → `Location.id` ON DELETE SET NULL — deleting a Location leaves orphan TravelEvents with null FKs; rendering falls back to "Anywhere" for null and "Unknown" for an id that no longer resolves (see `travelEventsToEventInput.ts`). CASCADE would eliminate orphans at the cost of disappearing rendered travels mid-session.

### Hardening notes

- **`skipDuplicates` removed** from both `categoryEvent.createMany` and `travelEvent.createMany`. The deterministic-ID scheme is the only thing preventing collisions; silently swallowing dupes meant any determinism regression would produce missing-chrome bugs with no log line.
- **TravelEvent renders resolved location names**. The previous title was `Travel_${fromLocationId}_${toLocationId}` — raw CUIDs. Now `Home → Office` via render-time join against the `locations` slice; renaming a Location takes effect without rewriting every materialized travel row.
- **Legacy SimpleEvent rows handled by destroy-on-regen**, not by a renderer filter. The earlier draft of this refactor shipped a defensive filter in `transformEventsForFullCalendar`; it was removed once the user accepted the brief double-render window before the first post-deploy Regenerate.

## Files touched

### Schema + migrations
- `prisma/schemas/models/category.prisma` — added `CategoryEvent` model
- `prisma/schemas/models/location.prisma` — added `TravelEvent` model
- `prisma/schemas/models/user.prisma` — relation backref additions
- `prisma/migrations/20260627231537_add_category_event/migration.sql` — `CREATE TABLE CategoryEvents` + FKs
- `prisma/migrations/20260628004340_add_travel_event/migration.sql` — `CREATE TABLE TravelEvents` + FKs
- `prisma/seed.ts` — added `deleteMany` for both new tables in cleanup block

### Types
- `types/prisma.ts` — exported `CategoryEvent` and `TravelEvent` payload types

### Engine (calendar-generation)
- `utils/calendar-generation/calendarGeneration.ts` — top-level return shape adapted
- `utils/calendar-generation/core/CalendarGenerator.ts` — orchestrator updated to thread the new arrays through
- `utils/calendar-generation/core/TravelManager.ts` — emits `TravelEvent[]`
- `utils/calendar-generation/models/SchedulingModels.ts` — added `CalendarGenerationResult` extending `SchedulingResult` with `categoryEvents` and `travelEvents`
- `utils/calendar-generation/helpers/CalendarGenerator/assembleFinalEvents.ts` — returns the new tuple shape
- `utils/calendar-generation/helpers/EventAssembler/assembleFinalEventList.ts` — simplified to just filter templates from scheduledEvents
- `utils/calendar-generation/helpers/EventAssembler/buildCategoryEvents.ts` — **new** — produces `CategoryEvent[]` with deterministic `${windowId}|${YYYY-MM-DD-local}` IDs; uses `setDate(+7)` for DST-safe weekly stride; emits empty timestamps
- `utils/calendar-generation/helpers/EventAssembler/stampCategoryEventBorders.ts` — **new** — mutates trespass flags on `CategoryEvent` rows (replaces `stampCategoryWrapperBorders`)
- `utils/calendar-generation/helpers/EventAssembler/index.ts` — barrel export updates
- `utils/calendar-generation/helpers/TravelManager/generateTravelEvents.ts` — rewritten to emit `TravelEvent[]` with deterministic `${from}|${to}|${YYYY-MM-DDTHH:mm-local}` IDs; shard merge guards against endpoint mismatch; emits empty timestamps
- `utils/calendar-generation/utils/loggingUtils.ts` — adapted log dumps to the new output shape

### Engine (deleted)
- `utils/calendar-generation/helpers/EventAssembler/buildCategoryWrapperEvents.ts` — **removed**
- `utils/calendar-generation/helpers/EventAssembler/stampCategoryWrapperBorders.ts` — **removed**

### Render layer (new directory)
- `utils/calendar-rendering/index.ts` — barrel
- `utils/calendar-rendering/templatesToEventInput.ts` — expands `EventTemplate[]` to `EventInput[]` with RRule
- `utils/calendar-rendering/categoryEventsToEventInput.ts` — joins `CategoryEvent[]` with `Category[]` at render
- `utils/calendar-rendering/travelEventsToEventInput.ts` — converts `TravelEvent[]` to `EventInput[]` with insufficient/overconstrained color logic; joins against `locations` at render for the `Home → Office` title

### Server actions
- `actions/calendar-actions/fetchCalendarData.ts` — added queries for both new tables
- `actions/calendar-actions/fetchFreshState.ts` — same, for stale-version refetch
- `actions/calendar-actions/syncCalendarData.ts` — wired in new handlers, bumped transaction timeout to 30_000ms
- `actions/calendar-actions/sync-handlers/categoryEventHandlers.ts` — **new** — collapses updates into delete + createMany pair
- `actions/calendar-actions/sync-handlers/travelEventHandlers.ts` — **new** — same shape

### Diff/sync glue
- `utils/server-handlers/compareCalendarData.ts` — added `categoryEvent` and `travelEvent` change groups; `stripDbMetadata` helper normalizes timestamp fields before comparison

### State + hooks
- `redux/slices/calendarSlice.ts` — added `categoryEvents` and `travelEvents` to state; updated `updateCalendarArrayData` reducer
- `redux/thunks/calendarThunks.ts` — thunk signatures updated
- `hooks/useFetchCalendarData.ts` — passes new fields to `initializeState`
- `hooks/useCalendarServerSync.ts` — added `previousCategoryEvents`/`previousTravelEvents` refs; expanded `initializeState` signature; updated rollback/adopt logic
- `hooks/useManuallyRefreshCalendar.ts` — adapted for new fields

### UI
- `context/CalendarProvider.tsx` — exposes `categoryEvents` and `travelEvents` through context; one-shot empty-state autoregen gated by `isInitialColdLoadRef` + `useRef` + tightened precondition
- `app/(protected)/calendar/_components/Calendar.tsx` — merges the four render streams in a `useMemo`; renders category occurrences as background events; renders travel with `TravelEventContent`; reads `locations` from the schedulingSettings slice to pass into `travelEventsToEventInput`
- `utils/calendarUtils.ts` — `transformEventsForFullCalendar` simplified; the legacy-eventType filter and the `isCategory`/`isTemplate` branches were removed (see "Production data risk")

## Notes for a future agent

1. **Decoration churn is inherent.** CategoryEvent's trespass flags and TravelEvent's insufficient/overconstrained flags are placement-decision outputs — moving one task can flip flags on multiple surrounding rows. The delete + createMany pattern makes this cheap (2 batched queries per regen regardless of how many rows changed), but the *write count* is still proportional to schedule churn radius, not literal-placement-shift count. Acceptable but worth knowing if you're tuning sync latency.

2. **TravelEvent FK SET NULL — orphan rendering.** Deleting a Location leaves orphan TravelEvents until next regen; renderer falls back to "Unknown". Switching the cascade to DELETE would eliminate orphans at the cost of disappearing rendered travels mid-session; the SET NULL + render fallback was chosen to favor continuity.

3. **Window-edit doesn't cascade.** Cascade fires on DELETE, not UPDATE. Editing a window's startTime/endTime/day leaves stale CategoryEvent spans until the next regen. If the engine ever stops auto-regenerating on every window edit, this becomes a visible staleness bug.

4. **30s transaction timeout — not load-tested.** Worst-case math (4-week initial horizon, 7 categories × 5 weekly windows = 140 CategoryEvents on first regen; expansion can multiply this). With the delete + createMany handler it's all batched, so the budget is much more comfortable than the original sequential pattern, but headroom under real prod load is unmeasured.

5. **The other sync handlers still use the sequential `for (const e of update) operations.push(...)` pattern**. CategoryEvent and TravelEvent were collapsed to delete + createMany first because they're entirely engine-derived. The same simplification is NOT safe for handlers whose tables have user edits, FK relations crossing regens, or audit-meaningful timestamps (Planner, SimpleEvent, Category, Location, etc.).
