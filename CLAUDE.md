# LifePlan - Project Documentation for AI Assistants

## Overview

LifePlan is a personal scheduling and task management application that automatically schedules tasks based on priorities, deadlines, and user preferences.

**Stack:**

- Next.js 14.2.6 (App Router)
- React 18 + TypeScript 5.5
- Prisma ORM with PostgreSQL
- NextAuth v5.0.0-beta.20
- shadcn/ui + Radix UI + Tailwind CSS
- Redux Toolkit for state management
- FullCalendar 6.1.x for calendar visualization
- date-fns 3.6.0 for date utilities
- React Hook Form + Zod for form validation

**Package Manager:** pnpm (use `pnpm` instead of `npm` for all commands)

---

## Code Style Rules

- **No emojis** in code, comments, or generated documentation. Keep it professional.
- **No pointless comments** like `// Fixed this function to now take numbers` or `// Updated to use new API`. Comments should explain _why_ something is non-obvious, not narrate what was changed. If someone reading the code for the first time wouldn't benefit from the comment, don't write it.
- **No summary or log files** added to the repo. No `REFACTOR_SUMMARY.md`, no `CHANGELOG.md` for refactors, no `MIGRATION_NOTES.md`. Just make the changes and commit them.
- **No over-documentation**. The code should speak for itself. Only document complex logic, non-obvious decisions, and public APIs.
- Use absolute imports with `@/` prefix.
- Components use React.FC typing.
- Prefer server actions over API routes.
- Use Zod for validation schemas.
- shadcn/ui components in `components/ui/`.

---

## Directory Structure

