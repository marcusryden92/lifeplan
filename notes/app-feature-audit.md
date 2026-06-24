# App Feature & Layout Audit

A flat walk of what exists today under [app/](../app/). Brand name in the UI is **Circadium**. Stack: Next.js 14 App Router, server components where it makes sense, otherwise `"use client"`.

---

## Top-level layout

[app/layout.tsx](../app/layout.tsx)
- Root `<html>`. Loads display + UI fonts, wraps everything in `SessionProvider` (NextAuth) and `ThemeProvider`. Document title: "Circadium". Nothing renders without these.

---

## Public surface

### Landing page — [app/page.tsx](../app/page.tsx)
- Hero with `<VectorField />` ambient animation + wordmark + Sign in / Get started buttons.
- "What it is" — 3 feature tiles (engine-not-list, whole life one plan, stays honest).
- "See a week" — placeholder card for a calendar preview (not wired).
- CTA card + footer.

### Auth — [app/auth/](../app/auth/)
- Shared layout [auth/layout.tsx](../app/auth/layout.tsx): split panel, VectorField on the left, form on the right, "← back" link to /.
- Routes (each page just renders the form component from `components/auth/`):
  - [login](../app/auth/login/page.tsx)
  - [register](../app/auth/register/page.tsx)
  - [reset](../app/auth/reset/page.tsx) — request password reset
  - [new-password](../app/auth/new-password/page.tsx) — set new password from token
  - [new-verification](../app/auth/new-verification/page.tsx) — email verification landing
  - [error](../app/auth/error/page.tsx) — auth error display

---

## Protected app — [app/(protected)/](../app/(protected)/)

### Shell — [(protected)/layout.tsx](../app/(protected)/layout.tsx)
- Wraps every protected route in StoreProvider (Redux) → UserProvider → CalendarProvider → `AppShell`.
- `AppShell` (from [components/ui/shell/AppShell](../components/ui/shell/AppShell/)) renders the persistent sidebar + capture palette.
- Sidebar items defined in [components/ui/shell/nav.ts](../components/ui/shell/nav.ts): Dashboard, Calendar, Capture, Library, Categories, Locations. Mobile tab bar exposes Dashboard / Library / Capture (modal) / Calendar / More→Settings.

### Dashboard — [/dashboard](../app/(protected)/dashboard/page.tsx)
- Greeting + summary line (counts of items, planned minutes, overdue).
- Left card: today's agenda from `_mock/dashboard.ts` (mock data, not live). Rows show time, duration, title, category badge, location, "LATE / OVERDUE" tags.
- Right card: priority goals — progress bars + "next step" and deadline.
- Header actions: trigger Capture palette, link to /calendar.

### Calendar — [/calendar](../app/(protected)/calendar/page.tsx)
- The scheduler-driven week view. Uses FullCalendar with day/time grids + RRule + Luxon plugins via [_components/Calendar.tsx](../app/(protected)/calendar/_components/Calendar.tsx).
- Sub-header: week range, prev/today/next nav, hovered-category chip, filters/view buttons (placeholder), "Plan week" opens [WeekPlanModal](../components/calendar/WeekPlanModal.tsx), "Regenerate" calls `manuallyRefreshCalendar`.
- Right side: collapsible "Engine" console fed by `ENGINE_MSGS` / `ENGINE_SUMMARY` mocks from [_mock/calendar.ts](../app/(protected)/_mock/calendar.ts) — fail/warn/done/info messages + tone-coloured cog alert dot. Collapse state persisted to `localStorage` under `circadium.engine.collapsed`.
- Tuning controls: [EngineControls](../app/(protected)/calendar/_components/EngineControls.tsx) — buffer-minutes slider + strategy weight inputs, debounced into Redux + server persistence.
- Renders Category background events, Plans, Travels, Templates, and dynamically scheduled task events via custom event components in [components/events/](../components/events/).

### Capture — [/capture](../app/(protected)/capture/page.tsx)
- Inbox triage. Left rail: queue of unprocessed items (oldest first) + quick-add input.
- Main: type picker (task / plan / goal / trash) + duration + deadline-or-start + category picker ([CategoryPicker](../app/(protected)/capture/_components/CategoryPicker/)).
- Actions: Skip / Save as draft / Save & mark ready.
- Keyboard layer in [_hooks/useCaptureKeyboard.ts](../app/(protected)/capture/_hooks/useCaptureKeyboard.ts) — type keys 1/2/3, Enter to save, x to trash.
- Footer hint links to /library.

