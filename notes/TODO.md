
# P1 — Quick UX wins

- Text selection possible throughout the project — should be disabled (except for text boxes)
- Dashboard capture button not using system-specific key (ie ctrl)
- Hovering calendar events and displaying hover buttons shouldn't hide timestamp
- Plus sign for adding subtask way too small
- Up/Down arrow keys in Capture view currently navigates left menu (nice). Left/Right should navigate the task/plan/goal/trash buttons. Enter to save
- Goals in capture menu that have been saved don't disappear from the list
- Filter/Week buttons in calendar header do nothing
- "Place selected" notice in modals shouldn't cause the modal to expand vertically — needs to reserve its space

# P2 — Wire-up debt (known stubs)

- Dashboard setup (replace mocks in `_mock/dashboard.ts`)
- Wire up Schedule and Activity tabs in item detail view
- Calendar engine console drawer still using mocks (`_mock/calendar.ts`)
- Filter for completed/not completed in library
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
