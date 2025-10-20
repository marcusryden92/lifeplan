# House Keeping

- Change date picker
- Refactor calendarGeneration

# Calendar

- Allow moving/pinning of objects

- Feature for duplicate plans
- Feature for duplicating templates in template builder

- (Multiple templates of different time span (3 days, 2 weeks etc))

- Add RRule exceptions to plans

- Add categorization of goals (tags)
- Add inter-goal dependencies (and check for dependency loops)

# Calendar Engine Functionality

- Add function to allow splitting of large tasks into smaller when generating calendar (minimum chunk size).
- Give notice when an item is too large to fit within the template (alerts list)
- Maximum time of a goal per day

- Add exceptions to template (like skip a day or move a particular repeating instance)
- Add category function, so that a segment of time can be demarcated and relevant events
  only render within the confines of that time slot ('Work' for instance).

- Option for adding locations and calculating travel time between tasks

- Add minimum buffer option between events.
- Add individual buffer option to events.

- Add habits (repeating events with min/max size rendering within a given time frame)
- Add routines (tasks that are always bundled)

# Creation Pages

- Add mark all and unmark all options for task/plans/goals.

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

- Add page to display all planner objects at once, to easily swap and sort between them.

  - Add dragging function to this page to easily move objects from standalone to be nested (in goal tasks for example).

- Generally improve UX and user flow/process.

- Make a nice landing page.

- Mobile app.
