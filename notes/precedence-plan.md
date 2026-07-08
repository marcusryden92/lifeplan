# Precedence — queues (pipes) and dependencies for Planner items

One system, two user-facing concepts, one engine representation. This plan is self-contained and supersedes the earlier queues-only plan.

## Context

Goals conflate "completable outcome" with "ordered container". Work streams (e.g. a Work pipeline) need ordering without finitude — today users would endlessly append subtasks to a fake goal. Separately, root-level items need prerequisite links ("get married" needs "find a girlfriend" AND "get an apartment") that no container expresses — the items don't fit under one category, they just need to be linked.

Two concepts, deliberately distinct:

- **Queue (pipe)** — a new first-class entity: a persistent, user-authored, ordered list of references to existing root-level Planner items (tasks and goals). No endpoint; members are continually added and dissolved; they exit in the order they entered. Ordering is a chosen throughput discipline, not logic. Deliberately NOT a plannerType: it holds mixed item kinds, needs none of a planner's fields, and gets its own flat, directed-list UI at `/queues`.
- **Dependency** — a logical prerequisite edge between root-level items. Multi-predecessor ("multi-branch topological sort"), order among prerequisites irrelevant, authored in the item editor. No container entity — the connected component of the dependency graph IS the "project"; it is derived, never declared. No Project model, ever.

Both compile to the same engine representation: `PrecedenceEdge[]` with a `source` discriminator (`"queue" | "dependency"`). The engine gates each candidate on **max end across all placed predecessors** and never sees a cycle — legality is enforced at authoring time, in the surface the user is touching.

### Decided semantics

