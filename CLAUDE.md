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
│   ├── calendar-actions/         # Calendar data operations
│   │   ├── fetchCalendarData.ts
│   │   ├── syncCalendarData.ts
│   │   └── sync-handlers/        # Individual CRUD handlers
│   └── [auth actions]            # login, register, reset, etc.
│
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── auth/                     # Auth components
│   ├── events/                   # Calendar event components
│   └── draggable/                # Drag-and-drop components
│
├── context/
│   └── CalendarProvider.tsx      # Main data context for planners/calendar
│
├── hooks/                        # Custom React hooks
│
├── lib/
│   ├── auth.ts                   # Auth utilities
│   ├── db.ts                     # Prisma client singleton
│   └── [other utilities]
│
├── prisma/
│   ├── schemas/
│   │   ├── schema.prisma         # Main schema (imports others)
│   │   └── models/
│   │       ├── user.prisma       # User model
│   │       ├── calendar.prisma   # Planner, SimpleEvent, EventTemplate
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
│   └── calendarTypes.ts          # Calendar-specific types
│
└── utils/
    ├── calendar-generation/      # Core scheduling engine
    │   ├── core/
    │   │   ├── CalendarGenerator.ts   # Main orchestrator
    │   │   ├── Scheduler.ts           # Task placement logic
    │   │   ├── TimeSlotManager.ts     # Slot management (O(n log n))
    │   │   └── TemplateExpander.ts    # Recurring template expansion
    │   ├── strategies/
    │   │   ├── SchedulingStrategy.ts  # Base interface + CompositeStrategy
    │   │   ├── UrgencyStrategy.ts     # Deadline-based scoring
    │   │   ├── EarliestSlotStrategy.ts
    │   │   └── LocationGroupingStrategy.ts  # Location-aware scheduling
    │   ├── models/
    │   │   ├── SchedulingModels.ts    # Core interfaces
    │   │   └── TimeSlot.ts
    │   ├── constants.ts               # Configuration constants
    │   └── utils/
    │       ├── dateTimeService.ts     # Date utilities
    │       └── validationUtils.ts     # Input validation
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
}
```

### Location System

Items can have an associated location for travel time calculation:
- **Location** - Named location with address, coordinates, and Google Place ID
- **TravelTime** - Directional travel duration between two locations
- Items with `locationId: null` are considered "Everywhere" (no travel time needed)

### Scheduling System

The calendar generation uses a **strategy-based architecture**:

1. **CalendarGenerator** - Orchestrates the process
2. **TimeSlotManager** - Manages available time slots
3. **TemplateExpander** - Expands recurring templates
4. **Scheduler** - Places tasks using strategies
5. **CompositeStrategy** - Combines multiple weighted strategies

#### Strategy Interface
```typescript
interface SchedulingStrategy {
  readonly name: string;
  score(task: Planner, slot: TimeSlot, context: SchedulingContext): number;
  // Returns 0.0 to 1.0 (higher = better fit)
}
```

#### Current Strategies
- **UrgencyStrategy** - Scores based on deadline proximity
- **EarliestSlotStrategy** - Prefers earlier slots
- **LocationGroupingStrategy** - Groups tasks at same location to minimize travel

#### Weight Configuration (constants.ts)
```typescript
STRATEGY_WEIGHTS = {
  URGENCY_WEIGHT: 1.0,
  DEPENDENCY_WEIGHT: 0.8,
  ENERGY_WEIGHT: 0.5,
  LOCATION_GROUPING_WEIGHT: 0.6,
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
3. Add weight constant in `constants.ts`
4. Add to CompositeStrategy in `CalendarGenerator.ts`

### Adding a new Prisma model:

1. Create/modify file in `prisma/schemas/models/`
2. Import in `prisma/schemas/schema.prisma` if new file
3. Run `npx prisma generate` and `npx prisma db push`
4. Add type export in `types/prisma.d.ts`

### Adding server actions:

1. Create file in `actions/` with `"use server"` directive
2. Import auth and db
3. Always verify session before operations

---

## Code Style

- Use absolute imports with `@/` prefix
- Components use React.FC typing
- Prefer server actions over API routes
- Use Zod for validation schemas
- shadcn/ui components in `components/ui/`

---

## Debugging Calendar Generation

Granular logging is available in `utils/calendar-generation/calendarGeneration.ts`:

```typescript
const enableLogging = true;  // Master switch
const logging = {
  metrics: false,           // Scheduling metrics
  failures: false,          // Scheduling failures
  finalEvents: false,       // Final calendar events JSON
  travelDebug: false,       // Travel calculation debug
  templateInfo: false,      // Template expansion info
  planners: false,          // Input planners JSON
  templates: false,         // Input templates JSON
  locations: false,         // Location map
  strategySettings: false,  // Strategy configuration
};
```

Set `enableLogging = true` and flip individual flags to get specific dumps.

---

## Active Feature Plans

- **Travel Time & Location Management** - Location-aware scheduling with travel time injection between events at different locations
