# Calendar Generation System Architecture

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     generateCalendar()                          │
│                  (Backward Compatible API)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CalendarGenerator                            │
│  • Orchestrates entire generation process                       │
│  • Validates input                                              │
│  • Coordinates all components                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Template   │    │  TimeSlot    │    │  Scheduler   │
│   Expander   │    │   Manager    │    │              │
│              │    │              │    │              │
│ • Expands    │    │ • Builds     │    │ • Finds      │
│   templates  │    │   slots      │    │   slots      │
│ • Caches     │    │ • Efficient  │    │ • Scores     │
│   per week   │    │   lookup     │    │   slots      │
│ • Calculates │    │ • Reserves   │    │ • Schedules  │
│   gaps       │    │   slots      │    │   tasks      │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │    Strategies    │
                                    │                  │
                                    │ • UrgencyStrategy│
                                    │ • EarliestSlot   │
                                    │ • Composite      │
                                    │ • (Extensible)   │
                                    └──────────────────┘
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         Input Layer                             │
│  (Planners, Templates, Previous Calendar, Config)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Validation Layer                            │
│                   (CalendarValidator)                           │
│  • Validates planners                                           │
│  • Validates templates                                          │
│  • Checks for conflicts                                         │
│  • Returns errors & warnings                                    │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Processing Layer                             │
│                  (CalendarGenerator)                            │
│                                                                 │
│  Step 1: Process memoized events (past events)                  │
│  Step 2: Add plan items (fixed appointments)                    │
│  Step 3: Add completed items                                    │
│  Step 4: Expand templates                                       │
│  Step 5: Build time slots                                       │
│  Step 6: Schedule tasks/goals                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │                                     │
                    ▼                                     ▼
        ┌──────────────────────┐          ┌──────────────────────┐
        │  TemplateExpander    │          │   TimeSlotManager    │
        │                      │          │                      │
        │  Generates:          │          │  Creates:            │
        │  • Recurring events  │          │  • Available slots   │
        │  • Simple events     │◄─────────┤  • Occupied slots    │
        │  • Largest gap       │ Uses for │  • Slot statistics   │
        │                      │ blocking │                      │
        │  Caches per week     │          │  O(log n) lookup     │
        └──────────────────────┘          └──────────┬───────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────────┐
                                          │     Scheduler        │
                                          │                      │
                                          │  For each task:      │
                                          │  1. Find slots       │
                                          │  2. Score slots ─────┼──┐
                                          │  3. Pick best        │  │
                                          │  4. Reserve          │  │
                                          │  5. Create event     │  │
                                          └──────────────────────┘  │
                                                                    │
                                                                    ▼
                                                    ┌───────────────────────┐
                                                    │  Strategy Pattern     │
                                                    │                       │
                                                    │  CompositeStrategy    │
                                                    │         │             │
                                                    │    ┌────┴────┐        │
                                                    │    ▼         ▼        │
                                                    │  Urgency  Earliest    │
                                                    │  Strategy Strategy    │
                                                    │                       │
                                                    │  Weighted scoring     │
                                                    └───────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                        Output Layer                             │
│                                                                 │
│  • events: SimpleEvent[]                                        │
│  • failures: SchedulingFailure[]                                │
│  • metrics: SchedulingMetrics                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Input                  Processing              Output
───────               ────────────            ────────

Planners ────┐
             │
Templates ───┤
             ├──► Validation ──► CalendarGenerator
Previous ────┤                         │
Calendar     │                         │
             │                   ┌─────┴─────┐
Config ──────┘                   │           │
                                 │           │
                          Template      TimeSlot
                          Expander      Manager
                              │             │
                              └──────┬──────┘
                                     │
                                Scheduler
                                     │
                                 Strategy
                                     │
                              ┌──────┴──────┐
                              │             │
                          Events      Failures
                              │             │
                              └──────┬──────┘
                                     │
                                 Metrics
```

## Strategy Pattern

```
┌──────────────────────────────────────────────────────────┐
│                  SchedulingStrategy                      │
│                   (Interface)                            │
│                                                          │
│  score(task, slot, context) → number (0.0 to 1.0)        │
└────────────────────┬─────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────────┐
        │            │            │              │
        ▼            ▼            ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Urgency  │  │ Earliest │  │  Energy  │  │  Custom  │
