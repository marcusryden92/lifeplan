# Travel Time System - Technical Analysis

This document analyzes the full travel time and slot generation system, including how it's structured, why it's complex, and where the fundamental fragility comes from. Written to inform a potential restructure.

---

## Table of Contents

1. [How Travel Works End-to-End](#how-travel-works-end-to-end)
2. [Phase 1: Static Travel Carving (SlotBuilder)](#phase-1-static-travel-carving-slotbuilder)
3. [Phase 2: Dynamic Travel Placement (SlotReserver)](#phase-2-dynamic-travel-placement-slotreserver)
4. [The Location Chain — How prevLocationId and nextLocationId Get Built](#the-location-chain)
5. [How Travel Gets Removed and Replaced](#how-travel-gets-removed-and-replaced)
6. [Travel Event Naming and Identity](#travel-event-naming-and-identity)
7. [The Coordination Problem Between Phase 1 and Phase 2](#the-coordination-problem)
8. [Specific Structural Issues](#specific-structural-issues)
9. [Category Boundary Travel — The Complex Cases](#category-boundary-travel)
10. [Summary Diagram](#summary-diagram)

---

## How Travel Works End-to-End

Travel in this system serves one purpose: represent the real-world time cost of moving between locations. It surfaces as `SimpleEvent` objects on the calendar, rendered in gray (sufficient) or red (insufficient travel time available).

There are two distinct phases where travel is created:

**Phase 1 — Static carving** (`SlotBuilder.carveTravelFromChain`): Runs during slot-building before any tasks are scheduled. Reads the gap between existing fixed events (templates, plans, completed items) and pre-carves travel into those gaps. These are called "gap travel" events, identified by `eventId` starting with `travel-gap-*` or `travel-insufficient-*`.

**Phase 2 — Dynamic placement** (`SlotReserver.reserveSlotWithTravel`): Runs when a task is scheduled into a slot. Creates `travel-to-{taskId}` (before the task) and `travel-from-{taskId}` (after the task) events based on the task's location relative to its neighbors.

These two phases need to coordinate. When a task fills a gap that Phase 1 already put travel into, Phase 2 must remove the old travel and lay down new travel that accounts for the task's position. This coordination is the source of most of the complexity.

---

## Phase 1: Static Travel Carving (SlotBuilder)

### Pipeline

`buildAvailableSlots()` runs this pipeline on every day before scheduling starts:

```
1. eventsToIntervals()         — convert fixed events to intervals with locationId
2. masksToIntervals()          — convert template masks to intervals with locationId
3. applyCategoriesToNullIntervals() — assign category location to null-location events
                                      that fall within a category window
4. findGaps()                  — find free time between occupied intervals,
                                  returns TimeSlot[] directly with prevLocationId/nextLocationId
5. leading buffer application  — shrink slots that follow fixed events (not start-of-day)
6. fixPostCategoryPrevLoc()    — fix incorrect prevLocationId on slots after a category period
7. splitSlotsAtCategoryBoundaries() — split slots at category start/end times, tag categoryId
8. carveTravelFromChain()      — walk slot chain, create travel where location transitions occur,
                                  using outgoingTransitions set to determine direction
9. mergeAdjacentSlots()        — merge adjacent available slots back together
```

### What `carveTravelFromChain` does

This is the most complex function in the system. It walks the slot array looking for slots where `prevLocationId !== nextLocationId`, then cuts travel out of those gaps.

The key decision at each transition is **direction**: should travel go at the START of the slot (returning after a foreign event) or at the END (departing for a foreign event)?

```
Travel at END:    [...available time...] [travel] → next-event @ nextLoc
Travel at START:  prev-event @ prevLoc → [travel] [...available time...]
```

Direction is determined by `outgoingTransitions`, a `Set<string>` of `"fromLoc->toLoc"` pairs that grows as going-travel is carved. A gap is a **return trip** (travel at START) when the mirror of its `(prevLoc, nextLoc)` pair is already in the set — i.e., an earlier gap in the same day already had `outgoingTransitions.add("nextLoc->prevLoc")`. This implements the bracket model: going-travel at END, symmetric returning-travel at START.

```typescript
const placeAtStart = outgoingTransitions.has(`${nextLoc}->${prevLoc}`);
// ...
if (!placeAtStart) outgoingTransitions.add(`${prevLoc}->${nextLoc}`);
```

On top of this direction decision, there are four special-case branches that override the default behavior:

**Case A — Adjacent category slot bypass (`catSlotTooSmall`):** When a pre-category slot transitions `prevLoc → catLoc`, and the immediately-following category slot transitions `catLoc → nextLoc`, but the category slot is smaller than the `catLoc → nextLoc` travel time — skip the intermediate catLoc stop and travel directly `prevLoc → nextLoc` from the end of the combined span. Records `prevLoc->nextLoc` as an outgoing transition.

**Case B — Combined span overflow (`combinedTooSmall`):** Same two-slot setup, but the combined span is too small for both hops — travel directly `prevLoc → nextLoc` from the start. Also records `prevLoc->nextLoc`.

**Case C — Double-transition inside a category:** A slot inside a category window has a foreign `prevLoc` AND a foreign `nextLoc`. Place return travel (prevLoc→catLoc) at start and departure travel (catLoc→nextLoc) at end if both fit; otherwise fall through to single merged travel. Records `catLoc->nextLoc` as an outgoing transition.

**Case D — Last category slot return overflow (`placeAtStart && categoryId && travelMinutes >= durationMinutes`):** Returning from a foreign plan inside a category window, but the return travel fills the entire category slot. Skip the category stop, absorb the post-category slot, and travel directly to the final destination. This is a return trip — no outgoing transition is recorded.

**Case E — Backward bleed into adjacent slots:** When a travel block doesn't fit in its own slot but an adjacent slot provides extra room, the travel bleeds backward or forward into that adjacent slot, shrinking it.

All of this logic runs before any tasks are scheduled. It encodes static knowledge about what travel will be needed between fixed events.

---

## Phase 2: Dynamic Travel Placement (SlotReserver)

### When it runs

Every time `Scheduler.scheduleTask()` succeeds, `reserveTaskSlot` is called, which calls `slotManager.reserveSlotWithTravel()`. This reserves the task's time and also creates travel before/after it.

### What `reserveSlotWithTravel` does

Given a task, slot, and pre-calculated travel requirements:

1. **Absorb prev task's travel-after** (if `absorbPrevTravelAfter=true`): Find and remove the `travel-from-*` slot that was placed after a previous same-location task. Expand the available slot backward to reclaim that space.

2. **Find the slot**: Locate the available slot that contains `[travelBeforeStart, taskEnd + buffer]`. The search requires the slot to span the full range.

3. **Remove conflicting gap travel going to the same destination**: Any `travel-gap-*` or `travel-insufficient-*` slot that goes to `taskLocationId` near the task start is removed (it was pre-carved but the task now fills the gap differently).

4. **Create travel-before slot**: A `travel-to-{taskId}` occupied slot placed at `[taskStart - buffer - travelBefore, taskStart - buffer]`.

5. **Reclaim pre-carved travel at end of slot** (if task is at same location as slot's nextLocationId): Remove the `travel-gap-*` slot that was pre-carved after this gap, since the task's location matches the destination. The reclaimed time extends the free slot end.

6. **Remove existing travel-after going to same nextLocation**: Any occupied travel ending near `slot.end` that goes to `nextLocationId` is removed (will be replaced with new correctly-positioned travel).

7. **Create travel-after slot**: A `travel-from-{taskId}` occupied slot placed at `[taskEnd + buffer, taskEnd + buffer + travelAfter]`.

8. **Split the original slot**: Replace the original available slot with:
   - A slot before the task (if travel-before is placed inside the slot)
   - A slot after travel-after + buffer (or after task + buffer if no travel-after)

### Where `reserveTaskSlot` does additional work

Before calling `reserveSlotWithTravel`, `reserveTaskSlot.ts` also tries to place travel-before *outside* the selected slot (in the preceding gap):

1. Calculate `travelEnd = slot.start - buffer`
2. Call `canPlaceStandaloneTravelBefore(travelEnd, travelBefore)` — reads available slots to see if there's room in the buffer zone before the slot.
3. If yes: `reserveStandaloneTravelBefore(travelEnd, travelBefore, ...)` — splits the preceding slot to fit the travel block.
4. Set `effectiveTravelBefore = 0` so `reserveSlotWithTravel` doesn't also reserve it inside.

The same outside-placement check also happens in `selectBestSlot` to calculate slot capacity requirements. This means `canPlaceStandaloneTravelBefore` is called twice — once during selection to check feasibility, and once during reservation to actually place the travel. If slot state changes between the two calls (possible if tasks share days), the results could differ.

---

## The Location Chain

### Construction

The `prevLocationId` / `nextLocationId` on every `TimeSlot` is the core of the travel system. Travel is only carved when this chain shows a location change. The chain is built in layers:

**Step 1 — `eventsToIntervals`:**
Converts `SimpleEvent[]` to `Interval[]`. Each interval's `locationId` comes from `plannerLocationMap.get(event.extendedProps.eventId)`. Events without a planner entry get `null` (Anywhere).

**Step 2 — `masksToIntervals`:**
Converts template masks to intervals. Each template's `locationId` comes directly from the mask (populated from `LocationMapper`).

**Step 3 — `applyCategoriesToNullIntervals`:**
For null-location events that fall entirely within a category period that has a location, assigns the category's location to the interval. This prevents "Anywhere" events inside a Work category from tunneling the prevLoc chain back to the home-location template before the work window.

**Step 4 — `findGaps`:**
Merges occupied intervals and finds free time between them. For each gap, it walks backward through the merged intervals to find the nearest non-null `locationId` — that becomes `prevLocationId`. The immediately following interval's location (which may be `null`) becomes `nextLocationId`.

**Note on `mergeIntervals` in `findGaps`:** Because gaps are found between *merged* intervals, overlapping events at the same location merge into one. This is correct for time accounting but loses per-event identity.

**Step 5 — `fixPostCategoryPrevLoc`:**
Corrects slots whose `prevLocationId` is wrong because of null-location events after a category period. If a slot starts after a category period ends, and there's no non-null-location event between the period end and the slot start, the slot's `prevLocationId` is overridden to the category's location.

**Step 6 — `splitSlotsAtCategoryBoundaries`:**
Splits slots at category start/end times. At an "entering" boundary (category starts), the after-fragment gets `prevLocationId = catLoc`. At an "exiting" boundary (category ends), the before-fragment gets `nextLocationId = catLoc` (or the adjacent category's location if one starts at the same boundary).

**Step 7 — `carveTravelFromChain`:**
Consumes slots where `prevLoc !== nextLoc`, outputting travel occupied slots and shorter available slots. The surviving available slots get updated `prevLocationId` reflecting what location they now "follow" (e.g., after a `travel-at-start` slot, `prevLoc` is updated to `nextLoc`).

### Note: `findGaps` returns `TimeSlot[]` directly

`findGaps` in `intervalUtils.ts` now returns `TimeSlot[]` with `isAvailable: true` and `durationMinutes` populated inline. The intermediate `GapInterval` type and the `gapsToTimeSlots` conversion function have been removed. `SlotBuilder` uses `findGaps`'s output directly.

### Key fragility: `mergeIntervals` loses location on overlap

`findGaps` calls `mergeIntervals` which takes the first interval's `locationId` when merging. If two templates occupy the same block (e.g., a Sleep template and a Work template overlap accidentally), the merged interval has the first template's location. The subsequent gap's `prevLocationId` reflects that, not necessarily the last event's location.

### Key fragility: `findGaps` `nextLocationId` can be `null`

If the event *after* a gap has `locationId: null` (Anywhere), `nextLocationId` on the gap is `null`. `carveTravelFromChain` skips carving when either `prevLoc` or `nextLoc` is `null`. This is correct (can't calculate travel to "anywhere"), but it means a null-location template at the end of a work window can suppress travel carving for the return-home transition. `applyCategoriesToNullIntervals` is specifically designed to prevent this, but only for events that are entirely within a category period.

---

## How Travel Gets Removed and Replaced

Travel slots are stored in `occupiedSlots` as `TimeSlot` objects. They are never persisted — they're rebuilt from scratch every time `buildDailySlots` is called, plus modified during task scheduling.

### Travel removal mechanisms

There are four distinct removal operations:

**1. Full day rebuild:** `carveTravelFromChain` starts by filtering out all `travel-gap-*` and `travel-insufficient-*` from `occupiedSlots` for the day before adding new ones. This makes rebuilding idempotent.

**2. Pre-carve conflict removal in `reserveSlotWithTravel`:** When placing a task, any existing travel going *to* `taskLocationId` that ends within `TRAVEL_SEARCH_WINDOW_MS` of the task start is removed. This handles the case where a gap previously had pre-carved travel, but the task now fills part of the gap.

**3. Travel-after replacement:** When placing a task with `travelAfter > 0`, any existing travel going to `nextLocationId` that ends within `TRAVEL_SEARCH_WINDOW_MS` of the slot's end is removed. This is the "travel shifts forward" pattern — if A→B→gap→C existed, and a new task fills part of the gap, the B→C travel needs to shift forward to start after the task.

**4. Travel absorption:** When `absorbPrevTravelAfter=true`, the `travel-from-*` slot from the previous same-location task is found by searching for a travel slot departing from `taskLocationId` within `TRAVEL_SEARCH_WINDOW_MS` of the current slot start. It's removed and the available slot is expanded backward.

**5. Same-location pre-carve reclamation:** After a task is placed, if `travelAfter = 0` and `taskLocationId === nextLocationId`, the system searches for a `travel-gap-*` or `travel-insufficient-*` slot going to `nextLocationId` that ends just after `slot.end`. If found, it's removed and `freeSlotEnd` is extended to `reclaimedTravelEnd`.

### Why `TRAVEL_SEARCH_WINDOW_MS` matters

`TRAVEL_SEARCH_WINDOW_MS` (from `SCHEDULING_CONFIG`) is the tolerance used for all the "near" searches above. If this window is too small, valid travel slots aren't found and get duplicated. If too large, unrelated travel on the same day gets accidentally removed. The window currently appears to be set to a fixed value — it doesn't adapt to buffer time or actual travel durations.

`findAdjacentTravelTo` uses a separate hardcoded 10-minute window on top of buffer time.

---

## Travel Event Naming and Identity

Travel slots use `eventId` string prefixes as a type system:

| Prefix | Created by | Meaning |
|--------|------------|---------|
| `travel-gap-{slotStartMs}` | `carveTravelFromChain` | Pre-carved gap travel between fixed events |
| `travel-insufficient-{slotStartMs}` | `carveTravelFromChain` or `reserveSlotWithTravel` | Travel needed but not enough space |
| `travel-to-{taskId}` | `reserveSlotWithTravel` or `reserveStandaloneTravelBefore` | Travel before a specific task |
| `travel-from-{taskId}` | `reserveSlotWithTravel` or `reserveStandaloneTravelAfter` | Travel after a specific task |

Code throughout the system checks these prefixes to distinguish pre-carved travel from dynamic task travel:

```typescript
const isPreCarved = occ.eventId?.startsWith("travel-gap-") ||
                    occ.eventId?.startsWith("travel-insufficient-");
```

This prefix-based distinction is the mechanism that prevents dynamic task travel from being reclaimed during scheduling, while allowing pre-carved travel to be reclaimed when a same-location task fills the gap.

---

## The Coordination Problem

The fundamental tension in this system is that **Phase 1 (static carving) doesn't know about tasks**, and **Phase 2 (dynamic placement) needs to undo and redo Phase 1's work** as tasks fill gaps.

This creates several coordination points, each of which can go wrong:

### Coordination Point 1: Pre-carve conflict removal

When `reserveSlotWithTravel` places travel-before, it removes any existing travel going to `taskLocationId` near the task start. This works when the pre-carved travel is exactly where expected.

It can fail when:
- The pre-carved travel has a different `travelToLocationId` than `taskLocationId` (e.g., travel was carve from templateLoc to catLoc, but the task going into the slot has a slightly different location resolution)
- Multiple tasks land near the same pre-carved travel, and the second task's removal window hits the first task's dynamic travel instead

### Coordination Point 2: Travel-after replacement

When a task is placed with `travelAfter > 0`, the system removes existing travel going to `nextLocationId` near `slot.end`. This is intended to replace a pre-carved gap→nextEvent travel with the new task→nextEvent travel.

It can fail when:
- `slot.end` (the available slot's end) doesn't coincide with the pre-carved travel's end (it shouldn't after buffers are applied)
- The search window catches unrelated same-destination travel on the same day

### Coordination Point 3: Reclaiming pre-carve when task matches destination

When a task at location X is placed in a slot whose `nextLocationId` is also X, the pre-carved travel leading from X to the next event should be unnecessary (the task is *already* at X, so the pre-carved travel was based on the previous template location, not the task's location). The system reclaims this by searching for `travel-gap-*` going to `nextLocationId` near `slot.end`.

This logic only triggers when `travelAfter = 0`, meaning it assumes that if the task matches the destination, no new travel-after is needed. But `travelAfter` is calculated before reservation — it could be 0 because the task matches `nextLocationId`, or it could be 0 because a reusable travel slot was found. These cases are conflated.

### Coordination Point 4: `canPlaceStandaloneTravelBefore` called twice

`selectBestSlot` calls it to calculate slot capacity. `reserveTaskSlot` calls it again to decide whether to actually place it outside. Between these two calls, other tasks could have been scheduled on the same day (for goal sub-tasks scheduled sequentially). If a different task fills the available space in the preceding slot between the two calls, the capacity calculation would have been wrong.

---

## Specific Structural Issues

The following issues were present in the original code. Items marked **fixed** have been addressed.

### 1. Mutable array iteration in `carveTravelFromChain`

```typescript
// In the loop body:
slots[i + 1] = { ...nextSlot, start: newCatStart, ... };
skipNextSlot = true;
```

The function mutates `slots[i+1]` while iterating over `slots`. This is intentional but fragile — if multiple adjacent special cases trigger, they interact through this mutation. The `skipNextSlot` flag is a secondary control flow mechanism layered on top of the loop.

### 2. ~~`GapInterval` / `gapsToTimeSlots` indirection~~ **Fixed**

`findGaps` previously returned a `GapInterval[]` which `gapsToTimeSlots` converted to `TimeSlot[]` by adding `durationMinutes` and `isAvailable: true`. The intermediate type added no value. `findGaps` now returns `TimeSlot[]` directly, `GapInterval` is removed, and `SlotBuilder` no longer calls `gapsToTimeSlots`.

### 4. `selectBestSlot` finds the original slot by timestamp match

```typescript
const slot = fittingSlots.find(
  (s) => s.start.getTime() === scoredSlot.slot.start.getTime(),
);
```

`scoreSlots` reduces each slot to just `{start, end, durationMinutes}` (strips location info). Then `selectBestSlot` tries to recover the full slot with location info by matching on start time. This works as long as no two slots on different days start at the same timestamp, which should hold because day boundaries differ — but it's an unnecessary indirection that could be simplified.

### 5. `freeSlotEnd` priority in `reserveSlotWithTravel`

The free slot end after a task is determined by the first non-null of:
1. `reclaimedTravelEnd` — pre-carve was reclaimed
2. `removedTravelAfterEnd` — previous task's travel-after was removed
3. `reusableTravelStart - buffer` — existing travel is reused
4. `slot.end` — default

These can all be non-null simultaneously in theory. The priority order isn't obviously the correct one for all combinations.

### 6. `reserveSlotWithTravel` finds the slot by spanning the full `[fullStart, taskReserveEnd]` range

```typescript
const slotIndex = slots.findIndex(
  (slot) =>
    slot.isAvailable &&
    slot.start.getTime() <= fullStart.getTime() &&
    slot.end.getTime() >= taskReserveEnd.getTime(),
);
```

This works only if the available slot that was selected during `selectBestSlot` hasn't been shrunk between selection and reservation. If absorption expanded a slot backward but a concurrent task (unlikely, but possible in goal scheduling) modified the same day's slots, the slot bounds could be wrong.

### 5. ~~Travel direction uses `dayHomeLoc` heuristic~~ **Fixed**

The original `shouldPlaceTravelAtStart` method matched `nextLoc === dayHomeLoc` (the `prevLocationId` of the first available slot of the day) to detect return trips. This was fragile and not the intended bracket semantics.

Replaced with `outgoingTransitions: Set<string>`. A gap is classified as a return trip when the mirror of its `(prevLoc, nextLoc)` is already in the set, meaning the corresponding going-travel was carved earlier in the same day's chain. This is a structural check rather than a location-matching heuristic and correctly handles categories, multi-hop journeys, and bypass cases.

### 7. Two location maps with subtle different semantics

- `locationMap` (plannerLocationMap in most places): includes category location as a fallback. Used for slot building's location chain.
- `travelLocationMap` (plannerTravelLocationMap): excludes category location. Used in `findValidSlots` for calculating `taskLocationId`.

The slot builder uses the full `locationMap` (with category fallback) for building the `prevLocationId`/`nextLocationId` chain. Task scheduling uses `travelLocationMap` (no category fallback) for deciding whether a task needs travel.

This asymmetry is intentional — category location is "soft" and shouldn't force travel generation — but it means the location chain used for pre-carving can include category-location-derived entries that would never trigger dynamic travel generation. The `applyCategoriesToNullIntervals` function adds category locations to null-location events specifically because of this.

### 8. `mergeIntervals` loses location data on overlapping intervals

`findGaps` calls `mergeIntervals`, which keeps the first interval's `locationId` when merging overlaps:

```typescript
// Current behavior: last.end is extended, but last.locationId stays unchanged
if (current.start <= last.end) {
  last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
}
```

If a Home template (06:00-08:00) and a Work template (08:00-17:00) are adjacent and merge, the merged interval has the Home location. The gap *after* 17:00 gets `prevLocationId = Home`, not `Work`. This would trigger spurious travel generation if the next event is at a non-Home location.

In practice, templates are designed to not overlap, so merging only happens at exact boundaries — but exact boundary merging means `current.start === last.end`, which satisfies `current.start <= last.end` and triggers the merge. The result depends on which template's interval appears first in the sorted order.

---

## Category Boundary Travel — The Complex Cases

Category boundaries are the most complex part because categories introduce location transitions that are planned (not ad-hoc), and the travel between category periods needs to be carved deterministically.

The slot builder handles this with the five special cases in `carveTravelFromChain`. Here's what they address:

### Case: Adjacent categories at different locations

```
[Category A @ Work 9-12] [Gap] [Category B @ Gym 13-17]
```

The gap between A and B has `prevLoc = Work`, `nextLoc = Gym`. Normal "travel at end" would carve Work→Gym travel at the end of the gap. This is correct.

### Case: Plan inside a category window at a foreign location

```
[Work category 9-17]
  [Plan @ Gym 11-12]  ← inside work window but foreign location
```

The category slot before the plan has `prevLoc = Work`, `nextLoc = Gym`. The category slot after the plan has `prevLoc = Gym`, `nextLoc = Work`. `shouldPlaceTravelAtStart` fires for the after-slot (returning to work after Gym), placing return travel at the start.

### Case: Plan inside a category window but the category slot is too small for return travel

This is the `placeAtStart && categoryId && travelMinutes >= durationMinutes` case. If the return-to-work travel takes longer than the remaining category time after the plan, the system absorbs the next (post-category) slot and travels directly from Gym to whatever comes after Work, bypassing the Work location entirely.

This is a key source of complexity and a likely source of weirdness — the system is making a "skip the category home" decision because of a space constraint, which means the category location doesn't appear in the actual calendar at all for that transition.

### Case: Pre-category slot too small for the indirect route

```
[Morning at Home] [Tiny gap] [Work 9-17] [Plan @ Gym 17-18]
```

The tiny gap has `prevLoc = Home`, `nextLoc = Work`. But Work is immediately followed by Gym. The `catSlotTooSmall` check detects that the Work→Gym travel doesn't fit in the Work slot and collapses the Home→Work→Gym route into a direct Home→Gym travel.

---

## Summary Diagram

```
INPUT: fixed events (templates, plans, completed)
  |
  v
eventsToIntervals + masksToIntervals
  |
  v
applyCategoriesToNullIntervals
  (category location propagated into null-loc events inside windows)
  |
  v
findGaps
  (prevLocationId = nearest backward non-null location)
  (nextLocationId = next interval's locationId, may be null)
  |
  v
leading buffer → fixPostCategoryPrevLoc
  |
  v
splitSlotsAtCategoryBoundaries
  (slots tagged with categoryId, prevLoc/nextLoc adjusted at boundaries)
  |
  v
carveTravelFromChain  [COMPLEX — 5 special cases + direction logic]
  (pre-carved travel slots added to occupiedSlots as travel-gap-* or travel-insufficient-*)
  (remaining available slots have updated prevLocationId)
  |
  v
mergeAdjacentSlots → availableSlots[dayKey]
  |
  |  SCHEDULING LOOP (per task)
  |    findValidSlots → scoreSlots → selectBestSlot
  |      (calculates travelBefore, travelAfter, canAbsorbPrev, reusableTravel)
  |      (checks canPlaceStandaloneTravelBefore)
  |    reserveTaskSlot
  |      (optionally calls reserveStandaloneTravelBefore)
  |      calls reserveSlotWithTravel
  |        - removes conflicting pre-carved travel (travel-gap-* near task start)
  |        - removes travel-after being shifted (travel-* near slot.end to nextLoc)
  |        - optionally absorbs prev task's travel-from-* slot
  |        - optionally reclaims pre-carved travel at same-location destination
  |        - creates travel-to-{taskId} before task
  |        - creates travel-from-{taskId} after task
  |        - splits available slot into before/after fragments
  |
  v
occupiedSlots contains: travel-gap-*, travel-insufficient-*, travel-to-*, travel-from-*
  |
  v
TravelConverter.generateTravelEvents()
  (converts all occupiedSlots travel entries to SimpleEvent output)
```

### The Rewrite Question

The system is fundamentally sound in its design — two-phase travel is a reasonable approach. Two issues have been fixed:

- **`GapInterval`/`gapsToTimeSlots` indirection** — removed. `findGaps` now returns `TimeSlot[]` directly.
- **`dayHomeLoc` heuristic** — removed. Direction is now determined by `outgoingTransitions: Set<string>`, which tracks going-travel as it is carved and classifies a later gap as a return when the mirror pair is already in the set.

Remaining issues if a deeper restructure is warranted:

1. **State coordination via heuristic time windows** — removal and reclamation rely on `TRAVEL_SEARCH_WINDOW_MS` proximity checks rather than explicit slot identity tracking.
2. **Complex multi-case path logic in `carveTravelFromChain`** — the four special cases interact with each other and are difficult to reason about exhaustively.
3. **Mutable iteration** in `carveTravelFromChain` — mutating `slots[i+1]` during the loop makes correctness hard to verify.
4. **Dual capacity checks** — `selectBestSlot` and `reserveTaskSlot` both call `canPlaceStandaloneTravelBefore`, creating a TOCTOU window.
5. **Implicit location chain semantics** — the `prevLocationId`/`nextLocationId` propagation rules are embedded across four separate transformation steps, any of which can introduce errors that cascade.
