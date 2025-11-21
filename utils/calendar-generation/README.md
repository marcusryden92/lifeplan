# Calendar Generation System

## What This System Does

This system automatically schedules tasks and goals onto your calendar. You give it:

- Tasks (things to do with durations like "Write report - 2 hours")
- Goals (groups of related tasks)
- Templates (recurring blocks like "Morning standup - Mon/Wed/Fri 9am")
- Plans (fixed appointments like "Doctor visit - Tuesday 2pm")

It gives you back a complete calendar with everything scheduled in the best available time slots.

## The Big Picture - How It Works

Think of scheduling like playing Tetris with your calendar:

1. **Map out the board** - Identify all the free space on your calendar
2. **Sort your pieces** - Put urgent/important tasks first
3. **Find where pieces fit** - For each task, look for time slots big enough
4. **Score the options** - Rate each possible placement (earlier is usually better)
5. **Place the piece** - Put the task in the best slot
6. **Update the board** - Mark that time as occupied
7. **Repeat** - Keep going until everything is scheduled

## Core Components

### 1. CalendarGenerator - The Orchestrator

**What it is**: The main class that runs the whole show. It coordinates all the other components and makes sure everything happens in the right order.

**Location**: `core/CalendarGenerator.ts`

**What it does step-by-step**:

1. Checks that your input is valid (tasks have durations, times are formatted correctly, etc.)
2. Keeps past events that already happened
3. Places fixed appointments that have specific times
4. Adds tasks you've already completed
5. Generates all the recurring template events (like weekly meetings)
6. Builds a map of available time slots
7. Schedules all your tasks and goals using smart strategies

**How to use it**:

```typescript
// Create a generator
const generator = new CalendarGenerator(1); // 1 = Monday is start of week

// Generate your calendar
const result = generator.generate({
  userId: "user123",
  weekStartDay: 1,
  templates: myTemplates,
  planners: myTasksAndGoals,
  previousCalendar: existingEvents,
});

// What you get back:
result.events; // All your scheduled events
result.failures; // Tasks that couldn't fit
result.metrics; // Performance stats
```

---

### 2. TimeSlotManager - The Space Finder

**What it is**: Manages the "free space" on your calendar. It's like a map showing which areas are available and which are occupied.

**Location**: `core/TimeSlotManager.ts`

**Key concept - Time Slots**:
A time slot is a continuous block of free time:

```typescript
{
  start: "2025-01-15T14:00:00",  // 2pm
  end: "2025-01-15T16:00:00",    // 4pm
  durationMinutes: 120,          // 2 hours
  isAvailable: true              // Free to use
}
```

**What it does**:

- **Scans your calendar** - Looks at all existing events to find the gaps
- **Builds a slot index** - Creates a searchable list of available times
- **Finds fitting slots** - Quickly looks up "show me all 2-hour slots next week"
- **Reserves slots** - Marks a slot as occupied when you schedule something
- **Splits slots** - If you book the middle of a 4-hour gap, it splits into two 2-hour gaps

**Example**:

```typescript
const manager = new TimeSlotManager(1);

// Build slots for next 30 days
manager.buildDailySlots(
  new Date(), // Start today
  30, // 30 days ahead
  existingEvents, // Your current calendar
  templateEvents // Recurring blocks
);

// Find first slot that fits a 90-minute task
const slot = manager.findFirstFit(90);
// Returns: { start: tomorrow at 10am, end: 11:30am, duration: 90 }

// Book that slot
manager.reserveSlot(slot.start, slot.end, "task-123", "task");
```

---

### 3. TemplateExpander - The Pattern Duplicator

**What it is**: Takes template definitions (like "Workout - Mon/Wed/Fri 6am, 1 hour") and creates actual calendar events for each occurrence.

**Location**: `core/TemplateExpander.ts`

**Think of it like**: A rubber stamp. You define the pattern once, and it stamps that pattern across many weeks.

**What it does**:

- **Expands templates** - Turns one template into many events
- **Caches smartly** - Remembers what it's already generated so it doesn't repeat work
- **Calculates gaps** - Figures out the largest continuous free time (important to know if big tasks will fit)

**Example transformation**:

```typescript
// You define ONE template:
{
  title: "Team Standup",
  startDay: "monday",
  startTime: "09:00",
  duration: 30  // minutes
}

// It creates MANY events:
// Event 1: Monday Jan 6, 9:00-9:30am
// Event 2: Monday Jan 13, 9:00-9:30am
// Event 3: Monday Jan 20, 9:00-9:30am
// ... for as many weeks as you need
```

**How to use it**:

