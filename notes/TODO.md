# P2 — Wire-up debt (known stubs)

- Dashboard setup (replace mocks in `_mock/dashboard.ts`)
- Wire up Schedule and Activity tabs in item detail view
- Option to archive completed goals/items so they don't clutter the interface

# P3 — Small features

- Button for duplicating subtasks in subtask view
- Set location for template events in WeekPlanModal
- More/different color options for template events in WeekPlanModal
- Rename WeekPlanModal and its buttons — "Week Structure"? "Week Template"?
- Bulk-actions floating bar in Library

# P4 — Refactors / investigations

- Token consolidation into sprinkles (color/space/radii)
- Tokens for contentWidth (sm, md, lg etc) for layouts
- Server-side overlap validation for CategoryTimeWindow
- Plumb `TravelTime.transportMode` through the scheduling engine
- Add console error messaging
- Option to remove your own account + data
- Item-detail AIHelper + EngineNotes side cards still using mocks (deferred while AI coach is shelved)

# P5 — Medium features

- File-view / mind-map style: displays categories + sub-categories + items together
- Onboarding flow (6-step)
- Change date picker / date picker styles
- Add RRule exceptions to plans, templates, categories
- Add habits (repeating events with min/max size rendering within a given time frame)
- Add routines (tasks that are always bundled)
- Splitting large tasks into smaller chunks when generating calendar (important for cases like 20 × 30-min "reading" — currently painful)
- Notice when an item is too large to fit within the template (alerts list)
- Maximum time of a goal per day
- Allow moving/pinning of dynamic objects (temporarily acting like a plan)
- Multiple templates of different time spans (3 days, 2 weeks etc)
- Add inter-goal dependencies (with cycle detection)
- Categorization of goals (tags) — may be redundant with categories; revisit

# Future / deferred

- AI coach (shelved — JSON-action pipeline + BYOK + slide-over)
- OSRM instead of Google Distance API — "self-host" means running their routing server yourself (hosting cost + setup but no per-request fee). No public-transport support in OSRM proper; would need GTFS data or a separate service.
- Customize themes (per-user style — architectural seam exists, no User schema column yet)
- Multi-plan: option to create several life plans
- Connect to Google Calendar and iCalendar
- Change week start day in settings
- Undo/redo (smart to implement before optimistic DB updates on item edits)
- Mobile app (Capacitor wrap)
- Per-screen wireframe extraction under `notes/design-rehaul/Wireframes/`
