# Circadium — Onboarding plan (first-run flow)

Implementation plan for wireframe section 14 (Onboarding / first-run), adjusted to
exploit what is already built — chiefly the AI assistant, which can already edit
goals, weekly templates, and category windows. Written for implementation by a
follow-up session; file pointers are to the current codebase.

---

## 1. Design position — where this deviates from the wireframe and why

The wireframe storyboard is: Welcome → Pick areas → Add places → Sketch week →
AI offer → Empty calendar. Two adjustments:

**a) "Sketch your week" becomes a two-question form, not a grid.**
The wireframe shows a mini 7-day template grid. Building a draggable grid for
onboarding duplicates WeekStructureModal at lower fidelity, and a drag-grid is
the wrong tool for someone who doesn't know the product yet. Instead ask the two
questions that actually shape the slot fabric:

- "When do you usually sleep?" — two time pickers (default 23:00–07:00), applies
  every day. Mints 7 overnight sleep templates (or however the engine prefers
  sleep modeled — same shape WeekStructureModal produces).
- "Do you have regular working hours?" — optional; time range (default
  09:00–17:00) + weekday toggles (default Mon–Fri) + a location dropdown seeded
  from the Places step (work location if one was added).

This is the highest-leverage engine input (without sleep/work blocks the first
generated week looks absurd), it costs two rows of form controls, and the full
grid is one click away later ("refine anytime in Calendar → week structure").

