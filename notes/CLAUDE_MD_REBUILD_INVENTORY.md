# Inventory for rebuilding CLAUDE.md from scratch

**Audience:** an agent that will write a brand-new `CLAUDE.md` for this repo. The existing one is stale (Tailwind has been removed, routes were restructured, dependency versions are wrong, several directories are mis-described). Treat the current `CLAUDE.md` as **untrusted** — derive everything from the files below, not from the old doc.

**Scope split.** Calendar generation has its own deep-dive doc that also needs rewriting; a separate inventory covers it. **Don't try to re-document the engine here** — keep this CLAUDE.md focused on the rest of the app and treat the engine as a black box with a one-paragraph summary + a link.

- [DEEP_DIVE_REBUILD_INVENTORY.md](./DEEP_DIVE_REBUILD_INVENTORY.md) → drives a new `documentation/calendar-generation-deep-dive.md` (engine internals). **Do that one first.**
- This file → drives a new `CLAUDE.md` (rest of app + brief engine pointer). Once the deep-dive is rewritten, the engine summary in CLAUDE.md is just a compression of that doc, not of the old stale one.

**Order of operations.** Wait for the rewritten `documentation/calendar-generation-deep-dive.md` to exist before starting on CLAUDE.md. The engine summary section below assumes you can read the new deep-dive as ground truth and compress from it.

## How to use this list

Read these files/directories in roughly this order. Skim — you're building a high-level map, not learning every detail. When you find something that contradicts the existing CLAUDE.md, trust what's on disk.

When you're done, replace `CLAUDE.md` at the repo root. Honour the rules currently written under "Code Style Rules" in the old file (no emojis, no pointless comments, no summary/changelog files, absolute imports with `@/`, prefer server actions, Zod validation) — those still apply.

---

## 1. Project manifest & tooling (ground truth for stack/versions)

- [package.json](../package.json) — exact dependency versions, scripts (note: `pnpm`, not npm). Check Next/React/TypeScript/Prisma versions and the `@vanilla-extract/*` family.
- [tsconfig.json](../tsconfig.json) — path aliases (`@/` prefix).
- [next.config.mjs](../next.config.mjs) — note the vanilla-extract plugin wiring.
- [eslint.config.mjs](../eslint.config.mjs)
- [middleware.ts](../middleware.ts) — auth route protection.
- [auth.ts](../auth.ts), [auth.config.ts](../auth.config.ts), [next-auth.d.ts](../next-auth.d.ts) — NextAuth v5 setup.
- [routes.ts](../routes.ts) — public/protected route definitions.
- [docker-compose.dev.yml](../docker-compose.dev.yml) — local Postgres for dev (port 5433).
- [prisma.config.ts](../prisma.config.ts)
- [jest.config.ts](../jest.config.ts), [jest.setup.ts](../jest.setup.ts)
- [components.json](../components.json) — shadcn config.

## 2. Database schema (single source of truth for models)

- [prisma/schemas/schema.prisma](../prisma/schemas/schema.prisma)
- [prisma/schemas/models/user.prisma](../prisma/schemas/models/user.prisma)
- [prisma/schemas/models/calendar.prisma](../prisma/schemas/models/calendar.prisma)
- [prisma/schemas/models/category.prisma](../prisma/schemas/models/category.prisma)
- [prisma/schemas/models/location.prisma](../prisma/schemas/models/location.prisma)
- [prisma/schemas/models/scheduling.prisma](../prisma/schemas/models/scheduling.prisma)
- [prisma/migrations/](../prisma/migrations/) — list the directories to see migration history (e.g., `add_data_version`, `add_category_event`, `add_travel_event` — meaningful schema evolution).
- [prisma/seed.ts](../prisma/seed.ts) and [prisma/seed-helpers/](../prisma/seed-helpers/) — explains the A/B/C/D location convention used in seed data.

## 3. App routes (Next.js App Router structure)

List the directory first, then open the `page.tsx` of each route to learn its purpose:

- [app/layout.tsx](../app/layout.tsx), [app/page.tsx](../app/page.tsx), [app/globals.css](../app/globals.css), [app/page.css.ts](../app/page.css.ts) — root layout + landing.
- [app/(protected)/layout.tsx](../app/(protected)/layout.tsx) — protected shell.
- [app/(protected)/calendar/](../app/(protected)/calendar/) — main calendar view.
- [app/(protected)/capture/](../app/(protected)/capture/) — quick-entry surface (was probably "create" in the old doc).
- [app/(protected)/library/](../app/(protected)/library/) — task/goal library browser.
- [app/(protected)/items/[id]/](../app/(protected)/items/) — item detail/edit (was probably "refine" in the old doc).
- [app/(protected)/dashboard/](../app/(protected)/dashboard/)
- [app/(protected)/categories/](../app/(protected)/categories/)
- [app/(protected)/locations/](../app/(protected)/locations/)
- [app/(protected)/settings/](../app/(protected)/settings/)
- [app/auth/](../app/auth/) — auth pages.
- [app/api/](../app/api/) — confirm only `admin/` and `auth/` exist (server actions are the norm).
- [app/test-shell/](../app/test-shell/), [app/test-tokens/](../app/test-tokens/) — dev scaffolding; mention briefly or omit.