```
lifeplan/
├── app/                          # Next.js App Router
│   ├── (protected)/              # Auth-protected routes
│   │   ├── calendar/             # Calendar view
│   │   ├── create/               # Task/goal creation
│   │   ├── refine/               # Task editing/refinement
│   │   └── settings/             # User settings
│   │       └── scheduling/       # Scheduling preferences
│   └── api/                      # API routes (minimal - prefer server actions)
│
├── actions/                      # Next.js Server Actions ("use server")
│   ├── scheduling.ts             # User/task scheduling preferences
│   ├── settings.ts               # User settings
│   ├── categories.ts             # Category CRUD operations
│   ├── locations.ts              # Location & TravelTime operations
│   ├── calendar-actions/         # Calendar data operations
│   │   ├── fetchCalendarData.ts
│   │   ├── syncCalendarData.ts
│   │   └── sync-handlers/        # Individual CRUD handlers
│   └── [auth actions]            # login, register, reset, etc.
│
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── auth/                     # Auth components
│   ├── categories/               # Category selection components
│   ├── events/                   # Calendar event components
│   ├── interface/                # Global UI (Navbar, etc.)
│   ├── locations/                # Location management components
│   ├── tasks/                    # Task editing components
│   ├── scheduling/               # Strategy builder components
│   ├── draggable/                # Drag-and-drop components
│   └── utilities/                # Shared utility components (e.g., time-picker)
│
├── context/
│   └── CalendarProvider.tsx      # Main data context for planners/calendar
│
├── documentation/                # Project documentation
│   └── calendar-generation-deep-dive.md  # Deep dive into the scheduling engine
│
├── hooks/                        # Custom React hooks
│
├── lib/
│   ├── auth.ts                   # Auth utilities
│   ├── db.ts                     # Prisma client singleton
│   ├── google-maps-api.ts        # Google Places/Distance Matrix API
│   └── [other utilities]
│
├── notes/                        # Personal notes and TODOs (not documentation)
│
├── prisma/
│   ├── schemas/
│   │   ├── schema.prisma         # Main schema (imports others)
│   │   └── models/
│   │       ├── user.prisma       # User model
│   │       ├── calendar.prisma   # Planner, SimpleEvent, EventTemplate
│   │       ├── category.prisma   # Category (hierarchical task organization)
│   │       ├── location.prisma   # Location, TravelTime
│   │       └── scheduling.prisma # UserSchedulingPreferences, TaskPreferences
│   ├── generated/                # Generated Prisma client
│   └── seed-helpers/             # Seed data generators
│       ├── generateLocations.ts  # Location & TravelTime seed data
│       ├── generatePlanners.ts   # Planner seed data
│       ├── generatePlans.ts      # Plan items seed data
│       └── generateTemplates.ts  # EventTemplate seed data
│
├── redux/
│   ├── store.ts                  # Redux store configuration
│   └── slices/
│       └── schedulingSettingsSlice.ts
│
├── schemas/                      # Zod validation schemas
│
├── types/
│   ├── prisma.d.ts               # Prisma type exports
│   ├── calendarTypes.d.ts        # Calendar-specific types (WeekDayIntegers, TravelExtendedProps, etc.)
│   ├── categoryTypes.d.ts        # Category-related types
│   ├── models.d.ts               # Shared model types
│   ├── ui.d.ts                   # UI component types
│   ├── user.d.ts                 # User types
│   └── userTypes.d.ts            # Extended user types
│
└── utils/
    ├── calendar-generation/      # Core scheduling engine
    │   ├── calendarGeneration.ts      # Public entry point (backward-compatible)
    │   ├── calendarGenerationHelpers.ts
    │   ├── weekTemplateGeneration.ts
    │   ├── constants.ts               # All configuration constants
    │   ├── index.ts                   # Public API exports
    │   │
    │   ├── core/                      # Orchestrator classes + subfunctions
    │   │   ├── CalendarGenerator.ts   # Main orchestrator (~260 lines)
    │   │   ├── CalendarGenerator/     # Subfunctions by phase
    │   │   │   ├── initialization/    # validateInput, buildInitialEventArray
    │   │   │   ├── template-processing/  # expandTemplates
    │   │   │   ├── slot-building/     # buildLocationMap, buildInitialSlots,
    │   │   │   │                      # buildCategoryConstraints, buildPlannerCategoryMap
    │   │   │   ├── scheduling/        # prepareSchedulingContext, buildSchedulingStrategy,
    │   │   │   │                      # prepareCandidates
    │   │   │   └── finalization/      # assembleFinalEvents
    │   │   │
    │   │   ├── Scheduler.ts           # Task placement orchestrator (~117 lines)
    │   │   ├── Scheduler/             # Subfunctions by phase
    │   │   │   ├── validation/        # validateTask
    │   │   │   ├── slot-selection/    # findValidSlots, selectBestSlot
    │   │   │   ├── reservation/       # reserveTaskSlot
    │   │   │   ├── event-creation/    # buildTaskEvent
    │   │   │   └── scheduling/        # scheduleTask, scheduleTasks
    │   │   │
    │   │   ├── TimeSlotManager.ts     # Slot management orchestrator (~385 lines)
    │   │   ├── TimeSlotManager/       # Subfunctions by domain
    │   │   │   ├── travel/            # TravelManager
    │   │   │   ├── converter/         # TravelConverter
    │   │   │   ├── builder/           # SlotBuilder
    │   │   │   ├── finder/            # SlotFinder
    │   │   │   └── reserver/          # SlotReserver
    │   │   │
    │   │   └── TemplateExpander.ts    # Recurring template expansion
    │   │
    │   ├── strategies/
    │   │   ├── SchedulingStrategy.ts  # Base interface + CompositeStrategy
    │   │   ├── defaultStrategy.ts     # Default weights and scoring config
    │   │   ├── EarliestSlotStrategy.ts
    │   │   └── LocationGroupingStrategy.ts
    │   │
    │   ├── models/
    │   │   ├── SchedulingModels.ts    # Core interfaces
    │   │   └── TimeSlot.ts
    │   │
    │   ├── helpers/
    │   │   ├── events/                # EventAssembler
    │   │   ├── location/              # LocationMapper
    │   │   └── scheduling/            # PrioritySorter, TaskSchedulingOrchestrator
    │   │
    │   ├── calendar-logic-helpers/
    │   │   └── sortPlannersByPriority.ts
    │   │
    │   └── utils/
    │       ├── dateTimeService.ts     # Centralized date utilities
    │       ├── validationUtils.ts     # Input validation
    │       ├── loggingUtils.ts        # Debug logging
    │       └── intervalUtils.ts
    │
    ├── goalPageHandlers.ts            # Goal tree utilities
    └── taskHelpers.ts                 # Task utility functions
```