**b) The AI session is the centerpiece, not an optional coda.**
The assistant already interviews, drafts goal trees, edits templates, and edits
category windows — exactly the "set up my week and my goals" conversation. The
AI-offer step should sell it as the recommended path ("we'll draft your first
goals together; nothing is added without your ok") and, on accept, land the user
on the dashboard with the assistant open in a seeded onboarding session. The
wizard steps before it stay deliberately thin data-entry: they give the AI
session (and the engine) real context — areas, places, sleep/work — so the first
conversation is grounded instead of starting from a blank forest.

Everything else follows the wireframe: every step skippable, resume via a setup
checklist on the dashboard, finish on an "all set" frame.

---

## 2. Flow spec

Route: `app/(protected)/onboarding/page.tsx` — a single client page owning a
step index (no sub-routes; refresh restarts at step 1, which is fine because
every step is idempotent and previously-saved data shows as already filled).
Rendered full-screen without the sidebar/tab chrome (see section 3c).

Chrome per step: progress segments ("step N of 5"), Back, Skip (top-right),
primary Continue. Centered card, `contentWidth.sm`-ish, plain paper surface —
this is pre-app, so keep it quieter than the glass-heavy in-app surfaces.

### Step 1 — Welcome
Brand mark + tagline ("a calendar that plans around your life — you say what
matters, we weave it through the week"). Single "Get started" button. No skip
on this one (skip = the global "Skip setup" which stamps completion and goes to
the dashboard; offer it as a small text link).

### Step 2 — Pick life areas
Starter chips with preset icon + color (from `vars.swatches`): Career, Health,
Relationships, Finance, Growth, Home, Creative, Family — plus "+ custom" (name
field, auto-assigned color/icon, editable later). Multi-select, "N selected"
caption, "sub-areas can be added later".

Write: build Category objects client-side (uuid, name, icon, color, sortOrder
by selection order, `useTimeWindows: false`, `isStrict: false`) and commit via
the Redux path — categories ride the diff sync (`calendarSourceSlice` +
category sync-handler), so `updateAll` with the categories payload is the
already-tested write path. Do NOT use `createCategory` direct actions here;
mixing direct writes with the diff layer mid-onboarding invites phantom diffs.

### Step 3 — Add your places
Two labeled slots — Home and Work — each a Google Places autocomplete (reuse
the search components under `app/(protected)/locations/_components/`, backed by
`searchPlaces`/`createSessionToken`/`createLocation` in `actions/locations.ts`).
Below: default transport mode segmented control (`updateDefaultTransportMode`).
"Skip for now" prominent — Places needs a Google round-trip and some users have
no fixed places.

Write: `createLocation` per confirmed slot (direct action, same as the
Locations page — locations are NOT part of the diff sync). After the second
location lands, fire the missing-travel-times fetch (`fetchMissingTravelTimes`
→ refresh flow, mirroring whatever the Locations page does on add) so travel is
warm before the first regen. Keep Redux `schedulingSettingsSlice` in step with
how the Locations page does it (it maintains `locations`/`allTravelTimes`
there) — copy that page's post-create handling rather than inventing new
plumbing.

If Work was added, remember its location id in wizard state for step 4's work
template and optionally offer "make this the default location for Career?"
(only if a Career-ish area was picked in step 2 — nice-to-have, cut if fiddly).

### Step 4 — Sketch your week
The two-question form from section 1a. Preview line under the form: "This adds
N weekly blocks — refine anytime in Calendar."

Write: mint EventTemplate objects client-side (uuid ids — WeekStructureModal
already set the client-minted-uuid precedent) and commit via
`updateTemplateArray`/`updateAll`. This triggers one engine regen + sync, which
is correct: the user's next screen can show a real (if sparse) week.

### Step 5 — Plan with AI?
Offer card, wireframe copy is right: "asks about your season · drafts goals
across your areas · proposes subtasks per goal · nothing is added without your
ok". Two actions:

- "Start session" — stamp onboarding complete, `router.push("/dashboard")`,
  then `openAssistant({ intent: "onboarding" })` (see section 4).
- "No thanks, I'll add my own" — stamp complete, go to dashboard.

There is no separate "empty calendar / you're all set" wizard frame: the
dashboard's setup checklist card (section 5) IS that frame, and it persists,
which the wireframe itself notes ("user can come back via setup checklist on
Today").

---

## 3. Architecture

### a) First-run detection — `User.onboardedAt DateTime?`
New nullable column on User (`prisma/schemas/models/user.prisma`), migration
`add_user_onboarded_at`. Deriving first-run from data emptiness is fragile
(seeded users, users who skipped everything) and a timestamp beats a boolean
(free analytics, and "null = show onboarding" stays one predicate).

Server surface: a small `actions/onboarding.ts` with
`completeOnboarding()` (stamps `onboardedAt = now()`, session-scoped) and the
read used by the redirect. Also stamp existing users in the migration? No —
backfill `onboardedAt = createdAt`-ish is impossible (no createdAt on User);
instead have the redirect predicate be `onboardedAt === null AND the user has
no categories` for the first deploy, or simpler: run a one-off SQL backfill in
the migration setting `onboarded_at = now()` for all existing rows. Recommend
the migration backfill — it is one UPDATE and keeps the runtime predicate
clean.

### b) Redirect wiring
Do NOT touch `middleware.ts` (edge-safe, no DB). Instead:

- `app/(protected)/dashboard/page.tsx` (or a tiny server wrapper above it):
  read `onboardedAt` for the session user; if null, `redirect("/onboarding")`.
  Since `DEFAULT_LOGIN_REDIRECT` is `/dashboard`, every fresh login funnels
  through this check. Users who deep-link elsewhere just see the app — the
  checklist card covers resume, and that is fine.
- `/onboarding` itself: if `onboardedAt` is already set, redirect to
  `/dashboard` (no re-entry; re-running setup is what the individual surfaces
  are for).

### c) Nav-less rendering
Onboarding must render without Sidebar/MobileTabs but INSIDE the providers
(StoreProvider/UserProvider/CalendarProvider) because steps 2 and 4 write
through Redux + diff sync. Options, in preference order:

1. AppShell gains a `chromeless` (or `hideNav`) mode — the wireframes already
   name `hideNav` as a recurring mobile pattern (triage, detail, capture), so
   this prop will be needed again; onboarding is the first consumer. Render
   bezel + canvas, skip Sidebar/MobileTabs/assistant slot.
2. A route-group split — `(protected)/(shell)/...` vs
   `(protected)/(bare)/onboarding` — where the bare layout wires providers but
   not AppShell. More file churn; only pick this if AppShell resists a mode.

Detect the route (or accept a prop from the page) — implementation detail, but
option 1 is the strategic one.

One data caveat: CalendarProvider's cold-load autoregen fires when categories/
locations exist with no engine output. Onboarding creates exactly that state
mid-flow. That is harmless (regen of an empty planner is cheap) but verify the
one-time guard doesn't mis-fire repeatedly while the wizard adds rows.

---

## 4. AI session wiring (`intent`)

`AssistantScope.intent` already exists and is documented as reserved for
onboarding — currently nothing consumes it. Wiring:

1. `GlobalAssistant.tsx` passes `scope?.intent` down (it already forwards
   `focusItemId` / `initialPrompt`).
2. `useAIDraftState` / `streamDraft` include `intent` in the POST body to
   `/api/draft/stream`.
3. The route, when `intent === "onboarding"`, appends a system-prompt block:
   the user just finished first-run setup; interview them briefly about the
   current season of their life (one or two questions at a time, not a form);
   then draft 2–4 goals across their areas with realistic subtasks and
   durations; propose category time windows only if the conversation
   surfaces natural rhythms; keep it short — this is their first contact with
   the product.
4. Kickoff: the assistant should speak first. Simplest mechanism that fits the
   existing message model: when the modal opens with the onboarding intent and
   the conversation is empty, auto-send a canned user message ("I just set up
   my areas and week — help me plan my first goals."). It is honest, visible
   in history, and requires zero changes to the turn loop. A hidden/synthetic
   first turn is nicer but touches the persistence contract — not worth it now.
5. The onboarding conversation persists like any other (DraftConversation), so
   abandoning mid-session and resuming from the checklist works for free.

Note `intent` must NOT change any tool/apply semantics — prompt preamble only.
All the guardrails (fetch-before-modify, draft id minting, Save-time apply)
stay identical.

---

## 5. Setup checklist card on the dashboard

A dismissible card at the top of `/dashboard` (new component under
`app/(protected)/dashboard/_components/SetupChecklist/`), shown when
`onboardedAt` is recent (say < 14 days) AND not all items are done, or until
explicitly dismissed (localStorage flag is fine; don't add a DB column for
this).

Items, each derived from live Redux state (no new fetches) and deep-linking:

| Item | Done when | Link target |
| --- | --- | --- |
| Pick your life areas | categories.length > 0 | /categories |
| Add a place | schedulingSettings.locations.length > 0 | /locations |
| Sketch your week | template.length > 0 | /calendar (open WeekStructureModal — add a query param or context trigger if none exists yet) |
| Capture your first item | any planner row exists | open CapturePalette via CaptureContext |
| Plan with AI (optional) | any DraftConversation exists (cheap: expose a `hasDraftConversations` boolean — or just mark done once clicked, localStorage) | openAssistant({ intent: "onboarding" }) |

Keep the "done" predicates dumb and local; this card is a nudge, not a source
of truth.

---

## 6. Implementation order (each step leaves the app working)

1. **Schema + actions** — `onboardedAt` column, migration with backfill for
   existing users, `actions/onboarding.ts` (`completeOnboarding`,
   `getOnboardingStatus`), type re-export touch-ups if any.
2. **Route + redirect + chromeless shell** — `/onboarding` page shell with
   step chrome (progress, back/skip/continue) and the two redirects (section
   3b); AppShell `chromeless` mode. Ship with placeholder step bodies.
3. **Step 2: areas** — starter chip data (name/icon/color presets), commit via
   Redux categories path.
4. **Step 3: places** — reuse Locations autocomplete + create/transport
   actions, travel-time warmup, Redux settings-slice bookkeeping mirrored from
   the Locations page.
5. **Step 4: week form** — sleep + work questions → template minting →
   `updateAll`.
6. **Step 5 + AI intent** — offer card; `intent` plumbing through
   GlobalAssistant → useAIDraftState → streamDraft → route prompt block +
   empty-conversation kickoff.
7. **Setup checklist card** on the dashboard + the WeekStructureModal
   deep-link trigger.
8. **Tests** — unit-test the template-minting helper (sleep overnight shape,
   weekday mapping, work-location stamping) and the starter-category builder;
   the AI intent block gets a route-level test only if the draft route already
   has one to extend (don't build new harness for a prompt string).

Steps 3–5 are independent of each other once 2 lands; 6 and 7 are independent
of everything except 1–2.

---

## 7. Risks / open questions

- **Sleep templates shape**: confirm how WeekStructureModal models overnight
  blocks (one overnight template per day vs split at midnight) and mint the
  same shape — the engine and the modal must both render them correctly.
- **Diff-sync timing during the wizard**: each step's `updateAll` triggers
  regen + sync. With near-empty data this is fast, but make sure step
  transitions don't race the 300ms sync debounce in a way that drops a write
  (they shouldn't — Redux state is the source and sync diffs from it — but
  verify with two quick consecutive steps).
- **OAuth first login**: Google/GitHub sign-ups also land on /dashboard, so
  they funnel through the same redirect — no extra work, just confirm.
- **Mobile**: the wizard card is simple enough to be responsive with plain
  stacking; the wireframe's dedicated full-screen mobile variants need no
  separate build. Verify the Places autocomplete popover behaves in the
  mobile viewport.
- **Copy**: wireframe copy is hand-drawn-era; final copy should match the
  current brand voice. Placeholder copy above is directional.
- **Seed user**: the migration backfill stamps the seeded admin as onboarded —
  confirm the seed doesn't need its own stamp for fresh `db:reset:dev` runs
  (it will, since the backfill only runs once historically; add
  `onboardedAt: new Date()` to `prisma/seed.ts`).
