# Precedence — queues (pipes) and dependencies over one edge model

Companion to the Queues plan (`~/.claude/plans/1-i-disagree-that-shiny-tulip.md`). That plan ships the pipe; this document fixes the shared architecture both features ride on, amends the queue plan where the generalization is cheaper done up front, and specifies the dependency feature that follows.

## Context

Two user-facing concepts, deliberately distinct:

- **Queue (pipe)** — a persistent ordered container for mixed root-level items ("work stuff", "hobby business"). No endpoint; members are continually added and dissolved; they exit in the order they entered. Ordering is a chosen throughput discipline, not logic.
- **Dependency** — a logical prerequisite edge between root-level items ("get married" needs "find a girlfriend" AND "get an apartment"; order among prerequisites is irrelevant). Multi-predecessor, authored in the item editor, no container entity — the connected component of the dependency graph IS the "project"; it is derived, never declared. No Project model, ever.

Both compile to the same engine representation: `PrecedenceEdge[]` with a `source` discriminator (`"queue" | "dependency"`). The engine gates each candidate on **max end across all placed predecessors** and never sees a cycle — legality is enforced at authoring time, in the surface the user is touching.

### Decided semantics

1. **Orthogonality.** Pipe membership and dependency are independent. A pipe member may depend on an item outside any pipe; the pipe stalls at that member (FIFO among members is preserved, the forecast shows the stall honestly). Successors never flow around a stalled member.
2. **Merged-graph validation, logical order.** Cycle checks run against the union of dependency edges and each queue's FULL logical member order (all members, including completed/unready — transparency affects gating, never legality; otherwise un-completing an item could resurrect a latent cycle). Validated on every mutation of either system: dependency add, queue member add, queue reorder.
3. **Redundant same-pipe dependencies are allowed** (B before D in a pipe, plus "D depends on B"). The dependency is a durable fact that survives fluid pipe membership. Contradicting edges are blocked with the cycle path shown and a computed fix offered where one exists ("move D ahead of B in the pipe" / "disconnect").
4. **Readiness gate (authoring-time).** A goal cannot be marked ready while any dependency predecessor is an unready goal. The Ready button grays/refuses with "Awaiting <title>"; a three-dot affordance per blocker offers "Ready <title>" (subject to that goal's own gate — no deep cascade) and "Disconnect dependency". Task predecessors and completed predecessors never block (tasks always forecast; completed is satisfied).
5. **Symmetric un-ready gate.** Un-readying a goal that a READY goal depends on is refused the same way ("Required by <title> — un-ready it first", with the same shortcut affordance). Authoring-time prevention is the primary line; the engine keeps a defensive fallback (below) for states that slip through (assistant apply, stale multi-tab sync).
6. **Engine fallback semantics per edge source.** Completed predecessor: transparent, no bound (both sources). Permanently failed predecessor (TOO_LARGE, budget exhaustion): successor schedules unbounded + message (both sources). Unready-goal predecessor: queue → transparent silent skip (pipe = flow); dependency → successor schedules unbounded + a LOUD message ("forecast ignores a prerequisite that is not ready") — a prerequisite never stops being a prerequisite. This asymmetry is intentional.
7. **Edge scope.** Both endpoints root-level, triaged, `task | goal`. Plans excluded (deferred, same as queue membership). The readiness gate applies only where the successor is a goal; task successors get the engine bound with no gate (nothing to gate).
8. **Horizon honesty.** Deep chains/DAGs will exhaust the expansion budget (`MAX_WEEKS_TO_SEARCH`) long before a life-scale plan resolves. The budget-exhaustion fallback must emit a distinct "forecast extends past the scheduling horizon" flavor rather than pretending the sequence broke.
9. **Graph view (deferred, shapes decisions now).** A future graph surface renders pipes as lanes and dependencies as connectors, and writes through the SAME validator. It must require zero new rules — it is a third editor of the same merged graph. Every decision below preserves that property.

---

## Part A — Amendments to the Queues plan (do these DURING that implementation)

A1. **Multi-predecessor gate from day one.** Queue plan 3c/3d already build `buildPredecessorMap(edges): Map<toId, PrecedenceEdge[]>` (a list). Implement the placement gate as `afterTime = max(lastEnd over all placed predecessors)` and "blocked while ANY predecessor outcome is missing" even though queues only ever produce one incoming edge per node. Dependencies then become pure data — zero new loop logic in `scheduleTasksAndGoals`, which is the highest-risk file in the engine and should be touched once, not twice.

A2. **Per-edge failure fallback.** `sequenceBreaks` entries carry the edge (`{source, queueId?, fromId, toId}`) rather than just `{queueId, failedPlannerId}`, so the message emitter can discriminate queue vs dependency causes later without reshaping the return.

A3. **One mutation choke point for queue writes.** Route all queue member adds/reorders through a single helper (`utils/queue-handlers/mutateQueueMembers.ts` or similar) so the merged-graph validator has exactly one seam to slot into when dependencies land. Rail/list/modal UI never assembles member arrays ad hoc.

A4. **Naming.** Keep `PrecedenceEdge`, `buildPrecedenceEdges`, `predecessorMap` source-agnostic (no `queue` in the shared names).

A5. The window-exceptions freeze in the queue plan's "Do not touch" list has landed (`e10bcee` and prior). Verify nothing is still in flight, then treat that constraint as lifted.

---

## Part B — Dependencies

### B1. Data layer

New `prisma/schemas/models/dependency.prisma` (same idioms: string timestamps, userId cascade, `@@index([userId])`):

- `PlannerDependency`: `id uuid`, `predecessorId` → Planner `onDelete: Cascade`, `successorId` → Planner `onDelete: Cascade`, `userId`, string `createdAt`/`updatedAt`, `@@unique([predecessorId, successorId])`, `@@map("PlannerDependencies")`.

No sortOrder — prerequisite order is meaningless by definition. Root-level/triaged/kind constraints are app-level (central pruning, below), matching the queue-member precedent. Back-references on `user.prisma` and `calendar.prisma` Planner (`dependenciesAsPredecessor` / `dependenciesAsSuccessor`). `types/prisma.ts` re-export. `pnpm prisma:migrate:dev --name add_planner_dependency`, `pnpm prisma generate`.

### B2. Sync plumbing

Flat list — strictly simpler than queues (no nesting, no strip-and-flatten):

1. [fetchCalendarData.ts](actions/calendar-actions/fetchCalendarData.ts) + [fetchFreshState.ts](actions/calendar-actions/fetchFreshState.ts) — `db.plannerDependency.findMany({ where: { userId } })`; add `dependencies`.
2. [compareCalendarData.ts](utils/server-handlers/compareCalendarData.ts) — `DatabaseChanges.dependency: ChangeGroup<PlannerDependency>`; value-based diff (immutable rows — an edge is created or deleted, never updated; the diff should only ever produce creates/deletes).
3. New `sync-handlers/dependencyHandlers.ts` — createMany skipDuplicates / deleteMany userId-scoped; no bulkUpdate needed (immutable rows).
4. [syncCalendarData.ts](actions/calendar-actions/syncCalendarData.ts) — spread after planner handlers (FK order).
5. [calendarSourceSlice.ts](redux/slices/calendarSourceSlice.ts) — `dependencies: PlannerDependency[]`; hydrate + `setDependencies`.
6. [useCalendarServerSync.ts](hooks/useCalendarServerSync.ts) / [useFetchCalendarData.ts](hooks/useFetchCalendarData.ts) / [CalendarProvider.tsx](context/CalendarProvider.tsx) / [calendarThunks.ts](redux/thunks/calendarThunks.ts) / [useCalendarStateActions.ts](hooks/useCalendarStateActions.ts) — same checklist as queue plan Phase 2 (refs, adopt, rollback, `CalendarPayload.dependencies?`, `updateDependencyArray`). Same caveat: every positional `compareCalendarData` caller updated in one commit. If the keyed-object refactor of that seam is ever going to happen, before this lands is the last cheap moment.

**Central pruning** — `utils/precedence/pruneDependencies.ts`: drop edges whose endpoint is missing / non-root / plan / untriaged; SAME reference on no-op. Runs in the thunk beside `pruneQueueMembers` (consider one `prunePrecedenceInputs` wrapper). DB cascade covers server-side deletes.

### B3. Shared validation — `utils/precedence/`

- `collectPrecedenceEdges(queues, dependencies, planners)` — queue full-logical-order consecutive edges (ALL members, no transparency filter — this is the validation graph, distinct from the engine's gated build) + dependency edges.
- `findCycle(edges, candidateEdge): PrecedenceEdge[] | null` — returns the closing path for display ("through the Work pipe: B → C → D"), null when acyclic. Plain DFS; graphs are tiny.
- `wouldCreateCycle` variants for the three mutation shapes: add dependency, add queue member at position, reorder queue member.
- Callers: the item-editor dependency picker (filter candidates that would cycle, and hard-check on commit), the queue mutation choke point (A3), the future graph connector. One validator, three writers.

### B4. Engine

- `GenerateCalendarOptions.dependencies?: PlannerDependency[]` → `CalendarGenerationInput`; plain JSON, worker-safe.
- `buildPrecedenceEdges` gains the second producer: per dependency, re-filter defensively (both endpoints exist/root/task|goal/triaged), drop completed predecessors (transparent), emit `{fromId: predecessorId, toId: successorId, source: "dependency"}`. Unready-goal predecessors are NOT dropped here (unlike queue transparency) — they flow to the gate so the fallback can be loud.
- Gate (already multi-predecessor per A1): an unready-goal predecessor is seeded as `failed` with cause `"unready"`; the successor schedules unbounded and records a break carrying the cause.
- Defensive belt: this path should be near-unreachable through the UI (the ready gates prevent it) but must exist for assistant applies and multi-tab races.
- **Messages** ([EngineMessage.ts](utils/calendar-generation/models/EngineMessage.ts) / [coalesceMessages.ts](utils/calendar-generation/helpers/CalendarGenerator/coalesceMessages.ts) / [renderEngineMessage.ts](utils/renderEngineMessage.ts)):
  - `DEPENDENCY_BROKEN` — payload `{predecessorId, successorId, cause: "failed" | "unready"}`, id `DEPENDENCY_BROKEN::predecessorId|successorId|cause`. Prose must state the consequence, not just the fact: "…was scheduled without waiting for <predecessor>".
  - `SEQUENCE_PAST_HORIZON` — emitted instead of the broken-flavor when a predecessor's only failure is budget exhaustion (`NO_SLOTS` at exhaustion), for both sources: "the forecast for <title> extends past the scheduling horizon". Requires the exhaustion path to tag its failures distinctly from true TOO_LARGE — small, contained change in the queue plan's 3d exhaustion handling; fold it in there (amendment A2 makes the plumbing trivial).
  - `QUEUE_SEQUENCE_BROKEN` prose from the queue plan gets the same consequence-first rewrite.

### B5. Readiness gating UI

Extends the existing blocker mechanism in [ItemDetailLayout.tsx](app/(protected)/items/[id]/_components/ItemDetailLayout/ItemDetailLayout.tsx#L231-L237) (currently: subtasks + deadline):

- New pure helper `utils/precedence/readinessBlockers.ts`: `dependencyReadyBlockers(plannerId, dependencies, planner): Planner[]` — predecessor goals that are unready and uncompleted. And the reverse gate: `readyDependents(plannerId, ...)` — ready goals that depend on this one.
- `readyBlockers` gains one entry per blocker: "Awaiting <title>". The existing flash-message path already handles the refusal copy.
- Beside the Ready button, when dependency blockers exist: a three-dot trigger opening a popover (existing popover primitives + `usePopoverPosition`) listing each blocker with two actions: **Ready <title>** (calls `setGoalIsReady` for that goal, itself gated — if THAT goal is blocked, show its blockers in place rather than cascading) and **Disconnect dependency** (removes the edge via `updateDependencyArray`).
- Un-ready path: extend the existing `hasCompletedActivity` refusal with the symmetric check — "Required by <title>" + the same popover offering **Un-ready <title>** / **Disconnect**.
- `toggleGoalIsReady` / `setGoalIsReady` ([toggleGoalIsReady.ts](utils/goal-handlers/toggleGoalIsReady.ts)) stay dumb subtree stampers; gating lives at call sites (item detail, and wherever else a ready toggle exists — audit `setGoalIsReady` callers). The AI assistant apply path clamps instead (B7).

### B6. Dependency editing UI

New `SideCards` card "Dependencies" on root items ([SideCards/](app/(protected)/items/[id]/_components/SideCards/)):

- **Depends on** — chip list (title + `TypeBadge`, click navigates) with remove; `Combobox` picker to add. Candidate filter: root, triaged, `task | goal`, not self, not already linked, and `findCycle` returns null (filter the list AND hard-check on commit). When an otherwise-sensible candidate is excluded by a cycle, show it disabled with the path as the reason — this is the block-and-explain surface.
- **Required by** — read-only reverse list (click navigates). This is the minimal "viewed somewhere" until the graph view exists.
- Mutations dispatch through `updateDependencyArray` (functional updates) — dependencies are engine input and must regen.
- Queue-conflict fix-offer (decided semantics #3) can ship as plain block-with-path first; the "move it in the pipe" one-click fix is a fast-follow once both features are stable.

### B7. AI assistant containment

Dependencies are NOT exposed to the assistant initially (no tools, not in the prompt). Two containment duties now:

- `applyDraftForestToPlanner` clamps `isReady: true` to false on any goal with dependency blockers at save time (mirroring the UI gate; readiness cascade then stamps the subtree consistently).
- The assistant cannot delete a root out from under an edge silently — central pruning (B2) already drops the edge on the next thunk pass; acceptable.

Assistant awareness of dependencies (read context + edit tools) is a separate future piece of work.

### B8. Tests

- `__tests__/utils/precedence/findCycle.test.ts` — direct cycle, cross-pipe cycle through two queues + two dependency edges (the "each edge looks innocent" case), reorder-induced cycle, transparency-independence (completed member still participates in the validation graph), path reporting.
- `__tests__/utils/precedence/readinessBlockers.test.ts` — unready goal blocks, task/completed predecessor does not, reverse-gate dependents.
- `__tests__/calendar-generation/dependency-gate.test.ts` (fixture pattern) — (1) two-predecessor goal starts after the LATER predecessor's end; (2) completed predecessor transparent; (3) unready predecessor → successor unbounded + one `DEPENDENCY_BROKEN(cause: unready)`; (4) failed predecessor → `cause: failed`; (5) exhaustion → `SEQUENCE_PAST_HORIZON`, not broken; (6) stable regen → empty diff.
- `pruneDependencies` unit tests — endpoint deletion/retype/nest/untriage; identity no-op.
- `renderEngineMessage` null-safety for both new types (deleted planner on either end).

### B9. Verification

1. `pnpm type-check`, `pnpm test`.
2. Link "buy a car" → depends on "get a job" + "save money" (both unready goals). Ready button on "buy a car" grays with "Awaiting…"; three-dot lists both; Ready one via shortcut, confirm the button ungrays only when both resolve.
3. Ready everything; confirm "buy a car" forecasts after the LATER of the two on the calendar.
4. Attempt a cycle in the picker (A depends on B, then open B and try A) — candidate disabled with the path shown.
5. Cross-system: pipe [A, B]; add "A depends on B" — blocked with the pipe named in the path. Reorder the pipe to [B, A]; edge now insertable.
6. Un-ready a predecessor of a ready goal — refused with "Required by…"; shortcut works.
7. Two-tab: add an edge in one tab, confirm adoption in the other; idle regen diffs empty.

## Risks

- The engine gate ships inside the queue plan's Phase 3d (amendment A1) — all the loop-control risk concentrates there; the dependency feature adds only data producers and messages on the engine side. That was the point.
- The ready gate has multiple call sites (item detail, subtasks drawer, any future surface, assistant apply). A missed site produces the unready-predecessor state — survivable (loud engine fallback) but sloppy. Audit `setGoalIsReady` / `toggleGoalIsReady` callers as a checklist item.
- Positional sync signatures grow again (B2). Decide on the keyed-object refactor BEFORE this lands or accept the debt explicitly.
- Validation graph vs gated graph divergence: validation uses full logical queue order, the engine uses transparency-filtered edges. Keep the two builders side by side in `utils/precedence/` with a comment stating the distinction, or someone will "unify" them and reintroduce the latent-cycle bug.

## Deferred

- Graph view: lanes (pipes) + connectors (dependencies), drag-to-link writing through `findCycle`, illegal drags highlight the existing path. Zero new rules by construction.
- Plans as edge endpoints; subtree-level dependencies; assistant read/write of dependencies; named clusters (labels on derived components — still no Project entity).