```typescript
const expander = new TemplateExpander(1);

// Generate template events for 3 months
const events = expander.expandTemplates(
  userId,
  myTemplates,
  new Date("2025-01-01"),
  new Date("2025-03-31")
);

// Find largest gap (useful to know if 4-hour task will fit)
const largestGap = expander.calculateLargestGap(myTemplates);
console.log(`Largest free block: ${largestGap} minutes`);
```

---

### 4. Scheduler - The Decision Maker

**What it is**: Decides WHERE to place each task. It looks at all possible time slots and picks the best one.

**Location**: `core/Scheduler.ts`

**The decision process**:

1. **Get candidates** - "Show me all slots that fit this 2-hour task"
2. **Score each option** - "Rate each slot from 0 to 1 based on how good it is"
3. **Pick the best** - "This slot at 10am tomorrow scored 0.95 - let's use it"
4. **Book it** - "Reserve that slot and create the calendar event"

**What it tracks**:

- How many tasks it tried to schedule
- How many succeeded
- How many failed (and why)
- Average time per task
- Total execution time

**Example**:

```typescript
const scheduler = new Scheduler(
  slotManager, // Where to find slots
  strategy, // How to score slots
  context // Extra info (user, current date, etc.)
);

// Schedule one task
const result = scheduler.scheduleTask(myTask);

if (result.success) {
  console.log(`Scheduled: ${result.event.title}`);
  console.log(`Time: ${result.event.start}`);
} else {
  console.log(`Failed: ${result.failure.reason}`);
  // Common reasons:
  // - NO_SLOTS: No time slots big enough
  // - TOO_LARGE: Task is bigger than the largest available gap
  // - INVALID_TASK: Missing duration or other required data
}
```

---

## Scheduling Strategies - How Decisions Are Made

A **strategy** is a scoring system that rates time slots. The scheduler uses strategies to decide which slot is "best" for a given task.

### UrgencyStrategy - Deadline-Aware Scoring

**Location**: `strategies/UrgencyStrategy.ts`

**What it does**: Gives higher scores to earlier slots for tasks with approaching deadlines.

**The logic**:

- Task due in 2 days → Score early slots high (0.9+), late slots low (0.2)
- Task due in 2 months → All slots scored fairly evenly (0.6-0.7)
- No deadline → Slight preference for earlier slots (0.5-0.7)

**Uses a sigmoid curve**: The urgency ramps up smoothly as you approach the deadline, not in a sudden jump.

```typescript
const strategy = new UrgencyStrategy();

// For a task due tomorrow
const score1 = strategy.score(urgentTask, tomorrowSlot, context);
// Returns: 0.95 (very good!)

const score2 = strategy.score(urgentTask, nextWeekSlot, context);
// Returns: 0.30 (not ideal)

// For a task due in 3 months
const score3 = strategy.score(casualTask, tomorrowSlot, context);
// Returns: 0.68 (okay)

const score4 = strategy.score(casualTask, nextWeekSlot, context);
// Returns: 0.64 (also okay)
```

### EarliestSlotStrategy - ASAP Preference

**Location**: `strategies/EarliestSlotStrategy.ts`

**What it does**: Simply prefers earlier slots over later ones. The sooner, the better.

**The logic**:

- Today → Score: 1.0
- Tomorrow → Score: 0.99
- Next week → Score: 0.92
- 90 days out → Score: 0.0

**Use it for**: Tasks that don't have deadlines but should be done soon.

### CompositeStrategy - Combine Multiple Strategies

**Location**: `strategies/SchedulingStrategy.ts`

**What it does**: Combines multiple strategies with weights to make smarter decisions.

**Example**:

```typescript
// Use both urgency and "earliest" preference
const strategy = new CompositeStrategy([
  { strategy: new UrgencyStrategy(), weight: 1.0 },
  { strategy: new EarliestSlotStrategy(), weight: 0.5 },
]);

// How it scores a slot:
// 1. Get urgency score: 0.80
// 2. Get earliest score: 0.90
// 3. Weighted average: (0.80 × 1.0 + 0.90 × 0.5) / 1.5 = 0.833
```

**You can create custom strategies**:

```typescript
class MyCustomStrategy implements SchedulingStrategy {
  readonly name = "custom";

  score(task, slot, context) {
    // Your logic here
    // Return a number between 0.0 and 1.0

    // Example: Prefer afternoons
    const hour = slot.start.getHours();
    return hour >= 13 ? 0.8 : 0.4;
  }
}
```

---

## Utility Classes

### DateTimeService - The Time Helper

**Location**: `utils/dateTimeService.ts`

**What it is**: A collection of date/time helper functions. Instead of writing date math everywhere, use these.

**Common operations**:

