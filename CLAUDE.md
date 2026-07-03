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
- **Anthropic SDK** (`@anthropic-ai/sdk`) for the AI coach — streams a single `propose_tree` tool call whose input JSON is parsed incrementally on the server with `partial-json` and forwarded as SSE `tree` events.
- **pnpm** 9.15.4 — use `pnpm` for all commands.

---

## Code style rules

- **No emojis** in code, comments, or generated docs.
- **No narration comments** ("// fixed to handle X", "// updated to use new API"). Comments explain *why* something non-obvious exists, not *what* the code does.
- **No summary, changelog, refactor-notes, or migration-notes markdown files** added to the repo. Make the change and commit.
- **Absolute imports with `@/`** prefix.
- **Prefer server actions** (`"use server"` files in [actions/](actions/)) over `app/api/` routes. API routes exist only for `auth/`, `admin/`, and `coach/stream/` (SSE streaming from Anthropic — a Response-body concern that doesn't fit the server-action return shape).
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
│   │   ├── layout.tsx                # StoreProvider > UserProvider > CalendarProvider > AppShell
│   │   ├── calendar/                 # FullCalendar surface
│   │   ├── capture/                  # Quick-entry surface
│   │   ├── categories/               # Category management
│   │   ├── dashboard/                # Default landing after login
│   │   ├── items/[id]/               # Item detail; sub-routes: schedule/, subtasks/
│   │   ├── library/                  # Task/goal browser
│   │   ├── locations/                # Location + travel-time management
│   │   └── settings/
│   ├── auth/                         # login/register/reset/new-password/new-verification/error
│   ├── api/                          # auth/ + admin/ + coach/stream/ (SSE)
│   └── test-shell/, test-tokens/     # Dev scaffolding
│
├── actions/                          # Server actions (preferred backend surface)
│   ├── login.ts, register.ts, reset.ts, newPassword.ts, newVerificationAction.ts, settings.ts
│   ├── scheduling.ts                 # UserSchedulingPreferences + TaskPreferences
│   ├── categories.ts                 # Category CRUD + planner-category assignment
│   ├── locations.ts                  # Location + Google Places integration
│   └── calendar-actions/
│       ├── fetchCalendarData.ts      # Initial load — returns planner/calendar/template/categories/categoryEvents/travelEvents/engineMessages + dataVersion
│       ├── fetchFreshState.ts        # Used on stale-version recovery
│       ├── syncCalendarData.ts       # OCC-gated transactional diff sync
│       └── sync-handlers/            # One handler per table (planner, calendar, extendedProps, template, category, timeWindow, categoryEvent, travelEvent, engineMessage, location, travelTime)
│
├── components/
│   ├── auth/                         # AuthCard, login/register/reset forms, Social, LoginButton
│   ├── calendar/                     # WeekStructureModal + editors (Template, Window, Event tile)
│   ├── coach/AICoachModal/           # AI coach modal — chat + JSON tree diff view; opens from ItemTabs on goals
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
│           ├── AppShell/             # Outer bezel + canvas + content row
│           ├── Sidebar/              # Desktop nav
│           ├── MobileTabs/           # Mobile bottom nav
│           ├── CapturePalette/       # Quick-entry overlay
│           ├── SearchPalette/        # Cmd-K-style search
│           ├── CaptureContext.tsx, SearchContext.tsx
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
│   ├── useCalendarStateActions       # updatePlannerArray / updateCalendarArray / updateTemplateArray / updateAll
│   ├── useManuallyRefreshCalendar    # User-triggered regen
│   ├── useServerAction               # useTransition + status pattern for mutations
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
│   │       ├── user.prisma           # User (+ dataVersion OCC counter), Account, VerificationToken, PasswordResetToken, TwoFactorToken, TwoFactorConfirmation, AccountDeletionToken, UserRole
│   │       ├── calendar.prisma       # SimpleEvent, EventExtendedProps, Planner, EventTemplate, WeekDayType, PlannerType, EventType
│   │       ├── category.prisma       # Category, CategoryTimeWindow, CategoryEvent
│   │       ├── location.prisma       # Location, TravelTime, TravelEvent, TransportMode
│   │       ├── scheduling.prisma     # UserSchedulingPreferences, TaskPreferences, enums
│   │       └── engineMessage.prisma  # EngineMessage — engine-emitted console rows with user-owned dismissed flag
│   ├── migrations/                   # 0_init … add_password_changed_at — see "Migration history" below for the full list
│   ├── seed.ts                       # Wholesale reseed (admin@lifeplan.com / "password")
│   └── seed-helpers/                 # generateCategories, generateLocations (+ TravelTimes), generatePlanners, generatePlans, generateTemplates, generateUncompletedItems
│
├── redux/
│   ├── store.ts                      # { user, calendar, schedulingSettings }
│   ├── slices/
│   │   ├── calendarSlice.ts          # planner, calendar, template, categories, categoryEvents, travelEvents, engineMessages, plannerScores (ephemeral engine output), isLoaded
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
│   └── (loose helpers)               # generalUtils, badgeTone, calendarEventHandlers, categoryUtils,
│                                     # colorUtils, dateUtils, engineTones, eventTier, goalPageHandlers,
│                                     # plannerStatus, taskArrayUtils, taskHelpers, templateBuilderUtils,
│                                     # timeFormatting, calendarUtils
│
├── __tests__/
│   └── calendar-generation/expansion-seam.test.ts  # Currently the only engine test — guards the local-date CategoryEvent ID format via a forced expansion run
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

### Templates, plans, completed

- **EventTemplate** — recurring weekly blocks (`startDay`, `startTime`, `duration`, optional `locationId`).
- **plan** — a Planner row with `plannerType: "plan"` and a fixed `starts` timestamp. Anchors the calendar.
- **completed** — any task/goal/plan with `completedStartTime` / `completedEndTime` set. Rendered at the actual completion window, not the originally-scheduled one.

### Location & travel

- **Location** — name, address, Google `placeId`, lat/lng. `null` locationId means **"Anywhere"** (no travel needed).
- **TravelTime** — directional, per-transport-mode (`DRIVING | TRANSIT | BICYCLING | WALKING`), with Google baseline values (`rushHour | regular | night`) and optional user overrides.
- **TravelEvent** — engine-materialized row written wholesale on each regen with a deterministic id (`${fromId ?? "anywhere"}-${toId ?? "anywhere"}-${start}`). Carries `insufficientTravel` / `overconstrained` markers.

### Category system

- **Category** — hierarchical (`parentId`), with `icon`, `color`, `sortOrder`, `useTimeWindows`, `isStrict`, optional `locationId`.
- **CategoryTimeWindow** — one row per weekly occurrence (`day` 0–6, `startTime`/`endTime` `"HH:MM"`). `categoryId` is nullable so windows can exist as unassigned drafts; the engine ignores those.
- **CategoryEvent** — engine-materialized weekly occurrence with a composite id `` `${categoryTimeWindowId}|${YYYY-MM-DD-local}` ``. Carries `trespassingStart` / `trespassingEnd` flags stamped by the engine when its placement violated a category boundary; the renderer reads these directly for red-border display.

A category only constrains scheduling geometry when `useTimeWindows === true` **and** `timeSlots.length > 0`. Otherwise it still contributes location inheritance, but not slot shape or strictness.

### Strict vs. soft categories

- `isStrict: true` — only items belonging to this category can be scheduled in its windows. Other items are filtered out, and the capacity check subtracts the window from any overlapping gap.
- `isStrict: false` — other items may fill empty space inside the window.

### Engine messages

- **EngineMessage** — engine-materialized console row with a deterministic id (`${TYPE}::${discriminators}`) and a typed JSON payload. Same "wholesale-write + diff by id" pattern as CategoryEvent / TravelEvent; the id encodes what makes an instance unique (plannerId, reason, travel tuple, placed count) so a shifted placement surfaces as a new row and an unchanged one is a no-op diff.
- **Dismissed flag** is user-owned. The engine consults the previous emit array at coalesce time and carries `dismissed: true` forward when the same id is re-emitted; a fresh id (situation shifted) surfaces as a new, undismissed row. Full identity model + payload shapes live in [utils/calendar-generation/models/EngineMessage.ts](utils/calendar-generation/models/EngineMessage.ts).
- Presentation prose (titles, bodies, tags) is generated by [utils/renderEngineMessage.ts](utils/renderEngineMessage.ts) from the current entity tree — the engine emits structured facts only, so a category rename doesn't rot a persisted message.

---

## Calendar generation engine (summary)

The engine takes `{ planners, templates, categories, previousCalendar, options }` and returns `{ events, categoryEvents, travelEvents }`. It is a stateful pipeline organized as an orchestrator + strategies + identity-tracked travel.

- Public entry: [utils/calendar-generation/calendarGeneration.ts](utils/calendar-generation/calendarGeneration.ts).
- Module exports: [utils/calendar-generation/index.ts](utils/calendar-generation/index.ts).
- Core classes (in [utils/calendar-generation/core/](utils/calendar-generation/core/)): `CalendarGenerator` (12-phase orchestrator; final phase emits EngineMessages), `Scheduler` (5-phase per-task pipeline), `TimeSlotManager` (thin holder for the sorted slot array), `TravelManager` (travel lookups + leg tracker).
- Each phase delegates to function modules under [utils/calendar-generation/helpers/<Name>/](utils/calendar-generation/helpers/).
- Strategies in [utils/calendar-generation/strategies/](utils/calendar-generation/strategies/): `EarliestSlotStrategy`, `LocationGroupingStrategy`, combined by `CompositeStrategy`.
- Tunable constants in [utils/calendar-generation/constants.ts](utils/calendar-generation/constants.ts): `SCHEDULING_CONFIG` (horizon chunk, watermark, placement buffer, iteration caps), `URGENCY_CONFIG`, `SchedulingFailureReason`.
- The horizon is incrementally expanded (`HORIZON_CHUNK_DAYS = 28`); the slot array carries an `isFinal` pickup marker for the next chunk.

Everything else — slot union, shard model, static travel pass, dynamic placement, buffer model, capacity gating, strategies, debug switchboard, edge cases — is in [documentation/calendar-generation-deep-dive.md](documentation/calendar-generation-deep-dive.md). Compress from there if writing about it elsewhere; do not re-document here.

---

## AI coach (goal-subtree restructuring)

Opens from the far-right button in `ItemTabs` on any goal item detail page (button gated on `plannerType === "goal"`; the modal itself sits inside `ItemDetailLayout` as a positioned sibling of the page's scroll area so it fills the item-detail content region and doesn't overlap the AppShell sidebar).

Split-pane modal ([components/coach/AICoachModal/](components/coach/AICoachModal/)):

- **Left**: chat pane. User bubbles right, coach responses left-aligned as plain text. Composer is a paper card at the bottom of the darker chat pane surface. The whole chat pane sits on `color-mix(ink 4%, paper)` so it reads as sunken relative to the tree pane.
- **Right**: JSON tree view rendering the current `workingTree` overlaid with a diff against the canonical tree — added/modified/deleted are tagged per node by [diffCoachTree.ts](components/coach/AICoachModal/diffCoachTree.ts); deleted nodes stay under their original parent at the end of that parent's children so removals are visible in-place.
- **Draggable divider** between the panes (state clamped 20/80%; both panes have `minWidth: 240px`).

Data flow per turn:

```
plannerTreeToJson(planner, rootId)      → canonical CoachNode
useAICoachState({open, canonical})       ─ owns workingTree + chat messages
  User sends message
       │
       ▼
POST /api/coach/stream                   ← auth-gated, Sonnet 4.6
  system prompt includes current tree
  tools: [ propose_tree({ tree }) ]
       │
       │ Anthropic streams input_json_delta chunks
       ▼
  server-side partial-json parse on each delta,
  emits SSE `text` and `tree` events
       │
       ▼
streamCoach (client) → onTree(tree) → normalizeCoachTree → setWorkingTree
  right pane redraws with diff overlay on every parseable subtree
       │
       ▼
User clicks Save (hasChanges = workingTree ≠ canonical, by content)
       │
       ▼
applyCoachTreeToPlanner({planner, rootId, workingTree, userId})
  - preserves existing planner UUIDs for retained nodes
  - mints fresh UUIDs only for new nodes
  - re-threads `dependency` via preorder traversal with a leaf cursor
  - fixes the outer-chain neighbor whose dep was pointing at the old last leaf
  - leaves root's parentId/dependency/categoryId/locationId/color/createdAt alone
       │
       ▼
updatePlannerArray(nextPlanner) → CalendarProvider auto-regen → sync
```

Contracts worth not breaking:

- **UUID preservation is load-bearing** — see the `preserve-planner-ids` memory note. The AI is instructed to echo existing ids; the reverse parser will only trust an id that exists in the current subtree (any other id becomes a fresh UUID). Inter-goal dependencies (planned) will reference these ids.
- **`dependency` is never emitted by the AI** — sibling order is array position. The reverse parser re-threads the linked list from scratch. The AI's JSON contract intentionally omits the field so the model can't produce a malformed chain.
- **Streaming path is a Route handler**, not a server action. See the note in "Code style rules" — SSE bytes don't fit the server-action return shape.
- **BYOK is deferred** — one key in `.env` for now (see TODO). If/when we ship publicly, wire per-user keys before enabling the feature.

Related utilities: [normalizeCoachTree.ts](components/coach/AICoachModal/normalizeCoachTree.ts) fills defaults for partial JSON mid-stream so the renderer and diff can rely on complete `CoachNode` shape.

---

## State & data flow

```
                          fetchCalendarData (initial)
                                   │
                                   ▼
   server actions ◄──── Redux (calendarSlice, schedulingSettingsSlice, userSlice)
                                   ▲
                                   │ dispatch
                                   │
   CalendarProvider ── useCalendarStateActions ─► updateAllCalendarStates
   (context)             updatePlannerArray /         (thunk → engine)
                         updateCalendarArray /              │
                         updateTemplateArray /              ▼
                         updateAll                generateCalendar(...)
                                                           │
                                                           ▼
                                events + categoryEvents + travelEvents + engineMessages
                                                  written to calendarSlice
                                                           │
                                                           ▼
                                        useCalendarServerSync (300ms debounce)
                                            │
                                            ├─ OK   → bump dataVersion, refs forward
                                            ├─ stale → adoptFreshServerState
                                            └─ error → rollbackToLastConfirmedState
```

Key wiring:

- **CalendarProvider** ([context/CalendarProvider.tsx](context/CalendarProvider.tsx)) — owns the data context, fires regen on `bufferTimeMinutes` change, fires a one-time "cold-load autoregen" when categories/locations exist but no engine output materialized yet (see the inline comment for the conditions).
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
| categories | `/categories` | Category management |
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
- `breakpoints` (`mobile 767`, `tablet 1023`) + `media` (prebuilt `@media` query strings: `mobile`, `tablet`, `tabletUp`, `desktopUp`). **Do not declare local `const MOBILE = "..."`** — import `media` from `@/lib/theme` and use `[media.mobile]` as the `@media` key.
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
ANTHROPIC_API_KEY=""                # AI coach — Sonnet 4.6 via @anthropic-ai/sdk
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

Only one engine test currently lives in the repo: [`__tests__/calendar-generation/expansion-seam.test.ts`](__tests__/calendar-generation/expansion-seam.test.ts). It guards the local-date-keyed `CategoryEvent` ID format by forcing horizon expansion (a single Plan three weeks out). The diff layer and the DB schema depend on this composite ID; UTC-instant keying would desync near midnight UTC.

Run with `pnpm test` / `pnpm test:watch`.

---

## Notes for future work

- The legacy `utils/category-constraints/` folder (a vestige from when `Category.timeSlots` was a JSON column) has been removed. The constraint surface lives in the `CategoryTimeWindow` table + the engine's slot geometry.
- Default to functions over classes when extending the engine; the core classes (`CalendarGenerator`, `Scheduler`, `TimeSlotManager`, `TravelManager`) earn their class form because they own real state. Adding a new class for "tidiness" without a polymorphism / invariant / multi-instance justification is class creep.
- `notes/` is personal scratch — don't quote it as documentation, and don't add summary/changelog files there.
