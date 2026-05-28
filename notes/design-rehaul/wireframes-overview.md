# Circadium — Documentation Outline

*A calendar that plans **around** your life. You say what matters; the engine weaves it through the week within the rules you set (life areas, time windows, places & travel, recurring templates), with an AI coach to help draft goals.*

This outline documents the v2 wireframes. It is organized by **functional surface**. Where a surface exists on both web and mobile, its **Web** and **Mobile** specifications are written together under that section rather than split into two separate documents.

---

## 0. Core concepts & vocabulary

These primitives recur across every screen; defined once here.

- **Item** — the atomic unit. Three types:
  - **Task** — flexible work; the *engine* picks the time slot. Has duration, deadline, priority.
  - **Plan** — fixed-time commitment (e.g. a meeting); the user owns its time.
  - **Goal** — a container that holds subtasks; has rolled-up duration and a progress bar.
- **Subtask** — a task nested inside a goal.
- **Life Area** — a category of life (Career, Health, Home, Relationships, Finance, Growth…). Carries the *rules*: a color, an icon, a default location, a strict/soft flag, time windows, and optional sub-areas.
- **Time window** — a recurring band of allowed time for an area (e.g. Career = Mon–Fri 9–5). **Strict** = only that area's items may be scheduled inside; **soft** = suggested but not enforced.
- **Place** — a saved location with an address. May be the default for one or more areas. Up to 10 places.
- **Travel matrix** — travel time between every pair of places, for three times of day (rush / regular / night) and a transport mode (driving / transit / bike / walk).
- **Template** — a recurring weekly block that always sits on the calendar (sleep, standup, gym, family dinner).
- **The Engine** — the scheduler. Places items into open slots honoring windows, buffers, travel time, and strategy weights; emits messages (failures, late placements, travel warnings, trespasses) and proposed one-click fixes.
- **Capture** — ambient, always-reachable quick entry (⌘K on web, raised center tab on mobile). Raw notes land in an Inbox and are later triaged into items.

**Visual system (wireframe fidelity):** hand-drawn / sketchy low-fi style — Patrick Hand & Caveat for hand lettering, Special Elite (monospace) for tags and metadata. Paper/ink palette with a red-ink accent for warnings & emphasis; per-area pastel swatches. This is a low-fidelity exploration, not final visual design.

---

## 00. Proposed Information Architecture

*Reference map only — not a buildable screen.*

- Documents the rethink from **9 incrementally-grown pages → 4 primary surfaces + ambient capture.**
- **Before:** Landing/Auth, Calendar, Items, Item detail, Inbox, Categories, Locations, Settings, Strategy — capture split across two places; categories & locations isolated; "strategy" a debug page; item detail too heavy.
- **After — 4 primaries:**
  - **Today** — now / next / what slipped.
  - **Library** — everything you might do (inbox, tasks, goals, plans; filters, views, search).
  - **Calendar** — the woven week (why / when / override).
  - **Life Areas** — the rules of your life.
- **Ambient capture** — ⌘K, voice, paste, drag; always reachable; feeds all three working surfaces (raw → triage into Library, quick-add into Calendar, schedule-now).
- **Collapsed into other surfaces:** Places ↓ Life Areas; Engine → Calendar drawer; Settings kept but simplified.
- Connection map shows: Capture → all surfaces; Library ↔ Calendar (plan ↔ schedule); Today ← Library.

---

## 01. Navigation shell

The persistent chrome that wraps every primary surface.

### Web
- **Collapsible left sidebar** (replaces a top nav). Two states:
  - **Expanded (224px)** — icons + labels + sub-captions.
  - **Collapsed (60px)** — icons only; logo reduces to a single "c".
- Nav items: **Today** (dashboard), **Capture** (⌘K · always), **Library** (tasks · goals), **Calendar** (the woven week), **Life Areas** (rules of life), **Places** (travel matrix).
- Selected item is filled (ink) with inverted text.
- **Footer:** user glyph + name + "settings" link; collapse chevron.
- Collapse state **persists per device.**

