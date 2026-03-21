- Implement rolling window in calendar generation (for category periods for instance)

- Calendar items not loading properly on initial load
- Handling of category-items overlapping, or how and where to create them
  (Its own view? In template view? In categories like now?)

# House Keeping

- Change date picker

# Calendar

- Allow moving/pinning of objects

- (Multiple templates of different time span (3 days, 2 weeks etc))

- Add RRule exceptions to plans

- Add categorization of goals (tags)
- Add inter-goal dependencies (and check for dependency loops)

# Calendar Engine Functionality

- Add function to allow splitting of large tasks into smaller when generating calendar (minimum chunk size).
- Give notice when an item is too large to fit within the template (alerts list)
- Maximum time of a goal per day

- Add exceptions to template (like skip a day or move a particular repeating instance)

- Add individual buffer option to events.

- Add habits (repeating events with min/max size rendering within a given time frame)
- Add routines (tasks that are always bundled)

# Server Setup

- Option to create several life plans.
- Option to connect to Google Calendar and iCalendar.

# User Experience

- Change week start day in settings
- Customize themes
- Dark mode
- Undo/redo function (might be smart to implement before optimistic updates to database on item updates)
- User select or customize calendar scoring algorithm

- Add a console for error messaging

- Add dragging function to items page to easily move objects from standalone to be nested (in goal tasks for example).

- Generally improve UX and user flow/process.

- Make a nice landing page.

- Mobile app.