```typescript
import { dateTimeService } from "./calendar-generation";

// Get start of week
const weekStart = dateTimeService.getWeekFirstDate(today, 1);

// Add 7 days
const nextWeek = dateTimeService.shiftDays(today, 7);

// Calculate difference
const minutes = dateTimeService.getMinutesDifference(start, end);

// Check if same day
const sameDay = dateTimeService.areOnSameDay(date1, date2);

// Set time on a date
const scheduled = dateTimeService.setTimeOnDate(today, "14:30");

// Format time as string
const timeStr = dateTimeService.formatTime(now); // "14:30"
```

### IntervalUtils - The Gap Calculator

**Location**: `utils/intervalUtils.ts`

**What it is**: Functions for working with time intervals (ranges).

**Common operations**:

```typescript
import { mergeIntervals, findGaps } from './calendar-generation';

// Merge overlapping time blocks
const events = [
  { start: 9am, end: 10am },
  { start: 9:30am, end: 11am },  // Overlaps!
  { start: 2pm, end: 3pm }
];
const merged = mergeIntervals(events);
// Returns: [{ start: 9am, end: 11am }, { start: 2pm, end: 3pm }]

// Find gaps between events
const gaps = findGaps(
  events,
  new Date("2025-01-15T08:00:00"),  // Day starts at 8am
  new Date("2025-01-15T18:00:00")   // Day ends at 6pm
);
// Returns: [{ start: 8am, end: 9am }, { start: 11am, end: 2pm }, { start: 3pm, end: 6pm }]
```

### CalendarValidator - The Data Checker

**Location**: `utils/validationUtils.ts`

**What it is**: Validates your input data before scheduling begins. Catches problems early.

**What it checks**:

- Tasks have durations
- Templates have valid times (HH:MM format)
- Deadlines are valid dates
- Templates don't overlap on the same day
- Required fields aren't missing

**Example**:

```typescript
import { CalendarValidator } from "./calendar-generation";

const validation = CalendarValidator.validateGenerationInput({
  userId: "user123",
  weekStartDay: 1,
  templates: myTemplates,
  planners: myTasks,
});

if (!validation.isValid) {
  console.error("Errors found:");
  validation.errors.forEach((error) => {
    console.log(`- ${error.field}: ${error.message}`);
  });
}

if (validation.warnings.length > 0) {
  console.warn("Warnings:");
  validation.warnings.forEach((w) => console.log(`- ${w}`));
}
```

---

## Configuration - Tuning the System

All configuration lives in `constants.ts`. You can adjust these values to change how scheduling behaves.

### SCHEDULING_CONFIG

```typescript
{
  MAX_ITERATIONS: 10000,     // Safety limit to prevent infinite loops
  MAX_DAYS_TO_SEARCH: 90,    // How far ahead to look for slots
  MIN_SLOT_SIZE: 5,          // Minimum slot size (minutes)
  BUFFER_TIME_MINUTES: 0     // Gap between events (0 = back-to-back)
}
```

### URGENCY_CONFIG

```typescript
{
  CURVE_STEEPNESS: 4,          // How quickly urgency ramps up (higher = more dramatic)
  CRITICAL_THRESHOLD: 0.7,     // When urgency kicks in (0.7 = 70% of time remaining)
  MIN_URGENCY_MULTIPLIER: 0.3  // Base urgency for tasks without deadlines
}
```

### TIME_CONSTANTS

```typescript
{
  MS_PER_MINUTE: 60 * 1000,
  MS_PER_HOUR: 60 * 60 * 1000,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  MINUTES_PER_DAY: 24 * 60,
  MINUTES_PER_WEEK: 7 * 24 * 60
}
```

---

## Complete Usage Example

Here's a full example showing how all the pieces work together:

```typescript
import { generateCalendar } from "@/utils/calendar-generation";

// Your input data
const userId = "user123";
const weekStartDay = 1; // Monday

const templates = [
  {
    id: "t1",
    title: "Morning Focus Time",
    startDay: "monday",
    startTime: "09:00",
    duration: 120, // 2 hours
    userId,
    color: "#3b82f6",
  },
  {
    id: "t2",
    title: "Lunch Break",
    startDay: "monday",
    startTime: "12:00",
    duration: 60,
    userId,
    color: "#ef4444",
  },
];

const planners = [
  {
    id: "task1",
    title: "Write project proposal",
    duration: 180, // 3 hours
    deadline: "2025-01-25T17:00:00",
    priority: 10,
    itemType: "task",
    userId,
  },
  {
    id: "task2",
    title: "Review pull requests",
    duration: 60,
    priority: 7,
    itemType: "task",
    userId,
  },
  {
    id: "plan1",
    title: "Doctor appointment",
    starts: "2025-01-20T14:00:00",
    duration: 30,
    itemType: "plan",
    userId,
  },
];

const previousCalendar = []; // Or existing events

// Generate the calendar
const events = generateCalendar(
  userId,
  weekStartDay,
  templates,
  planners,
  previousCalendar
);

// Use the results
console.log(`Generated ${events.length} events`);
events.forEach((event) => {
  console.log(`${event.title}: ${event.start} to ${event.end}`);
});
```