### Mobile
- **Bottom tab bar** with 5 destinations: **Today**, **Library**, **Capture** (raised center button), **Calendar**, **More**.
- **Capture** is a raised circular button (ink fill, red-ink drop shadow) — always one tap away from anywhere.
- Selected tab shows ink color + underline; others are pencil-gray.
- Side panels and drawers from web become **bottom sheets** or **full-screen** views on mobile.
- Some screens hide the nav (`hideNav`) when they are modal/full-screen (detail, capture sheet, triage, auth, onboarding).

---

## 02. Today dashboard

Landing page — "what to do today" + priority goals. Home base.

### Web
- **Header:** date tag, greeting ("Good morning, Alex"), summary line (e.g. "6 things on today · 4h 40m planned work · 1 overdue · 4 in inbox to triage").
- **Quick actions:** ⌘K capture · triage N → · open calendar →.
- **Two-column body:**
  - **Left — "What to do today"** (in scheduler order): list rows with checkbox, time/duration, title, area badge + swatch. Row states: **NOW** (highlighted, ink border), **plan**, **travel** (dimmed, no checkbox emphasis), **scheduled past deadline** (red badge), **overdue** (red badge). Footer: "+ add to today", "full week →".
  - **Right — "Priority goals":** per-goal card with swatch, name, deadline, progress bar (with % and N/total), and "→ next:" step. Below: **stats strip** — this week (e.g. 22/31 · 71% scheduled), overdue count, streak.

### Mobile
- **MTop** header: "Good morning" + "wed apr 10 · 6 things today" + user glyph.
- **NOW card** (highlighted, drop shadow): current block with time range, area badge, title, duration + location.
- **"up next today"** list: compact rows (time/duration, title, late/over badges or area swatch).
- **"priority goals"** list: compact cards with swatch, name, fraction, progress bar, "→ next" line.
- **Empty / first-run variant** ("Today · all clear"): "You're set ✦" card with setup checklist (areas / place / templates done; capture & AI coach pending) and a "tap + to capture" nudge.

---

## 03. Capture · Triage queue

Turn raw notes into schedulable items, one keystroke per card.