## 4. Server actions (the primary backend surface)

- [actions/](../actions/) — list the directory.
- [actions/calendar-actions/](../actions/calendar-actions/) — has subfolder `sync-handlers/`, examine both.
- Read a couple of action files (e.g., [actions/scheduling.ts](../actions/scheduling.ts), [actions/locations.ts](../actions/locations.ts)) to learn the `"use server"` + `auth()` + `db.*` pattern.

## 5. Calendar generation engine (compress from the new deep-dive, don't re-document)

The engine has a dedicated deep-dive at [documentation/calendar-generation-deep-dive.md](../documentation/calendar-generation-deep-dive.md). By the time you reach this step, that doc has just been rewritten (see [DEEP_DIVE_REBUILD_INVENTORY.md](./DEEP_DIVE_REBUILD_INVENTORY.md)) — **read it now** and treat it as ground truth.

CLAUDE.md should contain **only a short summary section** (~10–20 lines) distilled from the deep-dive, covering at most:

- One sentence on what the engine does (takes planners/templates/categories/existing calendar → produces a `SimpleEvent[]` schedule).
- One sentence on architecture style: orchestrator + strategy-based scoring + incremental horizon expansion. Core classes (`CalendarGenerator`, `TimeSlotManager`, `Scheduler`, `TravelManager`) live in `utils/calendar-generation/core/`; each delegates phase logic to function modules under `utils/calendar-generation/helpers/<Name>/`.
- The public entry: [utils/calendar-generation/calendarGeneration.ts](../utils/calendar-generation/calendarGeneration.ts) and [utils/calendar-generation/index.ts](../utils/calendar-generation/index.ts).
- Tunable config: [utils/calendar-generation/constants.ts](../utils/calendar-generation/constants.ts) (`SCHEDULING_CONFIG`).
- Link out to the deep-dive for everything else.

**Do NOT** copy the long "Scheduling System" / "Strategy Interface" / "Buffer & Travel Placement" / "Capacity-Aware TOO_LARGE Check" sections from the old CLAUDE.md. Those belong in the deep-dive — duplicating them across both docs is what made CLAUDE.md drift in the first place. If you find yourself writing more than ~20 lines about the engine here, move it into the deep-dive instead.

## 6. State management

- [context/CalendarProvider.tsx](../context/CalendarProvider.tsx) — main data context.
- [context/StoreProvider.tsx](../context/StoreProvider.tsx) — Redux store wrapper.
- [context/UserProvider.tsx](../context/UserProvider.tsx)
- [redux/store.ts](../redux/store.ts)
- [redux/slices/](../redux/slices/) — `calendarSlice`, `schedulingSettingsSlice`, `userSlice`.
- [redux/thunks/calendarThunks.ts](../redux/thunks/calendarThunks.ts) — was missing from the old doc.

## 7. Styling system (BIG change — formerly Tailwind, now Vanilla Extract)

Recent commits explicitly removed Tailwind. The new system uses `@vanilla-extract/*`. Every page/component has a co-located `*.css.ts` file. Check:

- [lib/theme/](../lib/theme/) — design tokens, sprinkles, recipes, themes, transitions, typography. The whole theme system lives here.
- [lib/theme/index.ts](../lib/theme/index.ts)
- [lib/theme/tokens.css.ts](../lib/theme/tokens.css.ts), [lib/theme/sprinkles.css.ts](../lib/theme/sprinkles.css.ts), [lib/theme/recipes.css.ts](../lib/theme/recipes.css.ts)
- [lib/theme/themes.css.ts](../lib/theme/themes.css.ts) — light/dark themes.
- [lib/theme/categoryColor.ts](../lib/theme/categoryColor.ts)
- [lib/tokens.ts](../lib/tokens.ts) — verify what this is vs theme tokens.
- Spot-check any `app/(protected)/*/page.css.ts` to see the `*.css.ts` co-location pattern.

## 8. Components

- [components/](../components/) — list top level. Subdirs are: `auth/`, `calendar/`, `draggable/`, `events/`, `landing/`, `tasks/`, `ui/`.
- [components/ui/](../components/ui/) — design-system primitives (note: many are custom — `Button.tsx`, `CategoryBadge.tsx`, `Glass.tsx`, `Masthead/`, `SegmentedControl/`, etc., NOT pure shadcn).
- [components/ui/index.ts](../components/ui/index.ts) — barrel export.
- [components/ui/shell/](../components/ui/shell/) — `AppShell/`, `CapturePalette/`, `SearchPalette/`, `Sidebar/`, `MobileTabs/`, `CaptureContext.tsx`, `SearchContext.tsx`, `nav.ts`. This is the modern shell architecture and didn't exist in the old doc.
- [components/events/](../components/events/) — calendar event renderers + popovers, including `CategoryWrapperEvent.tsx`, `TravelEventContent.tsx`, etc.
- [components/tasks/](../components/tasks/) — `TaskItem`, `TaskList`, `task-item-subcomponents/`.
- [components/landing/VectorField/](../components/landing/VectorField/) — landing-page visual.