1. **All members/successors schedule (full forecast)**, each bounded to start after the max of its predecessors' last placed ends — via the engine's existing `afterTime` plumbing (the `goalAfterTime` mechanism, which already threads end-to-end through `Scheduler.scheduleTask → findValidSlots → findAllFittingSlots`).
2. **Edge scope.** Both endpoints root-level, triaged, `task | goal`. Plans excluded (deferred). A planner belongs to **at most one queue** (DB unique on `QueueMember.plannerId`) → queue chains are a disjoint union, but dependencies make the merged graph a general DAG, so cycle validation is real.
3. **Orthogonality.** Pipe membership and dependency are independent. A pipe member may depend on an item outside any pipe; the pipe stalls at that member (FIFO among members preserved, the forecast shows the stall honestly). Successors never flow around a stalled member.
4. **Merged-graph validation, logical order.** Cycle checks run against the union of dependency edges and each queue's FULL logical member order (all members, including completed/unready — transparency affects gating, never legality; otherwise un-completing an item could resurrect a latent cycle). Validated on every mutation of either system: dependency add, queue member add, queue reorder. The engine never arbitrates.
5. **Redundant same-pipe dependencies are allowed** (B before D in a pipe, plus "D depends on B") — a durable fact that survives fluid pipe membership. Contradicting edges are blocked with the cycle path shown ("through the Work pipe: B → C → D") and a computed fix offered where one exists ("move D ahead of B" / "disconnect").
6. **Transparency (engine gating).** Completed members/predecessors: transparent, no bound (both sources). Unready-goal predecessor: queue → transparent silent skip (a pipe skips what can't flow); dependency → successor schedules unbounded + a LOUD message (a prerequisite never stops being a prerequisite). This asymmetry is intentional.
7. **Permanent placement failure** of a predecessor (TOO_LARGE, or NO_SLOTS at budget exhaustion) → successors schedule anyway, unbounded, plus an engine message. Pure budget exhaustion emits a distinct "past the horizon" flavor rather than pretending the sequence broke.
8. **Readiness gate (authoring-time).** A goal cannot be marked ready while any dependency predecessor is an unready goal. The Ready button grays/refuses with "Awaiting <title>"; a three-dot affordance per blocker offers "Ready <title>" (subject to that goal's own gate — no deep cascade) and "Disconnect dependency". Task predecessors and completed predecessors never block. Symmetrically, un-readying a goal that a READY goal depends on is refused ("Required by <title>") with the same shortcut affordance. The engine keeps a defensive fallback (#6) for states that slip through (assistant apply, multi-tab races).
9. **Queue's optional `categoryId` = inherited default**: members with no effective category of their own resolve to it (windows/strictness/location then follow the normal category machinery). Members with their own category keep it. Dependencies carry no category semantics.
10. **Graph view (deferred, shapes decisions now).** A future graph surface renders pipes as lanes and dependencies as connectors, and writes through the SAME validator. It must require zero new rules — every decision below preserves that property.

---

## Phase 1 — Data layer

New `prisma/schemas/models/queue.prisma` (mirror `category.prisma` idioms — string timestamps, userId cascade, `@@index([userId])`):

- `Queue`: `id uuid`, `title`, `sortOrder Int @default(0)` (queue-list order), `categoryId String?` → Category `onDelete: SetNull`, `userId`, string `createdAt`/`updatedAt`, `@@map("Queues")`.
- `QueueMember`: `id uuid`, `sortOrder Float @default(0)` (fractional key), `queueId` → Queue `onDelete: Cascade`, `plannerId String @unique` → Planner `onDelete: Cascade` (the unique IS the one-queue-per-planner invariant), `userId`, string timestamps, `@@map("QueueMembers")`.

New `prisma/schemas/models/dependency.prisma`:

- `PlannerDependency`: `id uuid`, `predecessorId` → Planner `onDelete: Cascade`, `successorId` → Planner `onDelete: Cascade`, `userId`, string timestamps, `@@unique([predecessorId, successorId])`, `@@index([userId])`, `@@map("PlannerDependencies")`. No sortOrder — prerequisite order is meaningless by definition. Rows are immutable (created or deleted, never updated).

Edits: back-references on `user.prisma` (`queues`, `queueMembers`, `plannerDependencies`), `calendar.prisma` Planner (`queueMember QueueMember?`, `dependenciesAsPredecessor`/`dependenciesAsSuccessor`), `category.prisma` (`queues Queue[]` — back-reference only). `types/prisma.ts`: `Queue = Prisma.QueueGetPayload<{ include: { members: true } }>` (nested-members is the app/Redux shape, Category.timeSlots precedent), `QueueMember`, `PlannerDependency`.

`pnpm prisma:migrate:dev --name add_precedence` then `pnpm prisma generate`.

## Phase 2 — Sync plumbing (checklist)

Queues: nested Redux shape; diff strips members from the queue group and flattens members across queues (exact `stripTimeSlots` pattern, [compareCalendarData.ts:337-388](utils/server-handlers/compareCalendarData.ts#L337-L388)). Dependencies: flat list, value-based diff producing creates/deletes only.

1. [fetchCalendarData.ts](actions/calendar-actions/fetchCalendarData.ts) — `db.queue.findMany({ where: { userId }, include: { members: true } })` + `db.plannerDependency.findMany({ where: { userId } })`; add `queues` and `dependencies` to returned data.
2. [fetchFreshState.ts](actions/calendar-actions/fetchFreshState.ts) — same queries; `FreshState` gains both.
3. [compareCalendarData.ts](utils/server-handlers/compareCalendarData.ts) — `DatabaseChanges` gains `queue: ChangeGroup<Omit<Queue,"members">>`, `queueMember: ChangeGroup<QueueMember>`, `dependency: ChangeGroup<PlannerDependency>`; initializers; diff blocks (stripMembers + flatMap members by id; dependency by value); new positional pairs threaded through BOTH `handleServerTransaction` and `compareData` signatures. If the keyed-object refactor of this seam is ever going to happen, before this lands is the last cheap moment — decide explicitly.
4. New `sync-handlers/queueHandlers.ts` — createMany skipDuplicates / `bulkUpdate` (`'"Queues"'`, columns title, sortOrder int, categoryId, updatedAt) / deleteMany userId-scoped. Mirror `categoryHandlers.ts`.
5. New `sync-handlers/queueMemberHandlers.ts` — same trio; bulkUpdate columns sortOrder (`double precision`), queueId, updatedAt.
6. New `sync-handlers/dependencyHandlers.ts` — createMany skipDuplicates / deleteMany userId-scoped; no bulkUpdate (immutable rows).
7. [syncCalendarData.ts](actions/calendar-actions/syncCalendarData.ts) — spread queue handler, then member handler, then dependency handler into `operations`, AFTER category and planner handlers (FK order).
8. [calendarSourceSlice.ts](redux/slices/calendarSourceSlice.ts) — `queues: Queue[]` + `dependencies: PlannerDependency[]` state; `hydrateSource` gains both; `setQueues` / `setDependencies`.
9. [useCalendarServerSync.ts](hooks/useCalendarServerSync.ts) — `previousQueues` + `previousDependencies` refs; `initializeState` args; `hasPendingChanges`; `runSync` pairs; `adoptFreshServerState` + `rollbackToLastConfirmedState`.
10. [useFetchCalendarData.ts](hooks/useFetchCalendarData.ts) — forward both into hydrate + initializeState.
11. [CalendarProvider.tsx](context/CalendarProvider.tsx) — selectors; `syncState` memo + deps; context value + `CalendarContextType` (+ `updateQueueArray`, `updateDependencyArray`).
12. [calendarThunks.ts](redux/thunks/calendarThunks.ts) — `CalendarPayload.queues?` + `.dependencies?` (value-or-updater); dispatch `setQueues`/`setDependencies` synchronously BEFORE the engine await; pass both in engine options. After `newPlanner` is computed, run central pruning (below) and dispatch if changed.
13. [useCalendarStateActions.ts](hooks/useCalendarStateActions.ts) — new `updateQueueArray(queues|fn, options?)` + `updateDependencyArray(...)`. Do NOT grow `updateAll`'s positional signature.

**Central pruning** — `utils/precedence/prunePrecedenceInputs.ts`: `pruneQueueMembers(queues, planner): Queue[]` drops members whose planner is missing / non-root / `plannerType === "plan"` / untriaged; `pruneDependencies(dependencies, planner)` drops edges whose EITHER endpoint fails the same test. Both return the SAME reference on no-op (no phantom diff). Completed + unready members/predecessors are kept (valid transparent links / gate inputs). Runs in the thunk, so delete/retype/reparent/untriage are covered wherever they originate; DB cascade covers server-side deletes.

## Phase 3 — Shared validation (`utils/precedence/`)

- `collectValidationEdges(queues, dependencies)` — queue full-logical-order consecutive edges (ALL members, no transparency filter — this is the validation graph, deliberately distinct from the engine's gated build; keep the two builders side by side with a comment stating the distinction, or someone will "unify" them and reintroduce the latent-cycle bug) + dependency edges.
- `findCycle(edges, candidateEdge): PrecedenceEdge[] | null` — returns the closing path for display, null when acyclic. Plain DFS; graphs are tiny.
- `wouldCreateCycle` variants for the three mutation shapes: add dependency, add queue member at position, reorder queue member.
- **One mutation choke point for queue writes**: `utils/queue-handlers/mutateQueueMembers.ts` — all member adds/reorders route through it so the validator has exactly one seam. UI never assembles member arrays ad hoc. Dependency writes get the same treatment in their picker commit path.
- Callers: the item-editor dependency picker, the queue mutation choke point, the future graph connector. One validator, three writers.

## Phase 4 — Engine

**4a. Input**: `GenerateCalendarOptions.queues?: Queue[]` + `dependencies?: PlannerDependency[]` ([calendarGeneration.ts](utils/calendar-generation/calendarGeneration.ts)) → `CalendarGenerationInput` ([SchedulingModels.ts](utils/calendar-generation/models/SchedulingModels.ts)); rows are plain JSON, worker-safe, no `engineWorkerClient` changes.

**4b. Category inheritance at the input boundary** — new `helpers/CalendarGenerator/applyQueueCategoryInheritance.ts`: for each root member with `categoryId === null` whose queue has one, return `{...p, categoryId: queue.categoryId}`; identity otherwise (same array reference on no-op). Applied in `calendarGeneration.ts` next to the `isTriaged` filter. Planner rows never flow out of the engine, so this is diff-safe, and `buildPlannerCategoryMap`, `resolveCategoryLocation`, `capacityCheck`, and eligibility matching all see it with zero signature changes.

**4c. Precedence map** — new `helpers/Scheduler/precedenceEdges.ts` (pure, source-agnostic names throughout):

- `PrecedenceEdge = { fromId, toId, source: "queue" | "dependency", queueId? }`.
- `buildPrecedenceEdges(queues, dependencies, planners)`:
  - Queues: per queue sort members by sortOrder, re-filter defensively (exists/root/task|goal/triaged), drop transparent members (completed, unready goals), emit consecutive-pair edges.
  - Dependencies: re-filter both endpoints defensively, drop completed predecessors (transparent), emit one edge per row. Unready-goal predecessors are NOT dropped (unlike queue transparency) — they flow to the gate so the fallback can be loud (semantics #6).
- `buildPredecessorMap(edges): Map<toId, PrecedenceEdge[]>` — a list per target; queues happen to produce one incoming edge per node, dependencies produce many. The gate is written multi-predecessor from day one.

Built in `CalendarGenerator` Phase 4 next to `buildPlannerCategoryMap`; hung on `SchedulingContext.predecessorMap` via `prepareSchedulingContext`.

**4d. Placement gate** in [scheduleTasksAndGoals.ts](utils/calendar-generation/helpers/Scheduler/scheduleTasksAndGoals.ts):

- Run state `chainOutcome: Map<plannerId, { status: "placed" | "failed"; lastEnd?: Date; failCause?: "failed" | "unready" | "horizon" }>`. Seed before the loop: edge sources not in `candidates` (memoized-past etc.) → `placed` with max subtree end from `context.scheduledEvents` (past-only, effectively unconstraining); unready-goal dependency predecessors → `failed` with cause `"unready"`; other unseedable non-candidates → `failed` (starvation guard).
- Candidate walk gate: no incoming edges → unchanged. ANY predecessor outcome missing → **skip** (stays in candidates; not added to `resolvedIds`). All `placed` → pass `afterTime = max(lastEnd over predecessors)`. Any `failed` (and none missing) → schedule bounded by the max over the PLACED subset (unbounded if none) + record `sequenceBreaks.push({source, queueId?, fromId, toId, cause})` per failed edge (deduped).
- Outcomes: task scheduled → `placed` with `event.end`; `permanentFailure` → `failed` (cause `"failed"`); NO_SLOTS → unset (successor keeps waiting through expansion, correct). Goal → `placed` with new `lastPlacedEnd` return; all-leaves-TOO_LARGE → `failed`.
- **Loop control (load-bearing):** (1) exclude blocked candidates from the watermark's biggest-remaining sizing (they must not trigger expansion they can't use); (2) after a pass that resolved ≥1 candidate while candidates remain, `continue` WITHOUT `expandSlots` — re-walk to unblock successors; only expand on a zero-progress pass. Finite: every non-expanding iteration resolves ≥1 candidate.
- **Budget exhaustion:** before the final NO_SLOTS push, mark all outcome-less edge sources `failed` with cause `"horizon"`, run ONE final gate-resolved walk (no expansion) so blocked successors attempt placement + emit breaks; leftovers get the existing NO_SLOTS failure.
- Return grows `sequenceBreaks: { source, queueId?, fromId, toId, cause }[]`; mirror in `core/Scheduler.ts`.

**4e. Signatures:** [scheduleSingleTask.ts](utils/calendar-generation/helpers/Scheduler/scheduleSingleTask.ts) gains `afterTime?` → passes to `scheduler.scheduleTask(task, afterTime)` (plumbing below it already exists). [scheduleGoal.ts](utils/calendar-generation/helpers/Scheduler/scheduleGoal.ts) gains `initialAfterTime?` (seeds `goalAfterTime`) and returns `lastPlacedEnd?` + all-leaves-TOO_LARGE signal.

**4f. Messages** ([EngineMessage.ts](utils/calendar-generation/models/EngineMessage.ts), emit producer in [coalesceMessages.ts](utils/calendar-generation/helpers/CalendarGenerator/coalesceMessages.ts) fed from `sequenceBreaks`, prose in [renderEngineMessage.ts](utils/renderEngineMessage.ts) — plain language, null-safe on deleted queue/planner; `EngineMessageLookups` gains `queueById`, update the lookup builder's caller in calendar/page.tsx):

- `QUEUE_SEQUENCE_BROKEN` — payload `{queueId, failedPlannerId}`, id `QUEUE_SEQUENCE_BROKEN::queueId|failedPlannerId`.
- `DEPENDENCY_BROKEN` — payload `{predecessorId, successorId, cause: "failed" | "unready"}`, id `DEPENDENCY_BROKEN::predecessorId|successorId|cause`.
- `SEQUENCE_PAST_HORIZON` — emitted instead of the broken flavor when the predecessor's only failure is budget exhaustion (cause `"horizon"`), both sources: "the forecast for <title> extends past the scheduling horizon".
- All three state the consequence, not just the fact: "…was scheduled without waiting for <predecessor>". `SchedulingFailureReason.DEPENDENCY_CONFLICT` stays unused (validation makes it unreachable).

## Phase 5 — UI: queues route

**Route `app/(protected)/queues/`** — clone the categories-page skeleton (subHeader, 260px rail + mainCard grid, `media.tablet` collapse, `_components/` folders with co-located css + index barrel):

- `QueueRail/` — queue list: create / inline rename / delete (`ConfirmModal`); dense-int sortOrder renumber (categories-rail precedent).
- `QueueMemberList/` — ordered rows: `TypeBadge` + title + `CategoryBadge` (queue's inherited category shown dimmed when member has none) + duration; completed members dimmed/struck (`plannerIsCompleted`) but draggable/removable; unready goals get a subtle hint. Drag-reorder copies the RolesStep flat-list grammar verbatim ([RolesStep.tsx](app/(protected)/onboarding/_steps/RolesStep.tsx)): before/after zones, transparent drag image, 0.4 opacity, 2px accent inset drop lines, Firefox `setData` quirk. Member `sortOrder` uses **fractional keys** (one-row diff per drag) — generalize `insertKeyAt`/`appendKey` from [sortOrderKeys.ts](utils/goal-handlers/sortOrderKeys.ts) for `{id, sortOrder}` shapes under `utils/queue-handlers/`. Adds and reorders go through the Phase 3 choke point; a reorder that would close a cycle through an external dependency path is blocked with the path shown.
- `AddMemberModal/` — fork the SearchPalette search/rank/render machinery into an `onPick(plannerId)` modal; filter: root, triaged, task|goal, not completed, not already in any queue, passes `wouldCreateCycle`.
- Queue header: category tie via `Combobox` (CategorySection precedent).
- All mutations dispatch through `updateQueueArray` (functional updates) — queue edits are engine input and must regen.

Other: [nav.ts](components/ui/shell/nav.ts) `NAV_ITEMS` entry (lucide `ListOrdered`, desktop only). `getEffectiveCategoryId` in [goalPageHandlers.ts](utils/goalPageHandlers.ts) gains optional `queueCategoryByRootId?: Map` so UI badges match the engine; sweep ALL callers (dashboard `buildTodayAgenda`/`buildUncompletedItems`, `ItemDetailLayout`, library/search surfaces showing `CategoryBadge`). Minimal "In queue: <name>" row in item-detail SideCards linking to `/queues`.

## Phase 6 — UI: dependencies + readiness gating

**Dependencies card** — new `SideCards` card on root items ([SideCards/](app/(protected)/items/[id]/_components/SideCards/)):

- **Depends on** — chip list (title + `TypeBadge`, click navigates) with remove; `Combobox` picker to add. Candidate filter: root, triaged, `task | goal`, not self, not already linked, and `findCycle` returns null (filter the list AND hard-check on commit). An otherwise-sensible candidate excluded by a cycle shows disabled with the path as the reason — the block-and-explain surface. The "move it in the pipe" one-click fix (semantics #5) can ship as a fast-follow; plain block-with-path first.
- **Required by** — read-only reverse list (click navigates). The minimal "viewed somewhere" until the graph view exists.
- Mutations dispatch through `updateDependencyArray` (functional updates) — engine input, must regen.

**Readiness gate** — extends the existing blocker mechanism in [ItemDetailLayout.tsx:231-237](app/(protected)/items/[id]/_components/ItemDetailLayout/ItemDetailLayout.tsx#L231-L237) (currently: subtasks + deadline):

- New pure helpers `utils/precedence/readinessBlockers.ts`: `dependencyReadyBlockers(plannerId, dependencies, planner): Planner[]` — predecessor goals that are unready and uncompleted; `readyDependents(plannerId, ...)` — ready goals depending on this one.
- `readyBlockers` gains one entry per blocker: "Awaiting <title>". The existing flash-message refusal path handles the copy.
- Beside the Ready button, when dependency blockers exist: a three-dot trigger opening a popover (existing popover primitives + `usePopoverPosition`) listing each blocker with two actions: **Ready <title>** (calls `setGoalIsReady` for that goal, itself gated — if THAT goal is blocked, show its blockers in place rather than cascading) and **Disconnect dependency** (removes the edge via `updateDependencyArray`).
- Un-ready path: extend the existing `hasCompletedActivity` refusal with the symmetric check — "Required by <title>" + the same popover offering **Un-ready <title>** / **Disconnect**.
- `toggleGoalIsReady` / `setGoalIsReady` ([toggleGoalIsReady.ts](utils/goal-handlers/toggleGoalIsReady.ts)) stay dumb subtree stampers; gating lives at call sites. Audit every caller (item detail, subtasks EditDrawer, any future surface) as a checklist item — a missed site produces the unready-predecessor state, survivable (loud engine fallback) but sloppy.

## Phase 7 — AI assistant containment

Dependencies and queues are NOT exposed to the assistant initially (no tools, not in the prompt). Two containment duties:

- `applyDraftForestToPlanner` clamps `isReady: true` to false on any goal with dependency blockers at save time (mirroring the UI gate; the readiness cascade then stamps the subtree consistently).
- Assistant deletes of roots under an edge/membership need no special handling — central pruning (Phase 2) drops them on the next thunk pass.

Assistant read/write of precedence is separate future work.

## Phase 8 — Tests

- `__tests__/calendar-generation/queue-sequence.test.ts` (fixture pattern, fake timers): (1) two tasks in a queue → second starts ≥ first's end; (2) task→goal chain → goal's first leaf after task end; (3) completed member transparent; (4) unready goal skipped silently, no message; (5) TOO_LARGE predecessor → successor places unbounded + exactly one deduped `QUEUE_SEQUENCE_BROKEN`; (6) chain reaching past the 28-day chunk → all members place (blocked-candidate × expansion interplay); (7) stable regen → empty diff.
- `__tests__/calendar-generation/dependency-gate.test.ts` (fixture pattern): (1) two-predecessor goal starts after the LATER predecessor's end; (2) completed predecessor transparent; (3) unready predecessor → successor unbounded + one `DEPENDENCY_BROKEN(cause: unready)`; (4) failed predecessor → `cause: failed`; (5) budget exhaustion → `SEQUENCE_PAST_HORIZON`, not broken; (6) mixed: queue member with an external dependency — pipe stalls at that member, FIFO preserved; (7) stable regen → empty diff.
- `queue-category-inheritance.test.ts` (hand-built minimal geometry, category-window-cascade precedent): categoryless member inherits queue's strict windowed category; member with own category keeps it; `applyQueueCategoryInheritance` unit cases (identity no-op).
- `__tests__/calendar-generation/precedence-edges.test.ts` — edge building: filtering, queue transparency chain-through, dependency unready-predecessor retention, ordering, empty/singleton queues, multi-predecessor map shape.
- `__tests__/utils/precedence/findCycle.test.ts` — direct cycle, cross-pipe cycle through two queues + two dependency edges (the "each edge looks innocent" case: pipes [A,B] and [C,D] + deps B→C, D→A), reorder-induced cycle, transparency-independence (completed member still participates in validation), path reporting.
- `__tests__/utils/precedence/readinessBlockers.test.ts` — unready goal blocks, task/completed predecessor does not, reverse-gate dependents.
- `prunePrecedenceInputs` unit tests — delete/retype/nest/untriage removal on both structures; identity no-op; completed/unready retained.
- `renderEngineMessage` null-safety for all three new types (deleted queue/planner on either end).

## Verification

1. `pnpm type-check`, `pnpm test`.
2. `pnpm db:reset:dev` (or migrate against dev DB), run the app: create a queue at `/queues`, add three tasks, confirm the calendar shows them sequentially; drag-reorder a member → regen reorders placements; complete the middle member → chain passes through it.
3. Set queue category to a strict windowed category, add a categoryless task → it lands inside the windows.
4. Make member 1 oversized (duration > any gap) → members 2–3 still place, engine console shows the sequence-broken card; dismiss survives regen (deterministic id).
5. Link "buy a car" → depends on "get a job" + "save money" (both unready goals). Ready button grays with "Awaiting…"; three-dot lists both; Ready one via shortcut, confirm the button ungrays only when both resolve.
6. Ready everything; confirm "buy a car" forecasts after the LATER of the two on the calendar.
7. Attempt a cycle in the picker (A depends on B, then open B and try A) — candidate disabled with the path shown.
8. Cross-system: pipe [A, B]; add "A depends on B" — blocked with the pipe named in the path. Reorder the pipe to [B, A]; edge now insertable. Then attempt the reorder back → blocked.
9. Give a pipe member an external dependency on a big unfinished goal → the pipe visibly stalls at that member; later members keep their order.
10. Un-ready a predecessor of a ready goal — refused with "Required by…"; shortcut works.
11. Two-tab check: edit a queue / add an edge in one tab, confirm the other adopts on stale sync; idle regen diffs empty (watch the network tab).
12. Delete a member's planner from the library → member and any edges disappear, sync clean.

## Risks

- The Phase 4d loop-control changes in `scheduleTasksAndGoals` are the highest-risk edit in the whole plan (starvation/budget interplay; this file carries all the historical watermark scars). It is touched ONCE, already multi-predecessor — dependencies add only data producers and messages afterward. Implement with the `dynamicScheduling` recorder on and queue-sequence test 6 written first.
- `compareCalendarData`/`useCalendarServerSync` positional signatures grow by three groups: every caller must be updated in the same commit, or the seam gets its keyed-object refactor first (preferred).
- No-op identity discipline (`prunePrecedenceInputs`, `applyQueueCategoryInheritance`, untouched queue rows keep `updatedAt`, dependency rows immutable) — phantom diffs make second-window syncs permanently stale.
- Validation graph vs gated graph divergence is intentional (semantics #4 vs #6). Keep both builders in `utils/precedence/` side by side with the distinction stated, or someone will "unify" them and reintroduce the latent-cycle bug.
- The ready gate is call-site enforced; sweep `setGoalIsReady`/`toggleGoalIsReady` callers and the assistant apply clamp together.

## Deferred

- Graph view: lanes (pipes) + connectors (dependencies), drag-to-link writing through `findCycle`, illegal drags highlight the existing path. Zero new rules by construction.
- Plans as members/endpoints; subtree-level dependencies; assistant read/write of precedence; queue-conflict one-click fix offers; named clusters (labels on derived components — still no Project entity).