### Web
- **Header:** "Triage" + subtitle, "N to triage" red badge, ⌘K capture.
- **Left — Queue (300px):** "oldest first"; inline quick-capture pill ("jot anything… ↵"); scrollable list of raw notes with age (1d, 2d, 3h…); selected note highlighted.
- **Right — Triage card** (the focused note):
  - Large note title with sketchy underline; "1 of 7 · captured 1 day ago".
  - **Type selector** (keyboard-driven): **task** (key 1, scheduler picks slot), **plan** (2, fixed time), **goal** (3, holds subtasks), **trash** (x, danger).
  - **Fields:** duration, deadline, priority (/10).
  - **Area** (badge + swatch, "change ▾") and **where** (inherited from area).
  - **"Rules that will apply"** panel — shows the window / strict flag / buffer that govern scheduling, *instead of* a costly ghost-calendar simulation. Note: exact slot is shown on the calendar after triage.
  - **Actions:** ← skip (⌘[), save without scheduling, **schedule it (↵)**.
  - **Keyboard legend:** ↵ confirm · ⌘← undo · esc exit · 1/2/3/x switch type.

### Mobile
- **Capture = bottom sheet** (over a dimmed Today): grab handle, "Capture · jot · classify later", text input with cursor, auto-suggested chips (type · task, dur · 30m, by Fri, **area? Health ▾** in red = needs attention), actions: "save to inbox" / "schedule".
- **Triage = full-screen card** (`hideNav`): note title + underline; 4-up type selector (task/plan/goal/🗑); dur / deadline / prio mini-cards; area + place badges; rules line; bottom action bar: ← skip / save only / **schedule →**.

---

## 04. Library

Everything you might do — smart views + nested life areas + a browseable table.

### Web
- **Left rail (260px):**
  - **Smart views:** Today, This week, Inbox (red), Overdue (red), All goals, All plans, Done · 7d — each with a count. "+ save current view".
  - **Browse all** (ink button, total count) → table view of everything; "filter · sort · group · search".
  - **Nested life-areas tree** (VS-Code / file-route style): areas → goals/sub-folders → nested goals, collapsible (▾/▸), with per-node count, a "G" tag for goals, color swatch, and a red left-border on the selected node. "+ new area / sub-area".
- **Right — browse area:**
  - **Breadcrumb** (Library › Area › sub › goal) + item count badge; "+ new item here".
  - **Filter strip:** search in area, type ▾, status ▾, **incl. sub-areas ▾**, sort ▾; **view toggle** table / cards.
  - **Table:** columns — checkbox, title, type, duration, deadline, where, status (planned/ready), overflow (···). Overdue deadlines in red.

### Mobile
- **MTop:** "Library" + "42 items · 6 areas" + search glyph.
- **Smart-views chip row** (horizontal scroll): inbox·7 (red), today·4, week·12, overdue·2 (red), goals.
- **Areas tree** below (same nested Tree component), tap to drill in.
- Item table → opens **item detail** full-screen; bulk select is a separate mode (see §16).

---

## 05. Calendar

The woven week + the engine's message console.

### Web
- **Header:** week range (Apr 8–14), ‹ today › nav, **view toggle** week / day / list, "filters · all areas", **regenerate ↻**.
- **Left — full-bleed week grid:**
  - Day-of-week header (today in red); hour rail (7a–8p).
  - **Strict area windows** rendered as hatched bands (e.g. Career Mon/Wed/Fri 9–12).
  - **Event types** color/style-coded: **template** (dashed, muted), **plan** (ink fill), **task** (area color, ink border; red border = warning; drop shadow = emphasis), **travel** (dashed, transparent, "🚗 → home").
  - **"NOW" line** — red dashed line with timestamp pill.
- **Right — Engine messages console (340px):**
  - "Engine messages · last gen 2m ago"; counts (3 warnings · 1 failure).
  - **Message cards** by tone: **FAIL** (red, e.g. "couldn't place — no 6h gap fits"), **LATE**, **TRAVEL** (insufficient travel time), **TRESPASS** (item sits in another area's strict window), **OK** (info summaries). Each has a tag, title, body; proposed actions teased (see §19).
  - **Legend:** area swatches, template, travel, strict-window hatch.

### Mobile
- **Default = agenda view:** MTop ("Wed Apr 10 · 6 events · 1 warning", agenda ▾); horizontal week-day strip (today filled); vertical list of events (time/duration + title + area swatch / plan / template / late / overdue badges; NOW highlighted).
- **Day grid view** (day ▾): vertical hour grid with positioned event blocks; red NOW line with time pill.
- **Engine messages = full-screen** (`hideNav`): MTop ("Engine · 3 warnings · 1 fail · 2m ago · ↻"); stacked FAIL/LATE/TRAVEL/TRESPASS cards each with a "see fixes →" button.

---

## 06. Item detail

Full-screen item editor with an item tree and tabs.

### Web
- **Breadcrumb bar:** Library › area › item title; keyboard hints (⌘← back · j/k next item · ⌘e edit title).
- **Left — VS-Code-style item tree (240px):** areas → goals → subtasks, with done / current markers, selected node highlighted, "+N more" overflow.
- **Right — content:**
  - **Title block:** type badge, area badge, "ready" badge, created-ago; large title + underline.
  - **Goal:** progress bar with subtask tick marks ("7 of 12 · 58% · by May 25 · 4 weeks left").
  - **Task:** **overdue banner** in place of progress ("deadline Apr 7 passed · engine couldn't fit · proposed: today 5pm · [accept slot]").
  - **Tabs:** Overview · Schedule · **Subtasks** (badge count for goals; **politely disabled for tasks** with "· n/a for tasks") · Activity. Right-aligned: duplicate / delete (red).
  - **Overview body (2-col):**
    - Left: **Identity** (type, area, priority bar, duration — "rolled-up · computed" for goals), **Place** (inherited from area; "use area's default location"; auto-added travel for goals), **Subtasks preview** (goals only — first few with done/current/scheduled markers, "see all 12 in Subtasks tab →").
    - Right rail: **Next on calendar / Scheduled** (or "not yet scheduled" in red for the overdue task), **Engine notes** (clustering, fit-to-deadline, or why-it-failed), **Activity** log.
- Two artboard variants documented: **goal detail** (Subtasks tab active) and **task detail** (Subtasks disabled, overdue banner).

### Mobile
- **Full-screen** (`hideNav`), MTop "Goal" / "Task" with back + ⋯.
- Type + area badges, title + underline.
- **Goal:** progress bar; tab row (Overview / Schedule / **Subtasks·12** / Activity, underline-style); "next on calendar" card; **subtasks list** (done/current/upcoming with checkboxes, "+ add subtask"); **✦ AI helper ribbon** (split / estimate / rewrite chips).
- **Task (overdue) variant:** **overdue banner** (Apr 7 passed · proposed today 5pm · accept slot) instead of progress; Subtasks tab shown **disabled** ("n/a"); identity fields (dur, priority bar, where).

---

## 07. AI integration

Two altitudes of AI: a high-level coach and a granular in-item helper.

### Web
- **High-level — AI coach (slide-over from anywhere, e.g. over Today):**
  - Faded dashboard behind; right slide-over panel ("✦ Plan with AI · session 4 min · ×").
  - **Multi-turn conversation:** AI question → **chip-pick** of focus areas (multi-select) → free-text replies → AI drafts.
  - **Drafted goals card:** N goals each with swatch, title, area, deadline, subtask count; per-goal edit / skip / **+ add**; accepted goals show "✓ added" + shadow. "add all N remaining" / "regenerate".
  - **Input bar** with suggestion chips ("add subtasks for hiring", "this is too much · trim", "set weekly rhythm").
- **Granular — AI subtask helper (inside an item):**
  - Lives in a goal that's "not ready · 0 subtasks" (e.g. an AI-drafted goal).
  - **✦ AI helper** box scoped to the goal: prompt field + quick chips (propose subtasks · estimate durations · split this subtask · rewrite as steps).
  - **Proposed subtasks** list: each with duration, deadline, accept individually / skip / **+ add**; "add all N remaining" / regenerate / "+ subtask manually".
  - Right rail: **Why these subtasks?**, **Constraints used** (area window, avg session length, user prefs), **Quick tweaks** (shorten timeline, add buffer week, merge spikes, add testing phase).

### Mobile
- **AI coach = bottom sheet / full-screen** ("✦ Plan with AI · session 4 min"): condensed chat bubbles, focus chips, **drafted goals** mini-cards (accepted ones flagged ✓), "add N remaining", input pill with ✦ + ↵.
- The granular helper appears as the **AI ribbon** inside mobile item detail (§06).

---

## 08. Life Areas editor

Manage the categories tree + per-area rules.

### Web
- **Header:** "Life Areas" + subtitle (categories · sub-areas · time windows · strict vs soft); reorder; **+ new area**.
- **Left — areas tree (300px):** top-level areas (icon, color, count) → sub-areas (◆ folders); "+ new top-level area"; **quick-start** starter set (pre-filled icon+color chips) for new users.
- **Right — editor for the selected area:**
  - **Header:** color/icon tile, name, "14 items · 3 sub-areas · strict window", delete area (red).
  - **Identity:** name field, **icon picker** (grid of emoji), **color picker** (swatch grid), **parent** (move under another area).
  - **Default location:** place ▾; items inherit it; travel auto-added.
  - **Strict mode:** toggle + explanation ("only Career items can be scheduled inside Career windows").
  - **Time windows:** 7-day × hourly grid; draw windows by dragging; windows can span days, multiple per area. Legend: **strict** (hatched) vs **soft** (tinted). "+ window".
  - **Sub-areas list:** name, default location (with ↑ inherit marker), item count, overflow; "+ add sub-area".

### Mobile
- **Full-screen** (`hideNav`) from More. MTop "Life Areas · 6 areas · tap to edit · +".
- **Accordion list of areas:** each row = color/icon tile, name, "N items · strict · 9–5 M-F · 📍 Office" summary, expand chevron.
- **Expanded area** shows: mini **time-windows preview** (7-day strip with hatched strict bands), **sub-areas** chips, actions (edit windows / + sub-area / 🗑).

---

## 09. Templates editor

Recurring weekly blocks that always sit on the calendar. Opened as an editing mode over Calendar.

### Web
- **Editing-mode banner** (ink): "editing templates · recurring weekly blocks · apply to every generated week · drag on grid to draw new"; cancel / **save · N changes**.
- **Left — "Your typical week" grid:** 7-day × hourly; colored template blocks (morning routine, standup, lunch, gym, family dinner, weekend brunch, wind down); selected block emphasized (thick border + shadow); "show area windows · off ▾".
- **Right rail:**
  - **Selected-template editor:** name ("Gym · Mon"), start, duration, **repeat** (M·W·F ▾), where (place ▾), color picker; duplicate / delete-all / **apply**.
  - **All templates list:** swatch + name + schedule summary + occurrence count (×5); "+ draw new template on grid".

### Mobile
- **Full-screen** (`hideNav`); ink "editing templates · save" bar.
- **Compact 7-day grid** with positioned blocks (selected = thick border + shadow).
- **"all templates · N" list:** swatch, name, schedule summary, occurrence count; "+ draw new on grid".

---

## 10. Places + travel matrix

Saved places, their default-area mappings, and travel times between every pair.

### Web
- **Header:** "Places · 6 of 10 saved"; **global transport picker** (🚗 driving / 🚆 transit / 🚲 bike / 🚶 walk); "↻ fetch missing", "refresh all", **+ add place**.
- **Left — places list (300px):** Google-Places autocomplete search; each place = 📍 name, "home" badge for primary, address, and **"default · {area}"** mapping tags; footer note: "up to 10 places · cascading delete removes travel-time entries".
- **Right — travel matrix:** from-row × to-column table; each cell shows **3 values** (rush in red / regular in ink / night in pencil); diagonal blanked; **missing** cells flagged red with "fetch ↻"; **custom** (user-overridden) cells tinted yellow + labeled. "clear all overrides".

### Mobile
- **Places = full-screen** (`hideNav`) from More: search pill; list of place cards (📍 name, home badge, address, default-area tags); "tap a place to see travel times →".
- **Travel matrix = per-place screen:** MTop = origin place; transport-mode segmented control; list of destinations, each a card with → name, **custom** badge, and a 3-cell mini-grid (rush / reg / night in minutes), or a "no travel times yet · fetch ↻" state.

---

## 11. Calendar event popovers

Click any calendar event → popover with type-appropriate actions. (On mobile, popovers become bottom sheets.)

### Web — three variants
- **Task event popover:** type + area badges; title; date/time/duration; place + "scheduled by engine"; primary actions **✓ complete / postpone**; secondary list (edit title, override location for this instance, reassign area, custom color, duplicate, open full editor, delete).
- **Template event popover:** template + area badges; title ("Gym"); recurrence ("Mon·Wed·Fri 6–7pm"); note that editing applies to **every** occurrence; **skip this / edit template ↗**; secondary (rename, recolor, assign location, delete all gyms).
- **Travel-warning popover** (red): "insufficient travel time"; route ("🚗 Office → Home"); allotted vs needed time; before/after events; fix actions (switch to transit, push next event, move prior event earlier, override location, "accept · I'll be late").
- Also documented anchored over the calendar (task popover open in context).

### Mobile
- **Event = bottom sheet** (over dimmed calendar): grab handle; task + area badges; title; date/time/place; **✓ complete / postpone**; secondary action list (edit title, override location, reassign area, duplicate, open full editor, delete).

---

## 12. Engine · advanced tuning

Power-user scheduler controls. Slide-over drawer from Calendar.

### Web
- **Drawer** ("⚙ Engine · advanced · ×") over a dimmed calendar.
- **basics:** buffer time (slider, min), travel events (toggle — render as own events), auto-regenerate (toggle — after every edit · slower).
- **strategy weights:** earliest-slot vs location-grouping sliders that sum to 100; current-bias readout.
- **location grouping · scoring:** numeric steppers — both sides match / one side match / one open·one match / neither match.
- **travel penalty:** penalty divisor (slider) + min-penalty minutes; formula shown (`score -= travelMinutes / divisor`).
- **debug:** debug dashboard toggle (scoring per slot), explain mode (hover event for reasoning); **debug readout** (last gen time/ms/horizon, placed N/N, failures, travel events, avg candidates, best score).
- **Actions:** reset to defaults (red) · cancel · **apply & regenerate**.

### Mobile
- Surfaced through **Scheduling settings** (§13 mobile) — buffer slider, default transport, behaviour toggles — with an **"Engine · advanced"** row pointing to the power-user surface. (No separate full drawer in the mobile gallery; advanced tuning is desktop-led.)

---

## 13. Settings

Account + scheduling + integrations.

### Web
- **Top bar:** "Settings"; signed-in identity badge; **sign out** (red).
- **Left sub-nav (240px):** Profile, **Account** (shown), Scheduling, Places & travel, Notifications, Integrations, Data & export, **Danger zone** (red).
- **Account content:**
  - **profile:** name field, role (USER, read-only).
  - **email:** current + ✓ verified + "change ↗"; note that change requires confirming a link sent to the new address.
  - **password:** old / new / confirm; note "OAuth-linked accounts skip this section"; cancel / update.
  - **two-factor:** toggle (Authenticator on), enrolled date + recovery codes remaining; regen codes / disable 2FA.
  - **linked sign-ins:** Google (linked), GitHub (connect) — unlink/connect actions.
  - **peek at Scheduling preferences** (buffer, transport, travel events, auto-regenerate) with "open Scheduling →".

### Mobile
- **More tab = settings hub:** profile card; list rows → Life Areas (§08), Places (§10), Templates (§09), Scheduling, Engine · advanced, Notifications, Integrations, Data & export; **sign out** (red).
- **Scheduling settings screen:** **buffer** slider (10m); **default transport** segmented control; **behaviour** toggles (render travel as events, auto-regenerate, show NOW line); **engine** row → advanced tuning.

---

## 14. Onboarding · first-run

### Web
- **Storyboard of 6 frames** (each a faux-device card with "step N of 6 · skip"):
  1. **Welcome** — brand, tagline, sign in / get started.
  2. **Pick life areas** — tappable area chips (✓ selected / + add), "+ custom", "N selected".
  3. **Add your places** — home / work address fields + default transport; skip allowed.
  4. **Sketch your week** — mini 7-day template grid (sleep / work blocks); "expand later in Calendar".
  5. **Plan with AI?** — offer card (what it does: asks about season, drafts goals, proposes subtasks, nothing added without ok); start session / no thanks.
  6. **Calendar · empty** — "You're all set ✦"; setup checklist (areas / place / templates ✓; capture / AI coach pending); "open Today →".
- Note: every step is skippable; user can resume via a setup checklist on Today.

### Mobile
- Same 6 beats as **full-screen steps** with a **progress segment bar** ("step N of 6"):
  - **Welcome** (large brand + tagline; get started / sign in).
  - **Pick areas** (area chips; "N selected"; continue / skip).
  - **Places** (home/work address; default transport; continue / skip).
  - **AI offer** ("✦ Plan with AI?"; what-it-does card; start session / no thanks).
  - **Empty Today** (set-up checklist + "tap + to capture").

---

## 15. Auth · all states

One shared centered-card layout; the card body switches per state.

### Web — 6 states (shown as a grid)
- **Sign in** — email, password, remember me, forgot?, sign in; divider; **social** (Google / GitHub); "create an account ↗".
- **Register** — name, email, password, confirm; create account; social; "sign in ↗".
- **Password reset · request** — email; send reset link; "if an account exists…" note; back to sign in.
- **Set new password** — new + confirm; live **password-rules checklist** (≥12 chars ✓ / ≥1 number ✓ / ≥1 symbol ○); update password.
- **2-factor prompt** — 6-digit code boxes; verify; "use a recovery code".
- **Error · expired link** — red ×; "link expired" (valid 30 min); send new link; back to sign in.

### Mobile
- **Sign in** documented as a full-screen mobile layout (brand + underline, email/password fields, remember me / forgot, sign in, divider, Google/GitHub, "create account ↗"). Other states follow the same single-card pattern adapted to full screen.

---

## 16. Bulk actions in Library

Multi-select rows + a floating contextual action bar.

### Web
- **Browse-all table** with a select-all checkbox header; selected rows tinted yellow.
- Columns: checkbox, title (select all), type, area, dur · dl, status (ready/overdue), overflow.
- **Floating bulk bar** (centered, ink, bottom): "N selected" + action buttons — reassign area, set location, set color, set priority, reschedule, mark done, duplicate, **🗑 delete** (red); "esc to clear".

### Mobile
- **Bulk-select mode** (`hideNav`): ink top bar "N selected · done"; rows with checkboxes (selected tinted yellow), compact metadata (area · dur · dl, over badge).
- **Floating bottom bar** (ink, red shadow) with icon+label actions: area, place, prio, redo (reschedule), **del** (red).

---

## 17. Global search palette

⌘/ command palette over any screen; keyboard-driven.

### Web
- **Centered palette** over a dimmed screen; input with live query (e.g. "plant") and cursor; "esc to close".
- **Results grouped:** items · N, life areas · N (with empty state "no matches"), places · N, actions · N. Each result = icon, name, sub-line (type · area · duration · timing); selected result has red left-border + ↵.
- **Footer:** "↑↓ navigate · ↵ open · ⌥↵ quick action" · "⌘/ · across items, areas, places".

### Mobile
- **Full-screen search** (`hideNav`): back chevron + search pill with query + cursor + clear (×); same grouped results (items / places / actions) as scrollable list.

---

## 18. Mind-map view

A fourth Library view-mode (alongside table / cards / tree) for big-picture thinking.

### Web
- **Header:** "Mind map · your life · clustered · drag to reorganize"; **view toggle** table / cards / tree / **map**; filter; zoom.
- **Canvas:** central **"you"** node (round, ink, red shadow); **area cluster nodes** around it (icon, name, colored shadow, branch count) each listing goal/task/plan branches; warning branches tinted red, emphasized branches highlighted.
- **Connecting lines** (dashed) from center to each cluster.
- Annotation: drag a task between areas to recategorize; zoom out for years.

### Mobile
- Not represented as a dedicated mobile screen in the gallery — mind-map is a **desktop-led** view-mode. (Mobile Library defaults to the areas tree.)

---

## 19. Engine · proposed actions

Engine messages expanded with concrete one-click fixes.

### Web
- **Header:** "Engine messages · click any message to see proposed fixes"; last-gen stats; ↻ regenerate.
- **Two-column grid of expanded messages**, each with tag (FAIL / LATE / TRAVEL / TRESPASS), title, body, and a **"proposed actions"** list. Primary action highlighted (thick border, "apply ↵"); each action has icon, label, and a sub-line explaining the effect. Examples:
  - **FAIL** ("couldn't place refactor billing, 6h block"): split into 2×3h · relax Career window to 9–6 · push deadline 1 week · show conflicts.
  - **LATE** ("plant basil 3 days late"): accept today 2pm · mark Home window soft · set new deadline.
  - **TRAVEL** ("insufficient travel Tue 12:30→1:00"): push next event 10m · switch to transit · move prior event earlier.
  - **TRESPASS** ("expenses in strict Health window"): find non-conflicting slot · reassign to Admin sub-area · relax Health window to soft.

### Mobile
- **Engine fix screen** (`hideNav`) reached from "see fixes →" on an engine message: red FAIL summary card, then a **"proposed actions"** list (primary highlighted with "apply"), each with icon, label, sub-line.

---

## 20. Subtasks board

A goal's Subtasks tab in board mode (inside item detail).

### Web
- **Breadcrumb** (Library › area › goal · goal badge · "subtasks tab").
- **Title + progress bar** ("7 of 12 · 58% · by May 25 · 4 weeks left").
- **Tabs** (Subtasks active) + **view toggle** list / **board** / timeline.
- **4-column board:** **Backlog → Up next → This week → Done.** Cards show checkbox, title, duration badge, deadline badge, and a red **📅 scheduled** badge when placed; the current item is highlighted; done cards struck through/dimmed; Done column has a muted background and "+N more"; non-Done columns have "+ add subtask".

### Mobile
- **Subtasks board (mobile)** (`hideNav`): MTop "Subtasks · 10k training plan · 12 items · board ▾"; **column-pill row** (Backlog·2 / Up next·3 / This wk·2 / Done·7); columns rendered as **stacked vertical sections** you swipe between; cards show checkbox, title, duration + 📅 scheduled badges; highlighted current card. "‹ swipe between columns ›" hint.

---

## 21. Mobile · responsive parallel (flow overview)

The same product, mobile-shaped, organized as **flows** — a parent screen on the left with derived screens cascading right (→). This section ties together the mobile specs listed above into navigable journeys.

- **Device frame:** sketchy phone bezel (380×800), notch, status row, home indicator. **Bottom tab nav** with raised **Capture** center button. Side panels → **sheets / full-screen**. Calendar defaults to **agenda**.

- **Row A · Auth + onboarding:** Welcome → Sign in → Onb pick areas → Onb places → Onb AI offer → Empty Today.
- **Row B · Daily flow (Today is home base):** Today → + Capture sheet → Triage card → ⌕ Search → ✦ AI coach.
- **Row C · Library + item detail:** Library (areas tree) → Item · goal → Subtasks board → Item · task (overdue) → Bulk select mode.
- **Row D · Calendar + engine:** Calendar (agenda) → Day grid → Event sheet → Engine messages → Fix · proposed actions.
- **Row E · Settings hub + admin:** More → Scheduling → Life Areas → Templates → Places → Travel matrix.

---

## Cross-cutting behaviors (apply throughout)

- **Inheritance chain:** item → sub-area → area supplies defaults for location (and thus travel) unless overridden at the item level.
- **Strict vs soft windows** govern what the engine may place where; trespass into a strict window is flagged, with fixes (reassign, relax to soft, find non-conflicting slot).
- **Travel time** is computed from the matrix using the active transport mode and time-of-day band, and (optionally) rendered as its own calendar events; insufficient travel is a warning with fixes.
- **Buffer time** is inserted between scheduled events.
- **Deadlines:** items scheduled past deadline are flagged **LATE**; items that cannot be placed before deadline surface as **overdue** with a proposed post-deadline slot to accept.
- **Capture-everywhere → triage → schedule** is the core loop; raw notes never auto-schedule until triaged.
- **AI is opt-in and non-destructive** — it proposes; nothing is added without explicit user acceptance.
- **Regeneration** re-runs the engine across the horizon; auto-regenerate is off by default (slower) and can be toggled on.
- **Keyboard-first on web** (⌘K capture, ⌘/ search, triage 1/2/3/x, ↵ confirm, j/k item nav); **touch-first on mobile** (bottom tabs, sheets, swipe between board columns).
