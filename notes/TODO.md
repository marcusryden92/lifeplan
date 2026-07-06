# P5 — Medium features



- Change week start day in settings
- Change date picker / date picker styles

- Add RRule exceptions to plans, templates, categories
- Splitting large tasks into smaller chunks when generating calendar (important for cases like 20 × 30-min "reading" — currently painful)
- Maximum time of a goal per day
- Allowed days/time spans in any day for goals
- Habits - dynamic items that schedule every week
- Allow moving/pinning of dynamic objects (temporarily acting like a plan)

- Custom Claude API key

- Add inter-goal dependencies (with cycle detection)
- File-view / mind-map style: displays categories + sub-categories + items together
- Multiple templates of different time spans (3 days, 2 weeks etc)
- Categorization of goals (tags) — may be redundant with categories; revisit

# Future / deferred

- OSRM instead of Google Distance API — "self-host" means running their routing server yourself (hosting cost + setup but no per-request fee). No public-transport support in OSRM proper; would need GTFS data or a separate service.
- Customize themes (per-user style — architectural seam exists, no User schema column yet)
- Multi-plan: option to create several life plans
- Connect to Google Calendar and iCalendar
- Undo/redo (smart to implement before optimistic DB updates on item edits)
- Mobile app (Capacitor wrap)
- Add habits (repeating events with min/max size rendering within a given time frame)
- Add routines (tasks that are always bundled)
- Per-screen wireframe extraction under `notes/design-rehaul/Wireframes/`
