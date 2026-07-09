# Issues

- Onboarding should not split sleep items at midnight
- Still need to hard refresh for new locations to take effect
- Completing a split task still needs to move it to now if its future planned

- Ubiquitous input fields

# Mobile
- AI button in floating menu
- Hide floating menu when AI or WeekStructureModal opens
- Bottom padding for AI, currently can't reach the text box (for all pages really)
- Floating menu buttons more contrast
- 'More' shouldn't just route to settings

- Remove container padding and margins in mobile dashboard
- Ctrl K buttons visible?
- No hover buttons on calendar in mobile - one click for bottom sheet modal

- Area and color side by side in overview
- Completed at button and date box overlap
- How to rearrange items in subtask view?

- Engine console doesn't show
- Calendar header needs work

- Mobile app (Capacitor wrap)

# P5 — Medium features

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
- Add habits (repeating events with min/max size rendering within a given time frame)
- Add routines (tasks that are always bundled)
- Per-screen wireframe extraction under `notes/design-rehaul/Wireframes/`
