# Emergent issues
- Library layout and filter functionality on mobile
- All bottom sheet modals using the same closing animation as calendar engine (all bottom sheets using the same component really)
- Give bottomsheet modal proper bottom padding
- Display 3 days at a time in WeekStructureModal like in calendar?
- Locations view bottom and top padding for mobile and general layout and functionality?
- "Just this occurence" modals being tailored for mobile as well

- Changing a root goal to task sometimes crashes the engine because the duration is 0
- Add a link icon to linked subtasks

# P5 — Medium features

- Add inter-goal dependencies (with cycle detection)
- Allow a goal to be added/linked to another goal as a subtask

- File-view: displays categories + sub-categories + items together
- Mind-map style: items as organized under their roles and sub-categories
- Directional Graph: All the goals and their directions, dependencies and connections

- Custom Claude API key
- Mobile app (Capacitor wrap)

- Connect to Google Calendar and iCalendar
- Habits - dynamic items that schedule every week (repeating events with min/max size rendering within a given time frame)
- Allow moving/pinning of dynamic objects (temporarily acting like a plan)
- Multiple templates of different time spans (3 days, 2 weeks etc)
- Categorization of goals (tags) — may be redundant with categories; revisit

# Future / deferred

- OSRM instead of Google Distance API — "self-host" means running their routing server yourself (hosting cost + setup but no per-request fee). No public-transport support in OSRM proper; would need GTFS data or a separate service.
- Customize themes (per-user style — architectural seam exists, no User schema column yet)
- Multi-plan: option to create several life plans
- Undo/redo (smart to implement before optimistic DB updates on item edits)
- Add routines (tasks that are always bundled)
- Per-screen wireframe extraction under `notes/design-rehaul/Wireframes/`