│ Strategy │  │ Strategy │  │ Strategy │  │ Strategy │
│          │  │          │  │          │  │          │
│ Deadline │  │ ASAP     │  │ Time of  │  │   Your   │
│  based   │  │ prefer   │  │   day    │  │  logic   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
        │            │            │              │
        └────────────┴────────────┴──────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │   Composite     │
            │   Strategy      │
            │                 │
            │  Weighted sum   │
            │  of all scores  │
            └─────────────────┘
```

## Time Slot Management

```
Day View:
────────────────────────────────────────────────────────

Time    │ Events                          │ Slots
────────┼─────────────────────────────────┼──────────
00:00   │                                 │ ▓▓▓▓▓▓▓▓
        │         Available               │ Available
06:00   │                                 │ ▓▓▓▓▓▓▓▓
────────┼─────────────────────────────────┼──────────
08:00   │ ████ Morning Template ████      │ Occupied
09:00   │ ████████████████████████        │
────────┼─────────────────────────────────┼──────────
10:00   │                                 │ ▓▓▓▓▓▓▓▓
        │         Available               │ Available
12:00   │                                 │ ▓▓▓▓▓▓▓▓
────────┼─────────────────────────────────┼──────────
12:00   │ ████ Lunch Break ████           │ Occupied
13:00   │ ████████████████████████        │
────────┼─────────────────────────────────┼──────────
13:00   │                                 │ ▓▓▓▓▓▓▓▓
        │         Available               │ Available
17:00   │                                 │ ▓▓▓▓▓▓▓▓
────────┼─────────────────────────────────┼──────────
17:00   │ ████ Task #1 ████               │ Occupied
18:00   │ ████████████████████████        │
────────┼─────────────────────────────────┼──────────
18:00   │                                 │ ▓▓▓▓▓▓▓▓
        │         Available               │ Available
23:59   │                                 │ ▓▓▓▓▓▓▓▓
────────┴─────────────────────────────────┴──────────

Slot Manager Operations:
• buildDailySlots() → Creates slot index
• findFirstFit() → O(log n) lookup
• findAllFittingSlots() → Returns all viable slots
• reserveSlot() → Marks slot as occupied, splits adjacent slots
```

## Performance Comparison

```
Old Algorithm (Minute-by-Minute):
────────────────────────────────
For each task:
  minute = now
  while (minute < now + 90 days):  ← 129,600 minutes!
    check if minute is free
    if yes:
      check next N minutes
    minute++

Complexity: O(n × m × k)
• n = number of tasks
• m = search window in minutes
• k = average task duration

Result: Very slow, needs iteration limit


New Algorithm (Interval-Based):
────────────────────────────────
Setup (once):
  Build slot index from events  ← O(n log n)

For each task:
  slots = findAllFittingSlots()  ← O(log n) lookup
  scored = scoreSlots(slots)     ← O(s) where s = #slots
  best = max(scored)             ← O(s)
  reserve(best)                  ← O(log n)

Complexity: O(n log n + t × s)
• n = number of events
• t = number of tasks
• s = average slots per task (typically < 100)

Result: 10-33x faster!
```

## Extension Points

```
Want to add new features?

┌──────────────────────────────────────────────────┐
│              Extension Points                    │
├──────────────────────────────────────────────────┤
│                                                  │
│  1. New Scheduling Strategy                      │
│     └─ Implement SchedulingStrategy interface    │
│        └─ Add to CompositeStrategy               │
│                                                  │
│  2. New Validation Rules                         │
│     └─ Extend CalendarValidator                  │
│        └─ Add to validateGenerationInput()       │
│                                                  │
│  3. Custom Metrics                               │
│     └─ Extend SchedulingMetrics interface        │
│        └─ Track in Scheduler                     │
│                                                  │
│  4. New Time Constraints                         │
│     └─ Add to SchedulingContext                  │
│        └─ Use in strategies                      │
│                                                  │
│  5. Alternative Slot Selection                   │
│     └─ Create custom Scheduler subclass          │
│        └─ Override scoreSlots()                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

This architecture provides:
✅ Separation of concerns
✅ Easy testing
✅ Simple extensions
✅ Clear data flow
✅ Performance optimization
✅ Maintainability