---

## Data Flow Diagram

```
1. INPUT
   ├─ Templates (recurring blocks)
   ├─ Planners (tasks, goals, plans)
   ├─ Previous Calendar (existing events)
   └─ Config (optional settings)
         ↓
2. VALIDATION
   └─ Check for errors and warnings
         ↓
3. CALENDAR GENERATOR
   ├─ Keep past events
   ├─ Add fixed plans
   ├─ Add completed tasks
   ├─ Expand templates → Template Expander
   ├─ Build time slots → Time Slot Manager
   └─ Schedule tasks → Scheduler
                         ↓
                      Strategy
                    (Score slots)
         ↓
4. OUTPUT
   ├─ events[] (all scheduled events)
   ├─ failures[] (tasks that didn't fit)
   └─ metrics (performance stats)
```

---

## Metrics - Understanding Performance

The system tracks detailed metrics to help you understand what happened:

```typescript
{
  tasksAttempted: 42,           // How many tasks we tried to schedule
  tasksScheduled: 40,            // How many succeeded
  tasksFailed: 2,                // How many failed
  goalsProcessed: 5,             // How many goals we processed
  totalIterations: 127,          // Internal iteration count
  averageSchedulingTimeMs: 0.8,  // Average time per task (milliseconds)
  totalExecutionTimeMs: 45.2,    // Total time for everything
  templateEventsGenerated: 21,   // Number of recurring events created
  templateExpansionTimeMs: 5.1   // Time spent on templates
}
```

**What to look for**:

- `tasksFailed > 0` → Some tasks didn't fit. Check failures array for reasons.
- `averageSchedulingTimeMs > 10` → Might be slow. Consider reducing `MAX_DAYS_TO_SEARCH`.
- `totalExecutionTimeMs > 1000` → Taking over a second. Review your data size.

---

## Failure Handling

When a task can't be scheduled, you get a detailed failure object:

```typescript
{
  taskId: "task-123",
  taskTitle: "Write documentation",
  reason: "NO_SLOTS",
  details: "No available time slots found for 240 minutes",
  context: { duration: 240, searchedDays: 90 }
}
```

**Common failure reasons**:

- `NO_SLOTS` - No available time blocks big enough
- `TOO_LARGE` - Task is longer than the biggest available gap
- `INVALID_TASK` - Missing data (like duration)
- `ITERATION_LIMIT` - Took too many tries (shouldn't happen)

---

## Tips for New Developers

### Getting Started

1. Read this README top to bottom
2. Look at the code comments (they're extensive)
3. Try the usage examples
4. Experiment with small changes

### Understanding the Code

- Start with `CalendarGenerator` - it's the entry point
- Follow the data flow: input → validation → processing → output
- Each class has a single, clear responsibility
- The strategy pattern makes scoring pluggable

### Making Changes

- Want to change scoring? → Create a new Strategy
- Want to add validation? → Extend CalendarValidator
- Want to track new metrics? → Add to SchedulingMetrics
- Want to change time limits? → Edit constants.ts

### Debugging

- Enable logging: `config: { enableLogging: true }`
- Check `result.failures` for problems
- Look at `result.metrics` for performance
- Use TypeScript errors to guide you

---

## FAQ

**Q: Why does it use strategies?**  
A: So you can easily customize how slots are scored without rewriting the scheduler.

**Q: What's the difference between a task and a plan?**  
A: Tasks are flexible (we find time for them), plans are fixed (they have specific times).

**Q: Can I schedule more than 90 days ahead?**  
A: Yes, change `MAX_DAYS_TO_SEARCH` in constants.ts.

**Q: What happens if a task is too big to fit?**  
A: It appears in `result.failures` with reason "TOO_LARGE".

**Q: Can I have multiple scheduling strategies?**  
A: Yes! Use CompositeStrategy to combine them with weights.

**Q: Is this backward compatible?**  
A: Yes, `generateCalendar()` works exactly like before.

---

## Where to Go Next

- **Try it out**: Use the examples above to generate a calendar
- **Read the code**: Start with CalendarGenerator and follow the flow
- **Customize it**: Create your own scheduling strategy
- **Ask questions**: Check the inline comments for more details

Good luck! 🚀
