- Complete theme migration

- Refactoring of stupid new code

- Double check usage of spacing and theme tokens throughout the project
- Not multiple css.ts files in the same folder

- Text selection possible throughout the project - should be disabled

- Add console error messaging
- Calendar items not loading properly on initial load
- Add RRule exceptions to plans, templates, categories
- Landing page.

# House Keeping

- Change date picker

# Calendar

- Allow moving/pinning of objects

- (Multiple templates of different time span (3 days, 2 weeks etc))


- Add categorization of goals (tags)
- Add inter-goal dependencies (and check for dependency loops)

# Calendar Engine Functionality

- Add function to allow splitting of large tasks into smaller when generating calendar (minimum chunk size).
- Give notice when an item is too large to fit within the template (alerts list)
- Maximum time of a goal per day

- Add individual buffer option to events.

- Add habits (repeating events with min/max size rendering within a given time frame)
- Add routines (tasks that are always bundled)

# Server Setup

- Option to create several life plans.
- Option to connect to Google Calendar and iCalendar.

# User Experience

- Change week start day in settings
- Customize themes
- Undo/redo function (might be smart to implement before optimistic updates to database on item updates)

- Generally improve UX and user flow/process.


- Mobile app.
