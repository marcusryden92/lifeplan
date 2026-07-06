  # Circadium — Project Documentation for AI Assistants

  Circadium is a personal scheduling app: it takes a tree of tasks/goals/plans plus recurring templates and categories, and produces a fully placed weekly calendar with travel time injected between locations. The package directory is still named `lifeplan/` (legacy); the UI brand is **Circadium** (see [app/layout.tsx](app/layout.tsx)).

  This file is the high-level map. For engine internals, read [documentation/calendar-generation-deep-dive.md](documentation/calendar-generation-deep-dive.md).

  ---

  ## Stack

  - **Next.js** 14.2.6 — App Router, server actions, `(protected)` route group.
  - **React** 18, **TypeScript** 6.0.3 (strict, `moduleResolution: "bundler"`, `@/*` path alias).
  - **Prisma** 7.8 with `@prisma/adapter-pg` driver adapter (Prisma 7 requires a driver adapter at construction time — see [lib/db.ts](lib/db.ts)). Client is generated to `generated/client` (outside `/prisma/` so the VS Code Prisma extension doesn't merge its embedded `schema.prisma` copy with the source schema) and imported as `@/generated/client`.
  - **PostgreSQL** (local: `docker-compose.dev.yml`, port 5433, db `lifeplan_dev`).
  - **NextAuth** v5 (5.0.0-beta.20). Edge-safe config in [auth.config.ts](auth.config.ts) (OAuth providers only, used by middleware); full config with Credentials + adapter in [auth.ts](auth.ts).
  - **Vanilla Extract** for styling — `@vanilla-extract/{css,sprinkles,recipes,dynamic,next-plugin}`. Every page/component has a co-located `*.css.ts` file. There is no Tailwind in this project despite a leftover `components.json`.
  - **Redux Toolkit** for cross-component state, **React Context** for scoped providers (Store, User, Calendar, Capture, Search).
  - **FullCalendar** 6.1 for the calendar surface; **date-fns** 3 for date math (engine has its own [dateTimeService](utils/calendar-generation/utils/dateTimeService.ts)); **rrule** for template recurrence.
  - **React Hook Form** + **Zod** for forms.
  - **Jest** + **Testing Library** for tests.
  - **Anthropic SDK** (`@anthropic-ai/sdk`) for the AI assistant — a server-side tool-use loop: `propose_goals` input JSON is parsed incrementally with `partial-json` and forwarded as SSE `forest` events; deterministic edit tools (items, templates, category windows/flags) execute server-side and emit their results as SSE events.
  - **pnpm** 9.15.4 — use `pnpm` for all commands.

  ---

  ## Code style rules

  - **No emojis** in code, comments, or generated docs.
  - **No narration comments** ("// fixed to handle X", "// updated to use new API"). Comments explain *why* something non-obvious exists, not *what* the code does.
  - **No summary, changelog, refactor-notes, or migration-notes markdown files** added to the repo. Make the change and commit.
  - **Absolute imports with `@/`** prefix.
  - **Prefer server actions** (`"use server"` files in [actions/](actions/)) over `app/api/` routes. API routes exist only for `auth/`, `admin/`, and `draft/stream/` (SSE streaming from Anthropic — a Response-body concern that doesn't fit the server-action return shape).
  - **Zod schemas** in [schemas/](schemas/) for any user-facing form.
  - Spell out "category" — never "cat".
  - The location surface is named **Locations**, not "Places" (Google Places is the underlying API, but the user-facing concept is Location).

  ---

  ## Directory map

  ```
  lifeplan/
  ├── app/                              # Next.js App Router
  │   ├── layout.tsx                    # Root: SessionProvider + ThemeProvider
  │   ├── page.tsx                      # Landing
  │   ├── globals.css, page.css.ts
  │   ├── (protected)/                  # Auth-gated routes
  │   │   ├── layout.tsx                # Async server component: reads onboardedAt, computes needsOnboarding
  │   │   ├── ProtectedProviders.tsx    # Client: StoreProvider > UserProvider > CalendarProvider > AppShell (+ onboarding overlaySlot)
  │   │   ├── calendar/                 # FullCalendar surface
  │   │   ├── capture/                  # Quick-entry surface
  │   │   ├── categories/               # Role + category management (top-level categories are surfaced as "Roles")
  │   │   ├── dashboard/                # Default landing after login
  │   │   ├── items/[id]/               # Item detail; sub-routes: schedule/, subtasks/
  │   │   ├── library/                  # Task/goal browser
  │   │   ├── locations/                # Location + travel-time management
  │   │   ├── onboarding/               # First-run 6-step overlay (Welcome/Roles/Locations/Week/BrainDump/AI); _lib builders, _steps, _components
  │   │   └── settings/
  │   ├── auth/                         # login/register/reset/new-password/new-verification/error
  │   ├── api/                          # auth/ + admin/ + draft/stream/ (SSE)
  │   └── test-shell/, test-tokens/     # Dev scaffolding
  │
  ├── actions/                          # Server actions (preferred backend surface)
  │   ├── login.ts, register.ts, reset.ts, newPassword.ts, newVerificationAction.ts, settings.ts
  │   ├── onboarding.ts                 # completeOnboarding() — stamps User.onboardedAt
  │   ├── scheduling.ts                 # UserSchedulingPreferences + TaskPreferences
  │   ├── categories.ts                 # Category CRUD + planner-category assignment
  │   ├── locations.ts                  # Location + Google Places integration
  │   ├── draftConversations.ts         # AI-assistant chat history (list/get/upsert/delete, capped at 50)
  │   └── calendar-actions/
  │       ├── fetchCalendarData.ts      # Initial load — returns planner/calendar/template/categories/categoryEvents/travelEvents/engineMessages + dataVersion
  │       ├── fetchFreshState.ts        # Used on stale-version recovery
  │       ├── syncCalendarData.ts       # OCC-gated transactional diff sync
  │       └── sync-handlers/            # One handler per table (planner, calendar, extendedProps, template, category, timeWindow, categoryEvent, travelEvent, engineMessage, location, travelTime)
  │
  ├── components/
  │   ├── auth/                         # AuthCard, login/register/reset forms, Social, LoginButton
  │   ├── calendar/                     # WeekStructureModal + editors (Template, Window, Event tile)
  │   ├── draft/AIDraftModal/           # Global AI assistant — chat (+ DB-backed history popover) + tabbed Goals/Week/Windows diff view (goal forest, weekly templates, category windows/flags); mounted in the AppShell assistant slot, opened anywhere via mod+I / sidebar / item-detail entry points
  │   ├── draggable/                    # DragBox, DraggableItem, TaskDivider, DraggableContext
  │   ├── events/                       # Calendar event renderers + popovers (Event, Template, Travel, CategoryWrapper, NewPlanModal, color/location pickers)
  │   ├── landing/VectorField/          # Landing-page visual
  │   ├── tasks/                        # TaskItem, TaskList, task-item-subcomponents/
  │   └── ui/                           # Custom design-system primitives (NOT pure shadcn)
  │       ├── Button, Glass, Backdrop, Grain, Masthead, ProgressBar, Loader,
  │       │   StatusTag, TypeBadge, CategoryBadge, CategoryDot, ConicDot, Caption,
  │       │   Combobox, SegmentedControl, ConfirmModal, Switch, StubPage, Kbd,
  │       │   ThemeProvider, useResolvedCategoryColor, CenteredLoader
  │       └── shell/                    # AppShell architecture
  │           ├── AppShell/             # Outer bezel + canvas + content row (+ assistantSlot inside mainColumn)
  │           ├── Sidebar/              # Desktop nav (+ Assistant action button)
  │           ├── MobileTabs/           # Mobile bottom nav
  │           ├── CapturePalette/       # Quick-entry overlay
  │           ├── SearchPalette/        # Cmd-K-style search
  │           ├── CaptureContext.tsx, SearchContext.tsx, AssistantContext.tsx
  │           └── nav.ts                # NAV_ITEMS, MOBILE_TABS
  │
  ├── context/
  │   ├── StoreProvider.tsx             # Redux store wrapper
  │   ├── UserProvider.tsx
  │   └── CalendarProvider.tsx          # Main data context — wraps planner/calendar/template/categories + the auto-regen useEffects
  │
  ├── hooks/
  │   ├── useCurrentUser, useCurrentRole
  │   ├── useFetchCalendarData          # Initial Redux seed from server
  │   ├── useCalendarServerSync         # Diff-based sync to DB with OCC, stale recovery, rollback
  │   ├── useCalendarStateActions       # updatePlannerArray / updateTemplateArray / updateAll
  │   ├── useManuallyRefreshCalendar    # User-triggered regen
  │   ├── useServerAction               # useTransition + status pattern for mutations
  │   ├── useIsMobile                   # matchMedia on breakpoints.mobile — for JS-level mobile treatments (view types, bottom sheets)
  │   ├── useKeyboardShortcuts, useListKeyboardNav, useClickOutside, usePopoverPosition,
  │   │   useFlashAnimation, usePlatform, useTitleEditor
  │
  ├── lib/
  │   ├── auth.ts                       # Helpers around NextAuth session
  │   ├── db.ts                         # Prisma client singleton (PrismaPg adapter)
  │   ├── google-maps-api.ts            # Places autocomplete + Distance Matrix
  │   ├── mail.ts, tokens.ts            # Auth flows
  │   ├── taskItem.ts
  │   └── theme/                        # The whole design system
  │       ├── tokens.css.ts             # createThemeContract: paper/bezel/ink/glass/interactive/shadow/accent/status
  │       ├── themes.css.ts             # themeLight, themeDark
  │       ├── scales.ts                 # Theme-independent numerics: space, radii, contentWidth, breakpoints, media, borderWidth, zIndex
  │       ├── sprinkles.css.ts          # Atomic style API
  │       ├── recipes.css.ts            # glass, popover, pillBtn, badge, formInput, progressTrack
  │       ├── typography.css.ts         # display, text, caption, statusTag
  │       ├── transitions.ts            # DURATIONS, theme/button/collapse/progress/interactive transitions
  │       ├── fonts.ts                  # fontDisplay, fontUI
  │       ├── effects.ts                # backdropFilters, colorMixAlpha
  │       ├── categoryColor.ts          # Category color resolution + glow/gradient/tint
  │       └── global.css.ts, index.ts
  │
  ├── prisma/
  │   ├── schemas/
  │   │   ├── schema.prisma             # Generator + datasource only
  │   │   └── models/
  │   │       ├── user.prisma           # User (+ dataVersion OCC counter, onboardedAt gate), Account, VerificationToken, PasswordResetToken, TwoFactorToken, TwoFactorConfirmation, AccountDeletionToken, UserRole
  │   │       ├── calendar.prisma       # SimpleEvent, EventExtendedProps, Planner, EventTemplate, WeekDayType, PlannerType, EventType
  │   │       ├── category.prisma       # Category, CategoryTimeWindow, CategoryEvent
  │   │       ├── location.prisma       # Location, TravelTime, TravelEvent, TransportMode
  │   │       ├── scheduling.prisma     # UserSchedulingPreferences, TaskPreferences, enums
  │   │       ├── engineMessage.prisma  # EngineMessage — engine-emitted console rows with user-owned dismissed flag
  │   │       └── draftConversation.prisma # DraftConversation — AI-assistant chat history (messages as Json)
  │   ├── migrations/                   # 0_init … drop_planner_dependency — see "Migration history" below for the full list
  │   ├── seed.ts                       # Wholesale reseed (admin@lifeplan.com / "password")
  │   └── seed-helpers/                 # generateCategories, generateLocations (+ TravelTimes), generatePlanners, generatePlans, generateTemplates, generateUncompletedItems
  │
  ├── redux/
  │   ├── store.ts                      # { user, calendarSource, engineOutput, schedulingSettings }
  │   ├── slices/
  │   │   ├── calendarSourceSlice.ts    # User-authored inputs: planner, template, categories, isLoaded
  │   │   ├── engineOutputSlice.ts      # Engine-derived: calendar, categoryEvents, travelEvents, engineMessages, plannerScores + lastEngineRunAt (ephemeral)
  │   │   ├── userSlice.ts
  │   │   └── schedulingSettingsSlice.ts # bufferTimeMinutes, defaultTransportMode, travelTimeMatrix (engine-shaped), allTravelTimes (full rows), locations, strategy weights/scores/penalties, enableTravelEvents
  │   └── thunks/
  │       └── calendarThunks.ts         # updateAllCalendarStates — the engine entry point from Redux
  │
  ├── schemas/                          # Zod schemas (auth + TaskListSchema)
  │
  ├── types/
  │   ├── prisma.ts                     # Re-exports Prisma payload types with runtime augmentations (SimpleEvent.extendedProps gets categoryWrapperId, travel fields, trespass flags)
  │   ├── calendarTypes.ts              # WeekDayIntegers, TravelExtendedProps, TrespassingExtendedProps
  │   ├── categoryTypes.ts
  │   ├── ui.ts, user.ts, userTypes.ts
  │   ├── css.d.ts                      # Ambient `declare module "*.css"` — the one legitimate .d.ts here
  │
  ├── utils/
  │   ├── calendar-generation/          # The scheduling engine — see deep-dive doc
  │   ├── calendar-rendering/           # categoryEventsToEventInput, templatesToEventInput, travelEventsToEventInput (DB rows → FullCalendar input)
  │   ├── server-handlers/              # compareCalendarData (the diff that feeds syncCalendarData)
  │   ├── template-handlers/, datetime/, locations/, goal-handlers/
  │   ├── assert/                       # assert.ts (+ assert.js in tsconfig include)
  │   ├── renderEngineMessage.ts        # Maps persisted EngineMessage rows into console-friendly {tag, tone, title, body, goToDate}
  │   ├── plannerBulkActions.ts         # Pure subtree ops shared by the Library bulk bar + item detail (delete, category with descendant clear, color cascade, priority)
  │   └── (loose helpers)               # generalUtils, badgeTone, calendarEventHandlers, categoryUtils,
  │                                     # colorUtils, dateUtils, engineTones, eventTier, goalPageHandlers,
  │                                     # plannerStatus, taskArrayUtils, taskHelpers, templateBuilderUtils,
  │                                     # timeFormatting, calendarUtils
  │
  ├── __tests__/
  │   ├── calendar-generation/          # Engine regression tests + fixtures/ (trimmed live-data snapshots)
  │   ├── draft/                        # Assistant draft-domain unit tests (forest, templates, windows)
  │   ├── goal-handlers/                # toggleGoalIsReady cascade + sortOrderKeys/moveItem tests
  │   └── utils/                        # plannerBulkActions unit tests
  │
  ├── documentation/
  │   └── calendar-generation-deep-dive.md
  │
  ├── notes/                            # Personal notes / TODOs — NOT documentation, do not quote
  ├── middleware.ts                     # Route protection (uses edge-safe auth.config.ts)
  ├── routes.ts                         # publicRoutes, authRoutes, apiAuthPrefix, DEFAULT_LOGIN_REDIRECT (/dashboard)
  ├── auth.ts, auth.config.ts, next-auth.d.ts
  ├── docker-compose.dev.yml
  ├── prisma.config.ts, components.json (legacy), jest.config.ts, jest.setup.ts
  ├── next.config.mjs                   # withVanillaExtract + rrule webpack alias
  └── package.json                      # pnpm scripts
  ```

  ---

  ## Core domain model

  ### Planner (the central schedulable row)

  ```ts
  {
    id, title, parentId?,
    plannerType: "task" | "plan" | "goal",
    duration: number,             // minutes
    deadline?: ISO,
    starts?: ISO,                 // plan items only
    sortOrder: number,            // fractional sibling key within a parentId group (0 on roots — top-level order non-semantic)
    priority: number,
    isReady?: boolean,            // goals: ready to schedule?
    isTriaged: boolean,           // false until first Capture save moves the item out of the triage queue
    completedStartTime?, completedEndTime?,
    locationId?: string | null,   // null = "Anywhere"
    useParentLocation: boolean,   // inherit from category or ancestor instead
    categoryId?: string | null,
    color?, userId, createdAt, updatedAt
  }
  ```

  `PlannerType` is `task | plan | goal`. `EventType` (on `EventExtendedProps`) adds `planner | template | travel | category` — the engine emits the latter two at runtime.

  **Sibling order** is `sortOrder`: a fractional float key local to each `parentId` group (append = max + 1024, insert = midpoint, reindex the group when a gap collapses — see [utils/goal-handlers/sortOrderKeys.ts](utils/goal-handlers/sortOrderKeys.ts)). The engine's flattened leaf order for a goal is the depth-first traversal with children sorted by `sortOrder` at each level (`getSortedTreeBottomLayer`). Reorder/reparent handlers live in [utils/goal-handlers/moveItem.ts](utils/goal-handlers/moveItem.ts) and touch only the moved row (plus the group on a rare reindex). Planned inter-goal dependencies will be a separate relation referencing Planner ids — order and dependency are deliberately no longer one field.

  ### Templates, plans, completed

  - **EventTemplate** — recurring weekly blocks (`startDay`, `startTime`, `duration`, optional `locationId`).
  - **plan** — a Planner row with `plannerType: "plan"` and a fixed `starts` timestamp. Anchors the calendar.
  - **completed** — any task/goal/plan with `completedStartTime` / `completedEndTime` set. Rendered at the actual completion window, not the originally-scheduled one.

  ### Location & travel

  - **Location** — name, address, Google `placeId`, lat/lng. `null` locationId means **"Anywhere"** (no travel needed).
  - **TravelTime** — directional, per-transport-mode (`DRIVING | TRANSIT | BICYCLING | WALKING`), with Google baseline values (`rushHour | regular | night`) and optional user overrides.
  - **TravelEvent** — engine-materialized row written wholesale on each regen with a deterministic id (`${fromId ?? "anywhere"}-${toId ?? "anywhere"}-${start}`). Carries `insufficientTravel` / `overconstrained` markers.

  ### Category system

  - **Category** — hierarchical (`parentId`), with `icon`, `color`, `sortOrder`, `useTimeWindows`, `isStrict`, `confineToOwnWindows`, optional `locationId`.
  - **Roles vs. categories (user-facing wording).** Top-level categories (`parentId === null`) are surfaced to the user as **Roles** (Covey framing — the roles you play in life), everywhere they appear: the onboarding Roles step, the `/categories` page + editor + rail, and the nav label. Everything nested under a role stays a **category** ("sub-category" one level deeper). The **data model is unchanged** — it's all `Category` — and the **scheduling vocabulary stays "category"** deliberately (WeekStructureModal, the assistant's "category windows", `CategoryBadge`, the engine), because windows/strictness attach to categories at any depth. UI copy is level-aware via `isRole = !category.parentId`.
  - **CategoryTimeWindow** — one row per weekly occurrence (`day` 0–6, `startTime`/`endTime` `"HH:MM"`). `categoryId` is nullable so windows can exist as unassigned drafts; the engine ignores those.
  - **CategoryEvent** — engine-materialized weekly occurrence with a composite id `` `${categoryTimeWindowId}|${YYYY-MM-DD-local}` ``. Carries `trespassingStart` / `trespassingEnd` flags stamped by the engine when its placement violated a category boundary; the renderer reads these directly for red-border display.

  A category only constrains scheduling geometry when `useTimeWindows === true` **and** `timeSlots.length > 0`. Otherwise it still contributes location inheritance, but not slot shape or strictness.

  ### Strict vs. soft categories

  - `isStrict: true` — only items belonging to this category can be scheduled in its windows. Other items are filtered out, and the capacity check subtracts the window from any overlapping gap.
  - `isStrict: false` — other items may fill empty space inside the window.

  ### Window cascade (hierarchy)

  An item is a member of its own category **and every ancestor** by extension: a `project` (nested under `work`) item may schedule in a `work` window, but a plain `work` item never lands in a `project` window (descendant, not ancestor). Membership is what `isStrict` gates against, so a strict `work` window still admits `project` items.

  - `confineToOwnWindows: true` opts a category **out** of the upward cascade — its items schedule only in its own windows (dedicated collection time), and it becomes a ceiling for any descendant climbing the chain.
  - The eligible window-category set per category is memoized once per engine pass by [buildCategoryEligibilityMap](utils/calendar-generation/helpers/CalendarGenerator/buildCategoryEligibilityMap.ts) (own id + non-confined ancestors up to a `confineToOwnWindows` ceiling) and threaded through `SchedulingContext`. Match sites — `findAllFittingSlots`, `maxEffectiveCapacityFor`, `largestCompatibleSlotForLargestTask` — test set membership, not id equality. The UI toggle lives in the category editor and only shows for sub-categories (no ancestor to cascade into ⇒ no effect).

  ### Engine messages

  - **EngineMessage** — engine-materialized console row with a deterministic id (`${TYPE}::${discriminators}`) and a typed JSON payload. Same "wholesale-write + diff by id" pattern as CategoryEvent / TravelEvent; the id encodes what makes an instance unique (plannerId, reason, travel tuple, placed count) so a shifted placement surfaces as a new row and an unchanged one is a no-op diff.
  - **Dismissed flag** is user-owned. The engine consults the previous emit array at coalesce time and carries `dismissed: true` forward when the same id is re-emitted; a fresh id (situation shifted) surfaces as a new, undismissed row. Full identity model + payload shapes live in [utils/calendar-generation/models/EngineMessage.ts](utils/calendar-generation/models/EngineMessage.ts).
  - Presentation prose (titles, bodies, tags) is generated by [utils/renderEngineMessage.ts](utils/renderEngineMessage.ts) from the current entity tree — the engine emits structured facts only, so a category rename doesn't rot a persisted message.

  ---

  ## Calendar generation engine (summary)

  The engine takes `{ planners, templates, categories, previousCalendar, options }` and returns `{ events, categoryEvents, travelEvents }`. It is a stateful pipeline organized as an orchestrator + strategies + identity-tracked travel.

  - Public entry: [utils/calendar-generation/calendarGeneration.ts](utils/calendar-generation/calendarGeneration.ts). It filters `isTriaged === false` rows out at the input boundary — untriaged Capture-inbox / brain-dump jots (duration 0, no `starts`) would otherwise fail validation and blank the whole calendar (any validation error returns empty events). A start-less **plan** is a validation *warning*, not an error (`validatePlanners.ts` / `buildPlanEvents` null-guards it), so triaged-but-timeless plans don't blank it either.
  - Module exports: [utils/calendar-generation/index.ts](utils/calendar-generation/index.ts).
  - Core classes (in [utils/calendar-generation/core/](utils/calendar-generation/core/)): `CalendarGenerator` (12-phase orchestrator; final phase emits EngineMessages), `Scheduler` (5-phase per-task pipeline), `TimeSlotManager` (thin holder for the sorted slot array), `TravelManager` (travel lookups + leg tracker).
  - Each phase delegates to function modules under [utils/calendar-generation/helpers/<Name>/](utils/calendar-generation/helpers/).
  - Strategies in [utils/calendar-generation/strategies/](utils/calendar-generation/strategies/): `EarliestSlotStrategy`, `LocationGroupingStrategy`, combined by `CompositeStrategy`.
  - Tunable constants in [utils/calendar-generation/constants.ts](utils/calendar-generation/constants.ts): `SCHEDULING_CONFIG` (horizon chunk, watermark, placement buffer, iteration caps), `URGENCY_CONFIG`, `SchedulingFailureReason`.
  - The horizon is incrementally expanded (`HORIZON_CHUNK_DAYS = 28`); the slot array carries an `isFinal` pickup marker for the next chunk.

  Everything else — slot union, shard model, static travel pass, dynamic placement, buffer model, capacity gating, strategies, debug switchboard, edge cases — is in [documentation/calendar-generation-deep-dive.md](documentation/calendar-generation-deep-dive.md). Compress from there if writing about it elsewhere; do not re-document here.

  ---

  ## AI assistant (goal-forest + weekly-template + category-window planning)

  One global assistant, always reachable: **mod+I**, the Sparkles button in the Sidebar, or the "AI assistant" button in `ItemTabs`. It operates on the whole **forest** of triaged top-level rows — restructuring existing goals, creating new goals with full subtrees, and deleting goals — on the user's **weekly templates** (EventTemplate rows: sleep, work hours, standing commitments), and on the full **categories domain**: the category records themselves (create/rename/recolor/reparent/relocate/delete, plus the `useTimeWindows`/`isStrict`/`confineToOwnWindows` flags) and their **time windows** (CategoryTimeWindow rows) — so "set up my week and this goal" happens in one conversation. Untriaged Capture-inbox jots are excluded and never touched. Locations are read context only (they can't be created here — they need Google Places), though categories and items may be assigned to existing ones.

  Mounting: `AssistantProvider` ([components/ui/shell/AssistantContext.tsx](components/ui/shell/AssistantContext.tsx)) wraps `AppShell` in the protected layout; [GlobalAssistant.tsx](components/draft/AIDraftModal/GlobalAssistant.tsx) is passed into AppShell's `assistantSlot` and renders the modal filling `mainColumn` (`position: absolute; inset: 0`) — the sidebar stays visible and interactive (`Dialog modal={false}`, outside-interaction dismissal prevented; Esc / Close only). Focus resolution: an explicit `AssistantScope.focusItemId` from the opener wins, else the `/items/[id]` route is detected; either maps to its root via `getRootParentId` and is sent as a prompt hint plus default tree-pane expansion.

