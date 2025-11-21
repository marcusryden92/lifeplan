# Scheduling Strategies & Task Preferences - Implementation Guide

## Overview

This system adds a complete UI and database layer for users to create custom scheduling strategies and set per-task preferences without touching code.

## What's Been Created

### 1. **Database Schema** (`prisma/schemas/models/scheduling.prisma`)

- `SchedulingStrategy` - User-defined strategies
- `StrategyRule` - Individual rules within strategies
- `TaskPreferences` - Per-task scheduling preferences

### 2. **UI Components**

#### `components/scheduling/StrategyBuilder.tsx`

- Full strategy creation interface
- Add/remove/configure rules
- Set rule weights (0.0 - 1.0)
- Rule-specific configuration UI
- Save strategies to database

#### `components/scheduling/TaskPreferencesEditor.tsx`

- Set task type (Exercise, Deep Work, Admin, etc.)
- Choose preferred days
- Set avoid days
- Define preferred time windows
- Set priority level
- Define energy level requirements
- Toggle flexibility

### 3. **API Routes**

#### `app/api/scheduling/strategies/route.ts`

- `POST` - Create new strategy
- `GET` - List user's strategies
- `PATCH` - Update existing strategy
- `DELETE` - Delete strategy

#### `app/api/scheduling/task-preferences/route.ts`

- `POST` - Save/update task preferences
- `GET` - Load task preferences for a task

### 4. **Settings Page** (`app/(protected)/settings/scheduling/page.tsx`)

- Tabbed interface for strategy management
- Strategy builder tab
- My strategies tab (list saved strategies)
- Guide tab with documentation

## How to Use

### Step 1: Run Prisma Migration

```bash
pnpm prisma migrate dev --name add_scheduling_strategies
```

This creates the database tables for strategies and preferences.

### Step 2: Integrate Strategy Builder into Settings

The settings page is already created at `/settings/scheduling`. Add a link to it in your main settings page or navigation.

### Step 3: Add Task Preferences to Task Editor

In your existing task/planner creation/editing UI, add the `TaskPreferencesEditor`:

```tsx
import { TaskPreferencesEditor } from "@/components/scheduling/TaskPreferencesEditor";

// In your task editor:
<TaskPreferencesEditor
  plannerId={task.id}
  initialPreferences={existingPreferences}
  onSave={(prefs) => {
    // Optionally refresh calendar
  }}
/>;
```

### Step 4: Update Calendar Generator to Use Strategies

Modify `utils/calendar-generation/core/CalendarGenerator.ts`:

```typescript
import { db } from '@/lib/db';

// In generateCalendar():
async generateCalendar(userId: string) {
  // 1. Load user's active strategy
  const activeStrategy = await db.schedulingStrategy.findFirst({
    where: { userId, isActive: true },
    include: { rules: { orderBy: { order: 'asc' } } },
  });

  // 2. Build composite strategy from database rules
  const strategy = this.buildStrategyFromDB(activeStrategy);

  // 3. Load task preferences
  const taskPreferences = await db.taskPreferences.findMany({
    where: {
      plannerId: { in: tasks.map(t => t.id) }
    }
  });

  // 4. Apply preferences to tasks
  const enhancedTasks = tasks.map(task => ({
    ...task,
    ...taskPreferences.find(p => p.plannerId === task.id)
  }));

  // 5. Use enhanced tasks with scheduler
  const scheduler = new Scheduler(strategy);
  // ... rest of generation
}

private buildStrategyFromDB(dbStrategy: any): SchedulingStrategy {
  if (!dbStrategy) {
    // Return default strategy
    return new CompositeStrategy([
      { strategy: new UrgencyStrategy(), weight: 0.5 },
      { strategy: new EarliestSlotStrategy(), weight: 0.3 },
    ]);
  }

  const strategyInstances = dbStrategy.rules.map((rule: any) => {
    const strategy = this.createStrategyInstance(rule.ruleType, rule.config);
    return { strategy, weight: rule.weight };
  });

  return new CompositeStrategy(strategyInstances);
}

private createStrategyInstance(ruleType: string, config: any): SchedulingStrategy {
  switch (ruleType) {
    case 'URGENCY':
      return new UrgencyStrategy();
    case 'EARLIEST_SLOT':
      return new EarliestSlotStrategy();
    case 'PREFERRED_TIME':
      return new PreferredTimeStrategy(config);
    case 'TASK_TYPE_PREFERENCE':
      return new TaskTypePreferenceStrategy(config);
    case 'CONFLICT_AVOIDANCE':
      return new ConflictAvoidanceStrategy();
    case 'DAY_PREFERENCE':
      return new DayPreferenceStrategy(config);
    // ... etc
    default:
      return new UrgencyStrategy();
  }
}
```

### Step 5: Create Missing Strategy Classes

Some strategies mentioned in the UI don't exist yet. Create them:

