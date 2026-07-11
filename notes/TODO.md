# Mobile
- Calendar should take up whole screen in Calendar on mobile. (With some bottom padding to account for the floating menu)
- Calendar engine should open as a modal
- Calendar header needs restructuring (col not row-ish)

- Main floating menu items need to be static, currently jump up when selected
due to underline
- Main menu capture button should lead to capture page, not quick capture modal

- Bottom sheet modal animates up, but not down. Just disappears when closed.

- Library header needs horizontal padding in mobile

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