### Library — [/library](../app/(protected)/library/page.tsx)
- Left rail: "Smart views" (Today, This week, Inbox, Overdue, All goals, All plans, Done · 7d) + categories tree from [_components/CategoryTreeNode](../app/(protected)/library/_components/CategoryTreeNode/).
- Main: breadcrumb (Library › view/category), filter strip (segmented controls: type, status, sort) + search.
- Table of items via [_components/ItemRow](../app/(protected)/library/_components/ItemRow/). Click row → `/items/[id]`.
- "New item" button in header (no handler yet — placeholder).

### Item detail — [/items/[id]](../app/(protected)/items/[id]/)
Routing structure:
- [layout.tsx](../app/(protected)/items/[id]/layout.tsx) → re-exports [ItemDetailLayout](../app/(protected)/items/[id]/ItemDetailLayout/ItemDetailLayout.tsx)
- [page.tsx](../app/(protected)/items/[id]/page.tsx) → re-exports [ItemDetailPage](../app/(protected)/items/[id]/ItemDetailPage/ItemDetailPage.tsx) (the "Overview" tab body)

Layout owns: back link, inline-editable title, "Mark ready" toggle (goals only, with blocker hints + can't-un-ready guard), the tab strip, and three confirm modals (delete, cascade location to subtasks, reset sub-goal locations). Loads categories via `categoryActions.fetchCategories()` then shares state through [ItemContext](../app/(protected)/items/[id]/_components/ItemContext/).

Tabs ([ItemTabs](../app/(protected)/items/[id]/_components/ItemTabs/ItemTabs.tsx)):
- **Overview** — completion checkbox (tasks, gated on ready), progress bar (goals), [IdentityCard](../app/(protected)/items/[id]/_components/IdentityCard/) on the left (Priority / Type / Category / Date / Duration / Location / Delete row), right column has three [SideCards](../app/(protected)/items/[id]/_components/SideCards/SideCards.tsx): "Next on calendar" (live from generated calendar events), "AI helper" (static placeholder pills), "Engine notes" (static placeholder text).
- **Schedule** — [StubPage](../app/(protected)/items/[id]/schedule/page.tsx). Not implemented.
- **Subtasks** — only enabled for goals. Renders `TaskList` + `AddSubtask` from [components/tasks/](../components/tasks/), plus an [EditDrawer](../app/(protected)/items/[id]/subtasks/_components/EditDrawer/) that slides in when a subtask is focused.
- **Activity** — [StubPage](../app/(protected)/items/[id]/activity/page.tsx). Not implemented.

### Categories — [/areas](../app/(protected)/areas/page.tsx)
(Route is `/areas` but the page title is "Categories" — relic of the rename.)
- Tree rail of categories with HTML5 drag-and-drop reorder/reparent ([AreaTreeNode](../app/(protected)/areas/_components/AreaTreeNode/)), "New category" button at the bottom.
- Main: [AreaEditor](../app/(protected)/areas/_components/AreaEditor/AreaEditor.tsx) — rename, colour swatch (SWATCH_PALETTE), parent picker, default location, isStrict toggle, useTimeWindows toggle, list of sub-categories, "Plan week" opens [WeekPlanModal](../components/calendar/WeekPlanModal.tsx) focused on this category, delete.
- All mutations are pure Redux dispatches; `useCalendarServerSync` debounces and batches the diff to the server.
- Includes [WindowsMiniGrid](../app/(protected)/areas/_components/WindowsMiniGrid/) for visualising time-window slots.

### Locations — [/locations](../app/(protected)/locations/page.tsx)
- Left rail: locations list (name, address, category-default tags), "Add location" CTA capped at `MAX_LOCATIONS`.
- Main: [TravelMatrix](../app/(protected)/locations/_components/TravelMatrix/) — from-row × to-column grid with rush/regular/night triplets for time-varying modes, single value for walking/cycling.
- Header: transport mode segmented control (driving/transit/cycling/walking) + "Fetch missing" + "Refresh all" (Google Distance Matrix via server actions).
- Modals: [AddLocationModal](../app/(protected)/locations/_components/AddLocationModal/) (Places autocomplete via [usePlaceSearch.ts](../app/(protected)/locations/_hooks/usePlaceSearch.ts)), [EditLocationModal](../app/(protected)/locations/_components/EditLocationModal/), [EditTravelTimeModal](../app/(protected)/locations/_components/EditTravelTimeModal/) for custom overrides, plus confirms for delete and "clear all overrides".

### Settings — [/settings](../app/(protected)/settings/page.tsx)
- Server-renders the user, then [SettingsView](../app/(protected)/settings/_components/SettingsView.tsx) handles sections via a left subnav.
- Sections:
  - **Profile** — [ProfileSection](../app/(protected)/settings/_components/ProfileSection/) — edit name.
  - **Account** — [AccountSection](../app/(protected)/settings/_components/AccountSection/) — wraps [EmailCard](../app/(protected)/settings/_components/EmailCard/), [PasswordCard](../app/(protected)/settings/_components/PasswordCard/) (+ [usePasswordChange](../app/(protected)/settings/_components/PasswordCard/usePasswordChange.ts)), [TwoFactorCard](../app/(protected)/settings/_components/TwoFactorCard/), [ProvidersCard](../app/(protected)/settings/_components/ProvidersCard/) (linked OAuth providers).
  - **Scheduling** — [SchedulingSection](../app/(protected)/settings/_components/SchedulingSection/SchedulingSection.tsx) — default transport mode, toggle for showing travel as its own event block, read-only buffer summary (slider lives on Calendar).
  - **Notifications / Integrations / Data & export** — all [ComingSoonSection](../app/(protected)/settings/_components/ComingSoonSection/) placeholders.
  - **Danger zone** — [DangerSection](../app/(protected)/settings/_components/DangerSection/) — destructive account actions.
- Sign-out button in header.

### Mocks — [_mock/](../app/(protected)/_mock/)
- `dashboard.ts` — today's agenda + goals fixture for the Dashboard.
- `calendar.ts` — `ENGINE_MSGS` / `ENGINE_SUMMARY` fixtures for the engine console.
Both are hardcoded; nothing else reads them.

---

## Shared subsystems referenced from multiple pages

### WeekPlanModal — [components/calendar/WeekPlanModal/](../components/calendar/WeekPlanModal/)
Used by **Calendar** ("Plan week" button) and **Categories** ("Plan week" button on the AreaEditor — opens with `initialMode="windows"` and the selected category focused).

A full-screen Radix dialog that edits two things on a single archetypal week (the canvas date is hardcoded to `REFERENCE_WEEK_DATE`):
- **Templates** mode — recurring blocks (Sleep, Work, etc.) backed by Prisma `EventTemplate`. Drag-to-draw creates a new block with a default colour from `TEMPLATE_PALETTE`; templates can overlap.
- **Categories** mode — `WorkingWindow` time slots assigned to a category (the legacy `Category.timeSlots` JSON). Drag-to-draw is blocked from overlapping existing windows via `overlapsWindow`. When opened with `focusedCategoryId`, other categories' windows render dimmed.

Inner layout:
- Top banner: editing label, mode toggle (Templates / Categories), live count, Cancel/Save buttons. Save label shows the unsaved change count.
- Body: FullCalendar timeGridWeek on the left with drag/resize/select handlers; right rail shows [TemplateEditor](../components/calendar/WeekPlanModal/TemplateEditor/) or [WindowEditor](../components/calendar/WeekPlanModal/WindowEditor/) for the selected block.
- State lives in [useWeekPlanState.ts](../components/calendar/WeekPlanModal/useWeekPlanState.ts) — keeps `tplsWorking` / `winsWorking` working copies, tracks `changeCount` against the originals, and `saveAll` writes both back via server actions when the user commits.
- Closing with unsaved edits triggers a `ConfirmModal` ("Discard unsaved changes?").
- `selectAllow` / `eventAllow` enforce same-day blocks and no-overlap for windows; drops that violate either revert. Snap is 15 min, slot is 30 min, scroll starts at 06:00.

### Subtask tree — [components/tasks/](../components/tasks/) + [draggable/](../components/draggable/)
Rendered inside `/items/[id]/subtasks` for goals. Three pieces interact:

**[TaskList.tsx](../components/tasks/TaskList.tsx)** — recursive list for a parent id.
- Pulls subtasks via `getSubtasksById(planner, id)` (or accepts them via prop).
- Sorts via `sortTasksByDependencies` so blocked-by relationships render in order.
- Renders each child as `<TaskItem>`, sandwiched by a `<TaskDivider>` (top of each row plus a trailing bottom divider after the last row). Dividers are the drop targets that reorder/reparent on drop.

**[TaskItem.tsx](../components/tasks/TaskItem.tsx)** — one row.
- Grip handle on the left starts a drag via `setCurrentlyClickedItem`; the body gets a `lp-dragging` class so global styles can dim other rows.
- If the task has children → expand/collapse chevron toggles `subtasksMinimized`; clicking the row sets `focusedTask` in [DraggableContext](../components/draggable/DraggableContext.tsx), which opens the EditDrawer.
- If the task is a leaf → a completion checkbox. Completion is **locked** while the root goal is not `isReady` — clicking a locked checkbox triggers a 420ms shake-and-red-flash via `data-shake`, with a tooltip "Mark the goal ready before completing subtasks". Toggling completion calls `toggleSubtaskCompletion` from `utils/goal-handlers/subtaskCompletion`.
- Body renders [TaskHeader](../components/tasks/task-item-subcomponents/TaskHeader.tsx) (title + add-child button) and recursively `<TaskList>` for its own children, wrapped in `<TaskListWrapper>` to handle the collapse animation.

**[TaskHeader.tsx](../components/tasks/task-item-subcomponents/TaskHeader.tsx)** — title + inline "+" button.
- Clicking the header sets `focusedTask`, opening the drawer.
- Inline "+" calls `addSubtask` with a default `"New subtask"` title and 15-minute duration, then auto-focuses the new id.
- Subtitle dimming (`headerInnerDim`) kicks in when the row has children but isn't the focused row.

**[AddSubtask.tsx](../components/tasks/task-item-subcomponents/AddSubtask.tsx)** — the persistent "add a new subtask" input at the root of the tree (`isMainParent` mode) or inline under another parent.
- Title input + minutes input + plus button. Enter on the duration input commits. Defaults: 5 min if duration is blank.

**[EditDrawer](../app/(protected)/items/[id]/subtasks/_components/EditDrawer/EditDrawer.tsx)** (lives under the page, but is the right half of the subtask UI) — slides in when `focusedTask` is set. Lets you rename, duration-stepper, deadline, mark complete (same lock + shake as the row checkbox), choose a location, and delete the subtask. Closing clears `focusedTask`.

Drag-and-drop is implemented from scratch in [components/draggable/](../components/draggable/), not via a library — `DraggableContext` tracks `currentlyClickedItem` + `focusedTask`, `DraggableItem` is the source wrapper, `TaskDivider` is the drop target, and `DragDisableListWrapper` suppresses click handlers during drag.

---

## API surface — [app/api/](../app/api/)
- [auth/[...nextauth]](../app/api/auth/) — NextAuth catchall.
- [admin/route.ts](../app/api/admin/route.ts) — admin-only endpoint.
Everything else uses server actions in [actions/](../actions/).

---

## Test pages (dev sandboxes, not user-facing)
- [/test-shell](../app/test-shell/page.tsx) — AppShell + design tokens preview.
- [/test-tokens](../app/test-tokens/page.tsx) — design token grid.

---

## Status summary

**Wired to live data + scheduler:**
Calendar, Capture, Library, Categories, Locations, Settings (Profile/Account/Scheduling), Item detail (Overview, Subtasks).

**Mock data:**
Dashboard agenda + goals, Calendar engine console messages, Item detail "AI helper" and "Engine notes" side cards.

**Stub / coming soon:**
Item detail Schedule tab, Item detail Activity tab, Settings → Notifications, Integrations, Data & export. "New item" button on Library has no handler.

**Naming quirks:**
- Route `/areas` renders a page titled "Categories" (rename in progress — sidebar entry already says "Categories").
- "Library" New-item button + Dashboard's `4 in inbox to triage` line are visual-only.