---

## Core Concepts

### Item Types (ItemType enum)

- **task** - Schedulable work item with duration
- **plan** - Fixed-time appointment (has `starts` datetime)
- **goal** - Container for tasks (hierarchical)
- **template** - Recurring calendar blocks
- **travel** - Auto-generated travel time between locations
- **category** - Organizational container with time constraints

### Planner Model

Central model for all schedulable items:

```typescript
{
  id: string;
  title: string;
  parentId?: string;      // For hierarchy (subtasks, goals)
  itemType: ItemType;
  duration: number;       // Minutes
  deadline?: string;      // ISO date
  starts?: string;        // For plan items only
  priority: number;
  isReady?: boolean;      // For goals - ready to schedule?
  completedStartTime?: string;
  completedEndTime?: string;
  userId: string;
  color?: string;
  locationId?: string;    // Reference to Location for travel time calculation
  categoryId?: string;    // Reference to Category for organization
  useParentLocation?: boolean; // If true, inherits location from parent item
}
```

### Location System

Items can have an associated location for travel time calculation:

- **Location** - Named location with address, coordinates, and Google Place ID
- **TravelTime** - Directional travel duration between two locations with transport modes (DRIVING, TRANSIT, BICYCLING, WALKING)
  - Stores Google API baseline values for rush hour, regular, and night times
  - Supports user overrides for custom travel times
- Items with `locationId: null` are considered "Anywhere" (no travel time needed)

### Category System

Categories provide organizational structure with time-based scheduling constraints:

- **Category** - Hierarchical organizational container for planners
  - `timeSlots`: JSON array defining when category items can be scheduled
    - Format: `[{ days: [1,3,5], startTime: "08:00", endTime: "17:00" }, ...]`
    - days: 0=Sunday, 1=Monday, ... 6=Saturday
  - `isStrict`: Boolean controlling whether other items can fill empty time slots
    - `true`: Only items from this category can be scheduled in these slots
    - `false`: Other items can fill empty space in the time slots
  - `locationId`: Optional default location (items without location inherit this)
  - Supports parent-child hierarchy via `parentId` for subcategories
- Categories appear as background events on the calendar to visualize time constraints

### Scheduling System

The calendar generation uses a **strategy-based architecture**:

1. **CalendarGenerator** - Orchestrates the process
2. **TimeSlotManager** - Manages available time slots
3. **TemplateExpander** - Expands recurring templates
4. **Scheduler** - Places tasks using strategies
5. **CompositeStrategy** - Combines multiple weighted strategies

See `documentation/calendar-generation-deep-dive.md` for a detailed walkthrough.

#### Strategy Interface

```typescript
interface SchedulingStrategy {
  readonly name: string;
  score(task: Planner, slot: TimeSlot, context: SchedulingContext): number;
  // Returns 0.0 to 1.0 (higher = better fit)
}
```

#### Current Strategies

- **EarliestSlotStrategy** - Prefers earlier time slots
- **LocationGroupingStrategy** - Groups tasks at same location to minimize travel
  - Scores slots based on adjacent location matches (sandwich patterns)
  - Applies travel time penalties for cross-location scheduling

Note: Task urgency/deadline prioritization is handled by `sortPlannersByPriority` before slot scoring.

#### Weight Configuration (defaultStrategy.ts)