**Embedded mode (onboarding AI step).** `AIDraftModal` takes `embedded`/`intent`/`onSaved`/`onStateChange`/`resumeConversationId`/`onConversationIdChange` props. `intent="onboarding"` (the value `AssistantScope.intent` reserves) both threads to the route for a prompt preamble (`intentBlock` — triage the raw brain-dump jots, which arrive as untyped tasks: shape each into a task or a goal with subtasks, set durations/deadlines, assign each to one of the user's *roles*, ready eligible goals) and tunes the instance: empty-state hint, no History popover, no most-recent `autoResume`, and an **auto-sent kickoff message** (fires once per mount after hydration AND after the resume attempt settles — `resumeSettled` from `useAIDraftState` — with items-present vs empty-forest phrasing). Instead of most-recent resume, the instance resumes **its own conversation**: the id is reported via `onConversationIdChange`, persisted in onboarding's `StoredProgress.aiConversationId`, and passed back as `resumeConversationId` so a page refresh mid-interview reopens the same chat (a missing/deleted id degrades to a fresh kickoff; unsaved tree proposals still reseed from canonical — only the chat persists). `embedded` renders inline via `embeddedRoot` (no Dialog overlay, no save/cancel banner); the host (`OnboardingAIStep`) owns the Save action, driving it through the reported `{hasChanges, isStreaming, save}` (`onStateChange`) and getting `onSaved` (not `onClose`) on save. Back out of the step confirms first when `hasChanges`; a confirmed discard also clears the stored conversation id, so returning starts a fresh interview.

  Split-pane modal ([components/draft/AIDraftModal/](components/draft/AIDraftModal/)):

  - **Left**: chat pane. User bubbles right, assistant responses left-aligned as plain text; `initialDraft` prefills the composer without sending. The chat pane sits on `color-mix(ink 4%, paper)` so it reads as sunken relative to the tree pane. While a response streams the send button becomes a **Stop** button (aborts the fetch; the route forwards `req.signal` upstream; the interrupted bubble is finalized — "Stopped." if it had no prose yet). On abort, completed work stays but truncated tails roll back: the stamped `propose_goals` re-emit carries `complete: true` (fromOps trees count as complete), and the client refolds the turn from only the completed callIndexes, dropping any proposal whose finalized emit hadn't arrived. **Conversations persist to the DB** — a `DraftConversation` row (client-minted uuid id, title from the first user message, whole message array as Json) upserted by a debounced effect in `useAIDraftState` whenever the chat settles, guarded by a last-persisted snapshot so loading a conversation never bumps its own `updatedAt`. Server surface: [actions/draftConversations.ts](actions/draftConversations.ts) (list/get/upsert/delete, capped at 50 conversations, NOT part of the diff sync). The header has a **History** popover (list + load + delete, via `ChatHistoryPopover`) and a **New chat** reset; on the first open of a fresh page load the most recent conversation auto-resumes. The client sends only the trailing 40-message window to stay under the route's history cap; working drafts still reseed from canonical on each open.
  - **Right**: a tabbed review pane — **Goals / Week / Categories** tab buttons in the pane header (internal tab key is still `windows`), each with a change-count badge; during a stream the pane auto-follows the domain the assistant is editing unless the user clicked a tab this turn (pin resets per send).
    - **Goals tab**: `JsonForestView` — one collapsible section per top-level goal (chevron + title + `CategoryBadge` + goal-level diff badge), the focused goal and changed goals expanded by default, with the per-node diff overlay from [diffDraftTree.ts](components/draft/AIDraftModal/diffDraftTree.ts); deleted nodes/goals stay visible in place. **Display is relevance-scoped**: the pane shows only the focused goal, goals the AI touched, and goals brought into view via the `show_goals` tool (display-only tool → SSE `show` event), plus a "Show all" header toggle. Show-all mode groups goals under category headers (provider order, uncategorized last); the relevance-scoped view stays flat. The full forest is still sent to the model and held in working state — visibility is a render filter only, so Save/delete semantics are unaffected.
    - **Week tab**: `TemplateWeekView` — Monday-first day-grouped template list with the same diff language (status badges + friendly changedFields), color dot, HH:MM–HH:MM range with a `+1d` overnight marker, location name ("Anywhere" when null). Always shows all templates — no relevance filter.
    - **Categories tab**: `WindowsView` — grouped by the diffed category records (working order, canonical-deleted appended): `CategoryDot` + name (struck through when deleted) + "under X" note on creates/moves + flag chips (`windows on/off`, `strict`, `own windows only`; accent-outlined when changed) + friendly changed-field text (renamed/color/moved/location) + status badge, windows beneath rows Monday-first with day + HH:MM–HH:MM and the shared status-badge diff language. Categories with no windows and no changes of their own are omitted. The change badge counts window rows plus changed category records.
  - **Draggable divider** between the panes (state clamped 20/80%; both panes have `minWidth: 240px`).

  Data flow per turn:

  ```
  plannerForestToJson(planner)             → canonical DraftForest (triaged roots + subtrees; root categoryId stamped)
  useAIDraftState({open, canonical, canonicalTemplates, canonicalWindows})
    ─ owns workingForest/workingTemplates/workingWindows + chat messages +
      conversation lifecycle (id minting, debounced DB upsert, auto-resume)
    User sends message
        │
        ▼
  POST /api/draft/stream                    ← auth-gated, Sonnet 4.6
    body: { currentForest, currentTemplates, history, focus?,
            categories (full records: id+name+color+parentId+locationId+flags
            +timeSlots WITH window ids — built ENTIRELY from the WORKING
            categories state so pending drafts, including created categories,
            stay visible to the model on later turns),
            locations (id+name), today (local) }
    (full forest goes to OUR server only — Anthropic gets a compact per-goal
     INDEX line + the focused goal's tree; everything else is fetched on
     demand. Templates, category windows, and locations are small and ride in
     the prompt whole — no fetch dance for them)
    tools:
      read:  search_items({query}), get_goal_trees({goalIds})
      edit:  update_items, move_item, add_items, delete_items
             ← deterministic ops executed server-side by draftForestOps.ts on
               the request's working copy; the resulting trees are emitted as
               fromOps forest events (code-computed — never retyped by the
               model). Same-goal moves only; supplied ids on add are discarded
               and re-minted as draft ids; isReady / categoryId validation
               built in.
      week:  add_templates, update_templates, delete_templates
             ← deterministic ops (draftTemplateOps.ts) on the request's
               workingTemplates copy; each change emits an SSE `templates`
               event carrying the FULL authoritative array (small flat list —
               last write wins, no callIndex folding, no fetch guard). Ids are
               route-minted uuids that become the real DB ids at Save;
               locationId validated against the user's set; overlap is
               allowed (engine warns), never rejected.
      categories: add_time_windows, update_time_windows, delete_time_windows,
             add_categories, delete_categories,
             update_categories({id, name?, color?, parentId?, locationId?,
                                useTimeWindows?, isStrict?, confineToOwnWindows?})
             ← deterministic ops (draftWindowOps.ts) on the request's
               workingWindows state {windows, categories}; each change emits an
               SSE `windows` event carrying the FULL authoritative state
               (same contract as templates). Window AND category uuids are
               route-minted and become the DB ids at Save. Windows are
               within-day only (startTime < endTime, "23:59" end-of-day
               sentinel — the engine supports overnight windows but
               WeekStructureModal's grid can't render them); add auto-enables
               useTimeWindows on the target category (reported in the tool
               result). Category ops validate parentId against the working
               set (drafts included; self/descendant reparent rejected),
               locationId against the user's locations, reject duplicate
               sibling names, and delete cascades the subtree + its windows.
      build: propose_goals({goals, deletedGoalIds})   ← new goals + wholesale restructures
      show:  show_goals({goalIds | all})
        │
        │ tool-use LOOP (≤ MAX_TOOL_TURNS): stream → execute tool calls →
        │ append tool_results → stream again, until end_turn
        ▼
    server-side partial-json parse of each propose_goals input_json_delta,
    emits SSE `text`, `forest` (with callIndex; the finalized stamped re-emit
    carries `complete: true`), `templates`, `windows`, `show`, `status` events.
    GUARD: a proposal touching an existing goal whose tree the model has NOT
    fetched this request (focused goal counts as fetched) is filtered out and
    rejected via tool_result — complete-tree replacement without the current
    subtree would silently delete children.
        │
        ▼
  streamDraft (client) → onForest({callIndex, proposal}) → normalizeDraftForest
    → foldDraftProposals(turnStartSnapshot, proposals in callIndex order)
    → setWorkingForest
    (snapshot per send: each call's partial re-parses replace, never compound;
     multiple propose_goals calls in one turn stack via the fold)
        │
        ▼
  User clicks Save (hasChanges = forest dirty (draftForestsEqual, top-level
  order-insensitive) OR templates dirty (draftTemplatesEqual) OR windows/flags
  dirty (draftWindowsStateEqual) — all order-insensitive)
        │
        ▼
  forest dirty → applyDraftForestToPlanner({planner, workingForest, userId, validCategoryIds})
    1. deleted roots: pure subtree filter (order is a local property; no
      neighbor fixup)
    2. retained goals (only if !draftTreesEqual): existing per-tree apply —
      UUID preservation, sibling sortOrder stamped from array position;
      root categoryId applied when it validates
    3. new roots: parentId null, sortOrder 0, isTriaged true, validated
      categoryId, children stamped per level
  templates dirty → applyDraftTemplates({current, canonical, working, userId, now})
    deletes removed rows, restamps updatedAt on changed rows, creates new rows
    keeping the route-minted uuid; UNTOUCHED rows return by object identity
    (the template diff compares timestamps, so identity = sync no-op); rows
    created elsewhere while the modal was open are preserved
  categories dirty → applyDraftWindows({currentCategories, canonical, working, userId, now})
    full category CRUD against the live array: assistant deletes cascade over
    the CURRENT tree (matching the DB's parentId cascade; concurrent children
    go too), per-field record deltas (name/color/parentId/locationId/flags)
    apply only where the assistant actually changed them (concurrent edits
    elsewhere win on untouched fields) and restamp updatedAt, new rows keep
    the route-minted uuid with sortOrder appended after their siblings, and a
    category deleted concurrently elsewhere is never resurrected. Each
    surviving category's timeSlots are rebuilt from the working windows
    (reparenting honored, userId stamped); window-only changes do NOT touch
    the category row (the category diff strips timeSlots but compares
    updatedAt); untouched categories return by object identity; concurrent
    rows made elsewhere are preserved. Runs BEFORE applyDraftForestToPlanner
    in handleSave so goal categoryIds validate against the SAVED category set
    (a goal filed under a category created this conversation keeps it)
        │
        ▼
  updateAll(nextPlanner, undefined, nextTemplates, nextCategories) → ONE engine
  regen → one sync (clean domains pass undefined so their state keeps identity;
  the thunk dispatches setCategories before regenerating when categories are
  passed — CalendarPayload grew a categories field for this)
  ```

  Contracts worth not breaking:

  - **Working drafts seed only after hydration** — `useAIDraftState` adopts canonical as the working copy on `open && ready` (`ready` = CalendarProvider's `isLoaded`), and the dirty flags return false until then. A modal open before the initial snapshot lands (onboarding resumed on the AI step, mod+I right after load) would otherwise seed an EMPTY working forest: every real item diffs as deleted, the model is sent an empty forest, and Save would actually delete everything. Send and save are guarded on `isLoaded` too.
  - **UUID preservation is load-bearing** — see the `preserve-planner-ids` memory note. The AI is instructed to echo existing ids; the reverse parser only trusts an id inside the subtree of the goal being applied (any other id becomes a fresh UUID). Inter-goal dependencies (planned) will reference these ids.
  - **`sortOrder` is never emitted by the AI** — sibling order is array position (top-level goal order is NOT semantic; goals match by id). The reverse parser stamps fresh fractional keys from array position at each level.
  - **Goal-granular deltas** — the model never re-emits untouched goals; unchanged goals are skipped at apply time so they see zero `updatedAt` churn and no phantom sync diffs.
  - **Fetch-before-modify is enforced server-side** — tool results are not carried between user messages (client history is prose-only), so the model must re-fetch trees each message; the route rejects proposal entries for unfetched existing goals rather than trusting the prompt alone. The deterministic edit tools are exempt: they operate by id on the server's copy, so they cannot drop data the model never saw.
  - **Draft ids are route-minted** — id-less nodes in an accepted `propose_goals` call (and every `add_items` node) get UUIDs stamped by the route (`assignDraftIds` / `mintDraftIds`); the stamped trees are merged into the request's working copy, re-emitted to the client under the same `callIndex` (replacing the id-less partials), and the new root ids are reported in the tool result. Unsaved drafts are therefore first-class for every tool — fetchable, editable, replaceable by id, deletable — instead of duplicate-prone rebuilds from model memory. Draft ids never reach the DB: they match no canonical root at Save, so `applyDraftForestToPlanner` mints the permanent UUIDs.
  - **Edit ops never touch sortOrder** — draftForestOps works on the nested tree where order is array position; fractional keys are stamped once at Save by applyDraftForestToPlanner.
  - **`categoryId` rides on top-level goal roots only**; children inherit. This is a row-level invariant, not just a draft-contract one: descendants are stored with `categoryId: null` and resolved by parent-chain walk (engine: `buildPlannerCategoryMap`; UI: `getEffectiveCategoryId`) — an explicit child value would win over the walk and pin leaves to a stale category's windows after a root-level switch. `applyDraftForestToPlanner` stamps null on new descendants AND clears retained ones (healing pre-invariant rows); item detail's category change cascades the clear (`assignCategoryToSubtrees` in [utils/plannerBulkActions.ts](utils/plannerBulkActions.ts)) and only renders the category picker on root items. Null on a retained root means "leave as is" (backfilled in `mergeDraftForest`); an id not in the user's category set is ignored. New top-level rows are never plans (`starts` isn't in the contract; coerced defensively).
  - **`color` rides on top-level goal roots only** (same rule as `categoryId`): optional hex on the root, children inherit it on save, null on a retained root means "leave as is". A new goal's color resolves AI pick -> its category color -> a deterministic palette pick keyed on the id (`resolveNewRootColor` / `fallbackCalendarColor`), never the silent `calendarColors[0]` red default that `buildTaskEvent` falls back to for a null `Planner.color`. The library "New item" modal and every AI-created row therefore get a real color; only Capture-inbox jots stay uncolored.
  - **Streaming path is a Route handler**, not a server action. See the note in "Code style rules" — SSE bytes don't fit the server-action return shape.
  - **Template draft ids ARE the DB ids** — unlike goal draft ids (re-minted at Save), a route-minted template uuid survives into the EventTemplate row (WeekStructureModal set the uuidv4-id precedent). applyDraftTemplates must keep returning untouched rows by object identity: the template sync diff does not strip timestamps, so a fresh object with a fresh updatedAt would produce a phantom update on every save.
  - **Template ops never reject overlap** — overlapping templates are an engine warning by design; the assistant flags them in prose instead.
  - **Window AND category draft ids ARE the DB ids** — like templates: route-minted uuids survive into CategoryTimeWindow and Category rows (WeekStructureModal mints client-side uuids at save, same precedent). Windows carry no timestamps, so the sync diff is purely value-based — but applyDraftWindows must stamp `userId` on rebuilt rows (the diff compares it) and must NOT restamp a category's `updatedAt` for window-only changes (the category diff strips timeSlots but compares updatedAt — a spurious restamp is a phantom category update).
  - **Assistant windows are within-day** (`startTime < endTime`, `"23:59"` sentinel). The engine's `expandSlotForDay` supports overnight windows (endTime <= startTime), but the WeekStructureModal serializers would render one as a negative-duration event — don't loosen the op validator without fixing that renderer.
  - **Window overlap is checker-enforced via the model, not op-rejected** — unlike templates (overlap allowed by design), windows must never overlap. `findWindowOverlaps` (draftWindows.ts) runs after add/update window ops; collisions involving the touched windows are appended to the tool_result (`"Work" Sat 10:00-14:00 overlaps "Fun" Sat 12:00-16:00`) and the prompt instructs the model to resolve them before ending its turn. Ops still accept the state so a batch can be fixed by a follow-up call; pre-existing overlaps in user data are not re-reported on unrelated ops.
  - **The assistant has full category CRUD, prompt-gated where it reshapes things** — `add_categories`/`update_categories`/`delete_categories` cover name, color, parentId, locationId, and all three scheduling flags. The prompt reserves `isStrict`/`confineToOwnWindows` changes and any delete for explicit user requests (deletes cascade the subtree + windows; items become uncategorized via the DB's `SetNull`, never deleted). `add_time_windows` still auto-enables `useTimeWindows` deterministically. Locations remain read-only (creation needs Google Places) — only assignable by id.
  - **Category apply is per-field, concurrent-safe** — applyDraftWindows applies only the fields the assistant actually changed (canonical vs working), so edits made elsewhere while the modal was open survive on untouched fields; a concurrent delete elsewhere wins over an assistant edit (no resurrection), and an assistant delete cascades over the current tree exactly like the DB's `parentId` cascade will.
  - **Categories apply before the forest at Save** — handleSave computes `nextCategories` first and validates goal `categoryId`s against it, so filing a goal under a category created in the same conversation survives the save.
  - **BYOK is deferred** — one key in `.env` for now (see TODO). If/when we ship publicly, wire per-user keys before enabling the feature.

  Unit tests: [__tests__/draft/](__tests__/draft/) covers forest apply (UUID preservation, subtree deletion, sortOrder stamping, categoryId validation), merge, diff, and forest equality with hand-built planner arrays, plus the template domain: ops (minting, per-field validation, locationId gating), save-time apply (object-identity no-op rule, concurrent-row preservation), and diff/day-grouping — and the categories domain: ops (window + category minting, auto-enable, range validation, category field patches, reparent cycle rejection, sibling-name dedupe, cascade delete), save-time apply (category identity, flag-vs-window updatedAt rules, userId stamping, concurrent-edit preservation, create/delete/no-resurrection semantics), and diff/category-grouping.

  ---

  ## First-run onboarding

  A once-per-user guided setup at [app/(protected)/onboarding/](app/(protected)/onboarding/). NOT a route — it's a **server-gated overlay**: [layout.tsx](app/(protected)/layout.tsx) (async server component) reads `onboardedAt`, and `ProtectedProviders` threads `needsOnboarding` into AppShell's `overlaySlot` → `OnboardingOverlay`, whose initial visibility comes from the server prop (no dashboard flash, no client round-trip). Finishing or skipping stamps `onboardedAt` via `completeOnboarding()` and hides in place. Reseed leaves admin `onboardedAt: null`. There is deliberately no dashboard setup-checklist fallback — skipping means skipping.

  Six steps (`TOTAL_STEPS = 6`): Welcome, **Roles**, Locations, Week, BrainDump, embedded-AI. It **commits as it advances** — each step writes real rows through the normal Redux → auto-sync path on Continue, and re-commits **reconcile** (never stack) so Back/forward is idempotent. Commits are **gated on `isLoaded`** (Continue disabled until the initial snapshot hydrates — an update dispatched earlier would be wholesale-replaced by the fetch), and data-driven prefills (existing roles/locations, the Work-location auto-pick) run as effects after hydration, never as mount-time initializers. The overlay swallows the shell's global palette shortcuts (mod+I/J/K) while visible:

  - **Roles** → `reconcileRoleCategories` (Covey `STARTER_ROLE_PRESETS`): creates top-level `Category` rows, restamps sortOrder/color on the roles this flow owns (reflecting the drag-reorder), removes deselected owned roles **childless-only**. Ownership is strictly creation-based — a matched pre-existing category is never adopted, restamped, or removed. Selections dedupe by normalized name (preset vs typed custom).
  - **Week** → sleep, exercise, and morning/evening routines = `EventTemplate` rows (`buildWeekTemplates`, unchanged blocks reuse the previously committed row via `reconcileWeekTemplateRows` so a re-commit is an empty diff); work hours = time windows on a **Professional** role's Work sub-category (`applyWorkCategory`, `useTimeWindows`), matching the role preset so no stray "Career" is minted; disabling work after a commit clears those windows (`clearWorkCategoryWindows`, gated by the `weekWorkApplied` progress flag). Only sleep may cross midnight (`expandDailyRange` splits it at midnight, post-midnight piece on the following day); the within-day blocks pass `allowOvernight: false`, so an `end <= start` range is dropped rather than ballooned into an overnight block.
  - **BrainDump** → pure capture, no type selector: every jot commits as a plain task (the AI step does the triage — task vs goal, deadlines, roles). `applyBrainDump` upserts triaged Planner rows by dump id, patching only fields the user changed vs the last-committed snapshot so AI-step edits (including retypes) survive a return trip. `DumpItem.type` remains in the stored model for blob compatibility; the UI always mints "task".
  - **Locations** → `createLocation` per row, persisting `createdId` markers incrementally so a partial failure doesn't duplicate on retry; a started-but-incomplete row blocks Continue with a message instead of being silently dropped.
  - **AI** → the embedded assistant (`intent="onboarding"`; see the AI-assistant section).

  Progress + owned-id sets persist per user to `localStorage["circadium.onboarding.progress.<userId>"]` (**StoredProgress v4**: `roleCommittedIds`, `weekTemplateIds`, the Week form snapshot `week` + `weekWorkApplied`, `dumpItems`, per-id `dumpCommitted` snapshots, `aiConversationId` for AI-step chat resume); `migrateProgress` normalizes older blobs and `loadProgress` adopts a legacy unscoped blob once. The theme preference (`theme.dark.<userId>`) is user-scoped the same way. Pure builders live in `_lib/` and are unit-tested ([__tests__/onboarding/](__tests__/onboarding/)); `_steps/` + `_components/` are UI.

  ---

  ## State & data flow

  ```
                            fetchCalendarData (initial)
                                    │
                                    ▼
    server actions ◄──── Redux (calendarSourceSlice, engineOutputSlice, schedulingSettingsSlice, userSlice)
                                    ▲
                                    │ dispatch
                                    │
    CalendarProvider ── useCalendarStateActions ─► updateAllCalendarStates
    (context)             updatePlannerArray /         (async thunk)
                          updateTemplateArray /              │
                          updateAll                          ▼
                                              runEngineCalculation(...)
                                              (Web Worker, latest-wins)
                                                            │
                                                            ▼
                                  events + categoryEvents + travelEvents + engineMessages
                                                written to engineOutputSlice
                                                            │
                                                            ▼
                                          useCalendarServerSync (300ms debounce)
                                              │
                                              ├─ OK   → bump dataVersion, refs forward
                                              ├─ stale → adoptFreshServerState
                                              └─ error → rollbackToLastConfirmedState
  ```

  Key wiring:

  - **The engine runs in a Web Worker** ([utils/calendar-generation/engineWorkerClient.ts](utils/calendar-generation/engineWorkerClient.ts) + `engine.worker.ts`) so regens never block the main thread. Latest-wins: a new regen terminates any in-flight worker run mid-compute and the superseded caller resolves `null` (dropped silently). Falls back to a synchronous main-thread run when workers are unavailable or crash. In the thunk, source-state dispatches (`setPlannerAndTemplate`, `setCategories`) happen synchronously BEFORE the await so rapid consecutive functional updates chain off fresh state; only `applyEngineRun` waits for the worker. The thunk never gates source dispatches on `userId` (it hydrates a beat after page load; gating silently swallowed early edits) — a missing userId only skips the engine run.
  - **Calendar drag/resize run the engine inline** (`engineMode: "inline"` through `updatePlannerArray`/`updateAll` → thunk → `runEngineCalculation`): FullCalendar has already moved the tile internally, so an async regen would paint it overlapping stale placements for a frame. Inline commits source + engine output before the next paint. Everything else stays on the worker.
  - **Every FullCalendar option must be identity-stable across renders** — the React connector shallow-diffs its props, so a fresh inline arrow/object/array counts as a changed option and triggers an internal option reset; one landing mid-drag kills the interaction without firing `eventDrop` (the tile stays painted at the drop position, nothing dispatched, refresh reverts it). [Calendar.tsx](app/(protected)/calendar/_components/Calendar.tsx) is memoized with all callbacks in `useCallback` and static options hoisted to module scope; `dayHeaderContent` is a module-level function in [page.tsx](app/(protected)/calendar/page.tsx). Hover-label changes re-render the page continuously during drags (the drag mirror fires `onMouseEnter`), so this is load-bearing, not style.
  - **Event identity is stable across regens** ([stabilizeEvent](utils/calendar-generation/helpers/EventAssembler/stabilizeEvent.ts)): builders reuse the previous emit's `extendedProps.id`/`createdAt` and return the previous object when nothing changed, so an idle regen produces an empty diff. Do not reintroduce per-regen uuids/timestamps in event builders — every non-empty sync bumps the OCC `dataVersion`, and constant churn makes a second open window's syncs permanently stale (its edits get discarded by `adoptFreshServerState`). Plans are never memoized from `previousCalendar` for the same reason a `starts` drag must always re-derive them.
  - **Planner tree walks are memoized per array** — `getTreeBottomLayer` / `getSortedTreeBottomLayer` in [utils/goalPageHandlers.ts](utils/goalPageHandlers.ts) share a `WeakMap` index keyed on the planner-array reference (children sorted by `sortOrder` at build time + bottom-layer cache). Safe because planner updates are immutable everywhere; never mutate a planner array in place or the cache serves stale trees.
  - **CalendarProvider** ([context/CalendarProvider.tsx](context/CalendarProvider.tsx)) — owns the data context, fires regen on `bufferTimeMinutes` change, fires a one-time "cold-load autoregen" when categories/locations exist but no engine output materialized yet (see the inline comment for the conditions). It exposes `isLoaded` (true once the initial snapshot has hydrated Redux): consumers that commit against prev-state — onboarding is the archetype — must gate on it, because an update dispatched before hydration is wholesale-replaced when the fetch lands.
  - **Sync** uses **optimistic concurrency control** via `User.dataVersion`. The client sends the version it knows; if the DB has moved on, the transaction aborts and the client adopts a fresh snapshot wholesale. Partial application across a DAG-shaped dataset is unsafe.
  - **CategoryEvent**, **TravelEvent**, and **EngineMessage** are all written by the engine on every regen but use **deterministic IDs**, so the diff lands as creates/deletes only when an actual placement shifted (or, for EngineMessage, only when the underlying situation changed or the user flipped `dismissed`). Don't switch them to autogenerated IDs.
  - The 60-second transaction timeout in `syncCalendarData` exists because the first regen after a fresh load runs hundreds of writes on top of the usual diff.
  - **Sync-handler update paths use bulk raw SQL** ([actions/calendar-actions/sync-handlers/bulkUpdate.ts](actions/calendar-actions/sync-handlers/bulkUpdate.ts)) — a single `UPDATE ... FROM (VALUES ...)` per table via `$executeRawUnsafe`, regardless of row count. Prisma's `updateMany` only supports "same values for all matched rows", so per-row updates would otherwise turn into N sequential round-trips inside the interactive transaction (multiplied out by the OCC guard that forces interactive form). ExtendedProps uses `INSERT ... ON CONFLICT (eventId) DO UPDATE`. CategoryEvent and TravelEvent are already collapsed to `deleteMany + createMany` because the rows are engine-derived — don't rework those to bulk update. Ghost-id safety (no P2025 on missing rows) is preserved by the WHERE join in the bulk statement.

  ---

  ## App routes & access control

  - `routes.ts` defines `publicRoutes = ["/", "/auth/new-verification"]`, `authRoutes = [/auth/login|register|error|reset|new-password]`, and `DEFAULT_LOGIN_REDIRECT = "/dashboard"`.
  - `middleware.ts` uses the **edge-safe** `auth.config.ts` (OAuth providers only) — it must NOT import anything Node-only. The Credentials provider, bcrypt, and DB access live in `auth.ts`.
  - Everything under `app/(protected)/` requires login. Unauthenticated requests are redirected to `/`.

  Nav structure (from [components/ui/shell/nav.ts](components/ui/shell/nav.ts)):

  | Key | Route | Surface |
  | --- | --- | --- |
  | dashboard | `/dashboard` | Default landing after login |
  | calendar | `/calendar` | FullCalendar surface |
  | capture | `/capture` | Quick-entry surface |
  | library | `/library` | Task/goal browser |
  | categories | `/categories` | Role + category management (nav label reads "Roles"; route path unchanged) |
  | locations | `/locations` | Location + travel-time management |
  | settings | `/settings` | (Mobile "More" tab) |

  ---

  ## Styling — Vanilla Extract

  **No Tailwind.** The leftover `components.json` is dormant — ignore it. Co-locate styles next to the component: `Foo/Foo.tsx` + `Foo/Foo.css.ts`. The Vanilla Extract plugin is wired in `next.config.mjs`.

  The design system has four layers. Prefer the higher-level surface (recipes, typography presets, sprinkles) over reaching for raw tokens.

  ### 1. Vars — theme-swappable ([lib/theme/tokens.css.ts](lib/theme/tokens.css.ts) + [themes.css.ts](lib/theme/themes.css.ts))

  CSS-custom-property contract with values assigned per theme (`themeLight`, `themeDark`). Groups:

  - `paper` / `bezel` / `ink` / `inkSoft` / `muted` / `rule` / `textOnAccent` / `overlay` / `tileFill` — flat surface + text colors
  - `glass.{bg, bgDeep, bgSoft, stroke, hi}` — frosted-panel surface fills (used as **base** fills, not hovers)
  - `interactive.{hoverFill, selectedFill}` — **row/button hover + selected states**. Direction inverts per theme: light-mode hovers **darken the paper** (ink at 7%/12%), dark-mode hovers **brighten** it (paper at 7%/12%). Use these for row hovers, not `glass.bgSoft`.
  - `shadow.{panel, panelSm}` — floating-surface elevation
  - `noise.{opacity, blend}` — noise overlay
  - `accent.{primary, now, done, secondary}` — brand accents
  - `status.{success, warning, error, info}` — semantic status
  - `swatches.{blue, green, violet, indigo, cyan, amber, rose, teal}` — category color palette
  - `font.{display, ui}` — font family bindings (Clash Display + Hubot Sans, wired in [fonts.ts](lib/theme/fonts.ts))

  ### 2. Scales — theme-independent numerics ([lib/theme/scales.ts](lib/theme/scales.ts))

  Single source of truth for sizing vocabulary. Both `sprinkles` and `style()` blocks import from here.

  - `space` (0–80px) — padding/margin/gap
  - `radii` — base tiers (`xs 6`, `sm 8`, `md 12`, `lg 16`, `xl 20`, `2xl 24`, `3xl 30`) + half-steps (`sm+2 10`, `md+2 14`, `lg+2 18`, `xl+2 22`) used by glass/popover recipes to sit intentionally rounder than a plain card at the same tier, plus `pill 999`. Values below 6 (2–5px) stay hardcoded as bespoke micro-corners.
  - `contentWidth` (`xs 520` … `2xl 1280`) — text measures + page containers. Prefer over raw `maxWidth: 1240`.
  - `breakpoints` (`mobile 767`, `tablet 1023`, `laptop 1279`) + `media` (prebuilt `@media` query strings: `mobile`, `tablet`, `laptop`, `tabletUp`, `desktopUp`, `wideUp`). `laptop` marks where a docked wide side panel (e.g. the calendar's 340px engine console) stops fitting and switches to an overlay. Rail+content page grids collapse to a stacked column at `tablet`, not `mobile` — the desktop sidebar persists through the tablet band. **Do not declare local `const MOBILE = "..."`** — import `media` from `@/lib/theme` and use `[media.mobile]` as the `@media` key.
  - `borderWidth` (`hairline 1`, `medium 2`, `thick 3`)
  - `zIndex` — semantic layers: `base 0`, `docked 5`, `raised 10`, `floating 30`, `palette 50`, `popoverOverPalette 60`, `modal 100`, `modalOver 150`, `toast 200`

  ### 3. Recipes — component shapes ([lib/theme/recipes.css.ts](lib/theme/recipes.css.ts))

  `glass`, `popover`, `pillBtn`, `badge`, `formInput`, `progressTrack`. All reference the `radii` scale internally. `pillBtn.glass` / `pillBtn.glassInk` deliberately keep a **theme-neutral inset-white-wash** hover (not `interactive.hoverFill`) because those buttons can sit on either light or dark surfaces.

  ### 4. Typography — text presets ([lib/theme/typography.css.ts](lib/theme/typography.css.ts))

  `display.{hero, bigStat, pageTitle, statCard, modalTitle, sectionHead, panelTitle, listTitle}`, `text.{body, bodyLg, bodySm, row, label, microLabel}`, `caption`, `statusTag`. Prefer over inline `fontSize` when a preset fits — presets bundle family + weight + letter-spacing + feature settings.

  ### Sprinkles — atomic props API ([lib/theme/sprinkles.css.ts](lib/theme/sprinkles.css.ts))

  Consumes all scales. Notable atoms: `bg: "hoverFill" | "selectedFill" | "glassBg" | …`, `maxWidth: "xl" | …` (contentWidth), `borderRadius: "md" | …`, `zIndex: "modal" | …`. Media conditions `md` and `lg` correspond to `tabletUp` and `desktopUp`.

  ### Other conventions

  - Category color resolution lives in [lib/theme/categoryColor.ts](lib/theme/categoryColor.ts).
  - The 45° pinstripe pattern is reserved for marking category-affiliated items on the calendar — do not use it as a screen-level backdrop.
  - `colorMixAlpha` in [effects.ts](lib/theme/effects.ts) names the recurring `color-mix(in srgb, X N%, transparent)` percentages so consumers tune a hierarchy step, not a magic number.
  - The theme preference persists per user (`theme.dark.<userId>`, written by [ThemeProvider](components/ui/ThemeProvider.tsx)); the unscoped `theme.dark` serves logged-out pages and is the one-time fallback before a scoped value exists. Any new localStorage preference tied to account data should be user-scoped the same way (see onboarding progress and its legacy-adoption pattern).
  - **Drag-reorder language is shared**: full-width neutral rows, `interactive.hoverFill` on hover, dragged row at 0.4 opacity, 2px `accent.primary` inset lines for before/after drop zones (categories rail and the onboarding Roles step both speak it). Don't invent a second visual grammar for reordering.
  - Scroll containers whose content grows with user input should set `scrollbar-gutter: stable` so the scrollbar appearing doesn't reflow the layout (see the onboarding overlay + step body).

  ---

  ## Server actions pattern

  ```typescript
  "use server";
  import { auth } from "@/auth";
  import { db } from "@/lib/db";

  export async function myAction(data: MyType) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    // ... db work, scoped to session.user.id
  }
  ```

  Conventions:

  - Every server action verifies the session first and scopes queries by `userId`.
  - Direct mutations (Location create, travel-time refresh) that bypass the diff path must call `markSynced(kind, current)` on the sync hook afterward, or the next diff will treat them as missing-on-server.
  - Mutations that need to touch many tables go through `syncCalendarData` (transactional, OCC-gated). Single-row direct edits (categories, locations) live in their own action files.

  ---

  ## Database commands

  This project uses **migrations**, not `prisma db push`.

  ```bash
  # Local Postgres (Docker)
  pnpm db:start                       # docker compose up -d
  pnpm db:stop                        # docker compose down
  pnpm db:reset:dev                   # nuke volume, restart, migrate, seed

  # Migrations
  pnpm prisma:migrate:dev             # prisma migrate dev (interactive in dev)
  pnpm prisma:migrate:deploy          # prisma migrate deploy (CI / prod)

  # Other
  pnpm db:seed                        # prisma db seed
  pnpm db:studio                      # prisma studio
  pnpm prisma generate                # regenerate client after schema changes
  ```

  The seed creates a single admin user (`admin@lifeplan.com` / `password`) and populates locations, travel times, categories, templates, and planners. Seed planners are labeled with location markers `A/B/C/D` (no-location / Work / Home / Gym).

  Migration history (single source of truth in [prisma/migrations/](prisma/migrations/)):

  - `0_init`
  - `add_data_version` — the OCC counter on User
  - `add_category_event` — materialized weekly category occurrences
  - `add_travel_event` — materialized travel events
  - `add_planner_is_triaged` — Planner.isTriaged flag for the Capture triage queue
  - `add_engine_message` — engine-emitted console rows with deterministic id and JSON payload
  - `engine_message_user_index` — `@@index([userId])` for the fetch/sync-sweep queries
  - `add_engine_message_dismissed` — user-owned soft-dismiss flag; carried forward by the engine at emit time
  - `planner_user_cascade` — Planner.userId FK converted from RESTRICT to CASCADE so account deletion cascades cleanly
  - `add_account_deletion_token` — short-lived tokens for the email-confirmation step of account deletion
  - `user_id_indexes` — `@@index([userId])` across the per-user tables the fetch/sync queries filter on
  - `verification_token_user_id` — nullable `VerificationToken.userId` so email-change tokens resolve the user by id
  - `add_password_changed_at` — `users.password_changed_at`; the jwt callback invalidates tokens issued before it
  - `task_preferences_planner_cascade` — real FK `TaskPreferences.plannerId → Planner.id` with ON DELETE CASCADE (after an orphan cleanup); replaces the manual sweep that lived in `deleteAccount.ts`
  - `add_draft_conversation` — DraftConversation: AI-assistant chat history (client-minted id, messages as Json, `@@index([userId])`, cascade delete)
  - `add_planner_sort_order` — `Planner.sortOrder` (double precision, fractional sibling key) + SQL backfill deriving per-sibling-group order from the legacy dependency chain
  - `drop_planner_dependency` — retires the `dependency` linked-list column; sibling/leaf order lives in `sortOrder`
  - `add_category_confine_to_own_windows` — `Category.confineToOwnWindows` (default false); opts a subcategory out of the upward window cascade so its items stay pinned to its own windows
  - `add_user_onboarded_at` — nullable `User.onboardedAt`; the first-run onboarding gate ("needs onboarding" ⇔ `onboardedAt === null`). Backfills existing users to `NOW()` so only genuinely new accounts see it; the seed leaves admin `null`.

  Prisma 7 requires a driver adapter at construction. Both `lib/db.ts` and `prisma/seed.ts` use `PrismaPg`. Don't construct `PrismaClient` without one.

  ---

  ## Environment variables

  Required in `.env`:

  ```
  NEXT_PUBLIC_APP_URL="http://localhost:3000"
  NEXTAUTH_SECRET=""
  DATABASE_URL=""                     # Pooled, used by the app
  DIRECT_URL=""                       # Direct, preferred by the seed for bulk writes
  GITHUB_CLIENT_ID=""
  GITHUB_CLIENT_SECRET=""
  GOOGLE_CLIENT_ID=""
  GOOGLE_CLIENT_SECRET=""
  GOOGLE_MAPS_API_KEY=""              # Places + Distance Matrix
  RESEND_API_KEY=""
  ANTHROPIC_API_KEY=""                # AI assistant — Sonnet 4.6 via @anthropic-ai/sdk
  ```

  ---

  ## Adding new features

  ### A new server action
  1. Add a file under [actions/](actions/) with `"use server"` at the top.
  2. Call `auth()`, scope every query by `session.user.id`.
  3. If it mutates rows the diff layer tracks, call `markSynced(...)` on the next render or you'll get phantom diffs.

  ### A new Prisma model
  1. Add a new file in [prisma/schemas/models/](prisma/schemas/models/) and reference it in `schema.prisma` if needed.
  2. `pnpm prisma:migrate:dev --name <descriptive_name>`.
  3. `pnpm prisma generate`.
  4. Add type re-exports in [types/prisma.ts](types/prisma.ts) (note: `.ts`, not `.d.ts`).
  5. If the model is engine output, give it a deterministic id and write wholesale on each regen — see CategoryEvent / TravelEvent for the pattern.

  ### A new scheduling strategy
  See [documentation/calendar-generation-deep-dive.md](documentation/calendar-generation-deep-dive.md#10-strategies). Implement the interface, add a weight constant in `defaultStrategy.ts`, wire it in via `buildSchedulingStrategy`.

  ### A new UI primitive
  1. Put it under [components/ui/](components/ui/) with a co-located `*.css.ts`.
  2. Add the export to [components/ui/index.ts](components/ui/index.ts).
  3. Use design tokens via `vars` from [lib/theme](lib/theme); avoid hardcoded colors.

  ### A new page
  1. Add it under `app/(protected)/<route>/page.tsx`; the protected layout already wires the providers and the AppShell.
  2. If it should appear in the desktop or mobile nav, add it to `NAV_ITEMS` / `MOBILE_TABS` in [components/ui/shell/nav.ts](components/ui/shell/nav.ts).

  ---

  ## Tests

  Engine regression tests live in [`__tests__/calendar-generation/`](__tests__/calendar-generation/):

  - **expansion-seam** — guards the local-date-keyed `CategoryEvent` ID format by forcing horizon expansion (a single Plan three weeks out). The diff layer and the DB schema depend on this composite ID; UTC-instant keying would desync near midnight UTC.
  - **completed-task-not-rescheduled** — a completed task under a ready goal must render only at its completion window, never re-enter the candidate list (guards the `prepareCandidates` completed filter).
  - **ready-gate** — a NOT-ready goal's subtree schedules nothing (its tasks are never individual candidates), while standalone tasks still place. Readiness is the scheduling gate and cascades: `toggleGoalIsReady` / `setGoalIsReady` / the assistant apply / `addSubtask` stamp the whole subtree with the root's value.
  - **ready-goal-watermark** — a ready goal must place every leaf despite the three watermark starvation modes: subtree-aggregate sizing (goals size as their largest uncompleted, still-placeable leaf), a windowless classification-only `categoryId` (the watermark resolves constraints against the same window-bearing category set placement uses), and a memoized past leaf inflating the goal's size. An exhausted expansion budget must surface `NO_SLOTS` failures instead of exiting silently.

  All but the seam test run against trimmed live-data snapshots in `fixtures/` — synthetic minimal fixtures don't produce a valid slot fabric, so new engine tests should extend the fixture pattern rather than hand-building planners. Tests use jest fake timers (`{ doNotFake: ["queueMicrotask"] }` + `setSystemTime`) for a deterministic "now", and map fixture template `startDay` weekday names to the integers the engine expects.

  Run with `pnpm test` / `pnpm test:watch`. Type-checking covers both the app and the test project: `pnpm type-check` (also chained into `pnpm lint`).

  ---

  ## Notes for future work

  - The legacy `utils/category-constraints/` folder (a vestige from when `Category.timeSlots` was a JSON column) has been removed. The constraint surface lives in the `CategoryTimeWindow` table + the engine's slot geometry.
  - Default to functions over classes when extending the engine; the core classes (`CalendarGenerator`, `Scheduler`, `TimeSlotManager`, `TravelManager`) earn their class form because they own real state. Adding a new class for "tidiness" without a polymorphism / invariant / multi-instance justification is class creep.
  - `notes/` is personal scratch — don't quote it as documentation, and don't add summary/changelog files there.
