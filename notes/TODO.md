# Emergent issues
- Display 3 days at a time in WeekStructureModal like in calendar?
- "Just this occurence" modals being tailored for mobile as well

- Modals too dark with new dark mode

- Progressive 'readying' of subtasks
- Subtasks that are just notes (ignore-in-engine boolean)
- Notes INSIDE items

- Default Min split value 60 minutes
- Split task Max size value 0 = 'infinite'
- Subtask earliest date option
- Clicking subtask in calendar opens root-item/subtasks/sub-item in router, not directly to root item
- Subtask item  row height too tall.

- 'Schedule X hours per week of this until.." - feature.

- AI modal should cover the whole screen (gets messy with route changes)
- Category color picker should match other color pickers
- Warning when time restraints + category windows results in 0 possible time slots for a given item
- Singular tasks or split tasks not showing in graph view
- Light/dark mode hotkey

- Queue title size is too small (should match other title items of similar style)

- NEXT info badge in dashboard should have "starts in X minutes" right after it

- Mobile landscape bottomsheet styles need looking at. Often way too wide with tonnes of scrolling

- Add a back to previous route button in item view not just back to library (of you arrive from somewhere else)


- Saving mindmap and graph visual states in db (probably needs a reset button)

- Hour duration in addition to minutes in 'new task' modal

- Double check how goal locations currently cascade. I'm getting "apply location to all subgoals" when changing root goal location, which shouldn't be needed if the subtask inherits it

- Add full-day-items like "birthday"

- Weird dragged event jumping in WeekStructureModal when placing one item on another where it isn't allowed

# P5 — Medium features

- Mobile app (Capacitor wrap)

- Connect to Google Calendar and iCalendar
- Habits - dynamic items that schedule every week (repeating events with min/max size rendering within a given time frame)
- Allow moving/pinning of dynamic objects (temporarily acting like a plan)

# Future / deferred

- Undo/redo (smart to implement before optimistic DB updates on item edits)
- Add routines (tasks that are always bundled)

- Capture INSIDE a goal? ("Unprocessed subtask"?)
- Sorting captured items in folders? Or pre-assign to categories

- OSRM instead of Google Distance API — "self-host" means running their routing server yourself (hosting cost + setup but no per-request fee). No public-transport support in OSRM proper; would need GTFS data or a separate service.
- Customize themes (per-user style — architectural seam exists, no User schema column yet)
- Categorization of goals (tags) — may be redundant with categories; revisit
- Multiple templates of different time spans (3 days, 2 weeks etc)
- Multi-plan: option to create several life plans
- Per-screen wireframe extraction under `notes/design-rehaul/Wireframes/`