```typescript
DEFAULT_STRATEGY_WEIGHTS = {
  earliestSlot: 1.0, // Baseline preference for earlier slots
  locationGrouping: 0.2, // Weight for location-based grouping
};

DEFAULT_LOCATION_GROUPING_SCORES = {
  bothMatch: 0.95, // Both adjacent events match task location
  oneMatchOneOpen: 0.8, // One end matches, other end is open
  oneMatch: 0.5, // One end matches, other doesn't
  bothOpen: 0.7, // Both ends are open (empty day)
  oneOpenNoMatch: 0.45, // One end open, other doesn't match
  neitherMatch: 0.4, // Neither end matches
  noLocation: 0.5, // Task has no location (neutral)
};

DEFAULT_LOCATION_GROUPING_PENALTIES = {
  maxSingleTravelPenalty: 0.02,
  maxDoubleTravelPenalty: 0.03,
  singleTravelPenaltyDivisor: 600, // travelMinutes / divisor = penalty
  doubleTravelPenaltyDivisor: 400,
};
```

---

## Key Patterns

### Server Actions

Prefer server actions over API routes:

```typescript
"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function myAction(data: MyType) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return await db.model.operation({...});
}
```

### Form Handling

React Hook Form + Zod:

```typescript
const form = useForm<z.infer<typeof MySchema>>({
  resolver: zodResolver(MySchema),
  defaultValues: {...},
});
```

### Data Context

CalendarProvider manages planner state:

```typescript
const { plannerArray, updatePlannerArray } = useCalendarProvider();
```

---

## Database Commands

```bash
# Generate Prisma client after schema changes
pnpm prisma generate

# Push schema changes to database
pnpm prisma db push

# Reset database and run seed (development)
pnpm prisma db push --force-reset && pnpm prisma db seed

# Open Prisma Studio
pnpm prisma studio

# Create migration
pnpm prisma migrate dev --name migration_name
```

### Seed Data

Seed helpers in `prisma/seed-helpers/` provide test data with location assignments:

- **A items** - No location (can be done anywhere)
- **B items** - Work location
- **C items** - Home location
- **D items** - Gym location
- **Templates** - Sleep/Breakfast/Cleaning at Home, Work at Work

---

## Environment Variables

Required in `.env`:

```
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET=""
DATABASE_URL=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
RESEND_API_KEY=""
```

---

## Adding New Features

### Adding a new scheduling strategy:

1. Create strategy in `utils/calendar-generation/strategies/`
2. Implement `SchedulingStrategy` interface
3. Add weight constant in `strategies/defaultStrategy.ts`
4. Add to CompositeStrategy in `CalendarGenerator/scheduling/buildSchedulingStrategy.ts`

### Adding a new Prisma model:

1. Create/modify file in `prisma/schemas/models/`
2. Import in `prisma/schemas/schema.prisma` if new file
3. Run `pnpm prisma generate` and `pnpm prisma db push`
4. Add type export in `types/prisma.d.ts`

### Adding server actions:

1. Create file in `actions/` with `"use server"` directive
2. Import auth and db
3. Always verify session before operations

---

## Debugging Calendar Generation

Granular logging is available in `utils/calendar-generation/calendarGeneration.ts`:

```typescript
const enableLogging = true; // Master switch
const logging = {
  metrics: false,
  failures: false,
  finalEvents: false,
  travelDebug: false,
  templateInfo: false,
  planners: false,
  templates: false,
  locations: false,
  strategySettings: false,
  leanCalendar: false,  // Sorted events with location info
};
```

Set `enableLogging = true` and flip individual flags to get specific dumps.

---

## Implemented Features

- **Travel Time & Location Management** - Location-aware scheduling with travel time injection between events at different locations
- **Category System** - Hierarchical task organization with time-based scheduling constraints (strict/non-strict modes)

## Active Feature Plans

- Further refinement of category-based scheduling strategies
- Enhanced user preferences for strategy weight customization