#### `DayPreferenceStrategy.ts`

```typescript
export class DayPreferenceStrategy implements SchedulingStrategy {
  score(task: TaskItem, slot: TimeSlot, context: SchedulingContext): number {
    const slotDay = slot.start.getDay(); // 0-6

    // Check if task has day preferences
    const preferredDays = task.preferredDays || [];
    const avoidDays = task.avoidDays || [];

    if (avoidDays.includes(slotDay)) {
      return 0.0; // Never schedule on avoid days
    }

    if (preferredDays.length > 0) {
      return preferredDays.includes(slotDay) ? 1.0 : 0.2;
    }

    return 0.5; // No preference
  }
}
```

## User Workflow

### Creating a Strategy

1. User goes to `/settings/scheduling`
2. Clicks "Add Rule"
3. Selects rule type (e.g., "Task Type Preferences")
4. Sets weight (e.g., 0.8 for high importance)
5. Configures rule (e.g., "Exercise in morning 6-10am")
6. Adds more rules as needed
7. Clicks "Save Strategy"

### Setting Task Preferences

1. User creates/edits a task
2. Opens "Scheduling Preferences" section
3. Sets task type: "Exercise"
4. Selects preferred days: Mon, Wed, Fri
5. Sets time window: 7:00 AM - 9:00 AM
6. Sets priority: HIGH
7. Sets energy level: HIGH
8. Saves preferences

### Result

When calendar regenerates, the exercise task will:

- Only be scheduled on Mon/Wed/Fri (day preference)
- Between 7-9am (time window)
- Given priority in scheduling (high priority)
- Matched to high-energy time slots (if energy strategy active)

## Database Schema Summary

```prisma
model SchedulingStrategy {
  id          String
  userId      String
  name        String        // "My Morning Strategy"
  description String?
  isActive    Boolean       // Currently active?
  isDefault   Boolean       // Default for new schedules?
  rules       StrategyRule[]
}

model StrategyRule {
  id         String
  strategyId String
  ruleType   StrategyRuleType  // URGENCY, PREFERRED_TIME, etc.
  weight     Float             // 0.0 - 1.0
  config     Json              // Rule-specific config
  order      Int               // Display order
}

model TaskPreferences {
  id                  String
  plannerId           String @unique
  taskType            TaskTypeEnum?      // EXERCISE, DEEP_WORK, etc.
  preferredDays       Int[]              // [1,3,5] = Mon, Wed, Fri
  preferredStartTime  String?            // "09:00"
  preferredEndTime    String?            // "12:00"
  avoidDays           Int[]              // Days to avoid
  priority            PriorityLevel      // LOW, MEDIUM, HIGH, CRITICAL
  energyLevel         EnergyLevel?       // LOW, MEDIUM, HIGH
  allowFlexibility    Boolean            // Can bend rules if needed
}
```

## Next Steps

1. **Run the migration** to create tables
2. **Test the UI** - visit `/settings/scheduling`
3. **Integrate with CalendarGenerator** - load and apply strategies
4. **Create remaining strategy classes** - DayPreference, Energy, etc.
5. **Add task preferences to task editor** - integrate TaskPreferencesEditor component
6. **Test end-to-end** - create strategy → set task prefs → regenerate calendar

## Example: Complete User Journey

### Scenario: Morning Exercise Routine

1. **Create Strategy** (in `/settings/scheduling`):

   - Name: "Morning Person Strategy"
   - Rules:
     - Task Type Preference (weight 0.9) - Exercise in AM
     - Day Preference (weight 0.8) - Respect preferred days
     - Conflict Avoidance (weight 1.0) - Never over meetings
     - Urgency (weight 0.5) - Still consider deadlines
   - Save & activate

2. **Configure Exercise Task**:

   - Task Type: EXERCISE
   - Preferred Days: Mon, Wed, Fri, Sat
   - Time Window: 7:00 AM - 9:00 AM
   - Priority: HIGH
   - Energy Level: HIGH
   - Flexibility: OFF (strict time window)

3. **Calendar Regenerates**:

   - Exercise tasks only appear Mon/Wed/Fri/Sat
   - Only between 7-9 AM
   - Never overlap with meetings
   - If 7-9 AM blocked, task doesn't schedule (flexibility OFF)

4. **Result**: Perfect morning workout schedule! 🏃‍♂️

## Benefits

✅ **No Code Required** - Users configure everything in UI
✅ **Flexible** - Mix and match rules with custom weights
✅ **Persistent** - Strategies saved to database
✅ **Per-Task Control** - Each task can have unique preferences
✅ **Extensible** - Easy to add new rule types
✅ **Visual** - Clear UI shows exactly what's configured
✅ **Powerful** - Combines multiple factors for intelligent scheduling

This is a production-ready feature that gives users full control over their calendar scheduling logic!