## 9. Types

- [types/](../types/) — list and read each `.d.ts` briefly:
  - [types/calendarTypes.d.ts](../types/calendarTypes.d.ts), [types/categoryTypes.d.ts](../types/categoryTypes.d.ts), [types/models.d.ts](../types/models.d.ts), [types/ui.d.ts](../types/ui.d.ts), [types/user.d.ts](../types/user.d.ts), [types/userTypes.d.ts](../types/userTypes.d.ts), [types/css.d.ts](../types/css.d.ts).
  - [types/prisma.ts](../types/prisma.ts) — note this is `.ts`, not `.d.ts` (old doc says `.d.ts`).

## 10. Hooks

- [hooks/](../hooks/) — list. Notable: `useCalendarServerSync`, `useCalendarStateActions`, `useFetchCalendarData`, `useKeyboardShortcuts`, `useManuallyRefreshCalendar`, `usePlatform`, etc.

## 11. Utilities (outside calendar-generation)

- [utils/](../utils/) — list top level. Modular subdirs worth naming: `assert/`, `calendar-rendering/`, `category-constraints/` (NB: see `notes/`/memory — `CategoryConstraint` is vestigial), `datetime/`, `goal-handlers/`, `locations/`, `server-handlers/`, `template-handlers/`, `types/`.
- [lib/](../lib/) — `auth.ts`, `db.ts`, `google-maps-api.ts`, `mail.ts`, `tokens.ts`, `theme/`.

## 12. Validation schemas

- [schemas/index.ts](../schemas/index.ts) — Zod schemas.

## 13. Tests

- [__tests__/](../__tests__/) — list to gauge coverage areas.
- [jest.config.ts](../jest.config.ts).

## 14. Existing docs & notes

- [README.md](../README.md) — check for anything the old CLAUDE.md missed.
- [documentation/calendar-generation-deep-dive.md](../documentation/calendar-generation-deep-dive.md) — reference, don't duplicate.
- [notes/](../notes/) — personal notes/TODOs, NOT documentation. Glance for context (especially anything referencing in-flight refactors), but don't quote.

## 15. Git context (recent direction of the codebase)

Run `git log --oneline -30` and `git log --oneline --all -20`. Recent commits like "Removed temp contentWidth token system", "Fixed style issues caused by tailwind removal", "Disabled text select throughout project", "Final polish on travel and category events to backend" tell you what's actively shifting. Glance at the active branch (`fix/varied-fixes`) too.

---

## Things known to be wrong in the existing CLAUDE.md (sanity-check list)

Don't copy these from the old doc — verify each against the files above:

- **Stack section claims Tailwind CSS.** Tailwind has been removed; the project uses Vanilla Extract (`*.css.ts` files, `lib/theme/`).
- **TypeScript version listed as 5.5.** It's 6.0.3 in package.json.
- **Prisma version not pinned.** It's 7.x (note: Prisma 7 has API differences from 5/6).
- **Routes listed as `create/`, `refine/`, `settings/scheduling/`.** Real routes: `calendar/`, `capture/`, `categories/`, `dashboard/`, `items/[id]/`, `library/`, `locations/`, `settings/`.
- **Components subdirs listed as `categories/`, `interface/`, `locations/`, `scheduling/`, `utilities/`.** None of those exist. Real subdirs: `auth/`, `calendar/`, `draggable/`, `events/`, `landing/`, `tasks/`, `ui/` (with `ui/shell/` containing the AppShell architecture).
- **`types/prisma.d.ts` listed.** File is `types/prisma.ts`.
- **No mention of `prisma/migrations/`.** Migrations are in use.
- **No mention of `docker-compose.dev.yml`** or the `db:start` / `db:reset:dev` scripts.
- **No mention of `redux/thunks/`** or the `calendarSlice` / `userSlice` (only `schedulingSettingsSlice` is listed).
- **Database Commands section uses `prisma db push`.** Project uses migrations (`prisma migrate dev` / `migrate deploy`).
- **`lib/` listing is incomplete** — missing `theme/`, `tokens.ts`, `mail.ts`, `taskItem.d.ts`.

The calendar-generation section of the old CLAUDE.md (Core Concepts → Scheduling System onwards) appears to still be substantially accurate — verify against `utils/calendar-generation/` and the deep-dive doc, but you can largely carry it forward.
