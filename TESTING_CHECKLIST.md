# Calendar Generation Refactor - Testing Checklist

## Pre-Testing Setup

### ✅ Code Review

- [x] All new files created
- [x] Backward compatibility maintained
- [x] No compilation errors
- [x] Documentation complete

### Before Testing

```bash
# Ensure you're on the refactor branch
git status

# Current branch: refactor/calendar-gen
```

## Testing Plan

### Phase 1: Smoke Tests (Critical - Do First)

#### Test 1: Basic Calendar Generation

**Goal**: Verify basic functionality works

```typescript
// In browser console or test file
const events = generateCalendar(
  userId,
  1, // Monday start
  [], // No templates
  [simpleTasks],
  []
);

// Expected: Events generated without errors
// Check: events.length > 0
```

**✅ Pass Criteria**:

- No errors thrown
- Events returned
- Events have valid start/end times

#### Test 2: With Templates

**Goal**: Verify template expansion works

```typescript
const templates = [
  {
    id: "test-template",
    title: "Morning Block",
    startDay: "monday",
    startTime: "09:00",
    duration: 60,
    userId,
  },
];

const events = generateCalendar(userId, 1, templates, tasks, []);

// Expected: Template events appear
// Check: Some events with itemType === 'template'
```

**✅ Pass Criteria**:

- Template events generated
- RRule properly set
- Events recur weekly

#### Test 3: Real Data Test

**Goal**: Test with actual production data

```typescript
// Use current user's actual data
const result = generateCalendar(
  currentUser.id,
  userSettings.weekStartDay,
  userTemplates,
  userPlanners,
  userPreviousCalendar
);

console.log("Metrics:", result.metrics);
console.log("Failures:", result.failures);
```

**✅ Pass Criteria**:

- All existing schedules generate
- No unexpected failures
- Metrics look reasonable

### Phase 2: Edge Cases

#### Test 4: Empty Inputs

```typescript
// No tasks
const result1 = generateCalendar(userId, 1, templates, [], []);
// Should work, only show templates

// No templates
const result2 = generateCalendar(userId, 1, [], tasks, []);
// Should work, schedule tasks with no constraints

// Nothing
const result3 = generateCalendar(userId, 1, [], [], []);
// Should return empty array
```

**✅ Pass Criteria**:

- No errors on empty inputs
- Graceful handling

#### Test 5: Large Dataset

```typescript
// Create 100+ tasks
const largePlannerSet = Array.from({ length: 100 }, (_, i) => ({
  id: `task-${i}`,
  title: `Task ${i}`,
  duration: 30 + (i % 60),
  itemType: "task",
  priority: i % 10,
  // ...
}));

const start = performance.now();
const events = generateCalendar(userId, 1, templates, largePlannerSet, []);
const duration = performance.now() - start;

console.log(`Generated ${events.length} events in ${duration}ms`);
```

**✅ Pass Criteria**:

- Completes in reasonable time (< 500ms)
- No timeout
- All tasks scheduled or failures reported

#### Test 6: Complex Goals

```typescript
// Goals with nested tasks
const goalWithTasks = {
  id: "goal-1",
  title: "Complete Project",
  itemType: "goal",
  isReady: true,
  deadline: futureDate,
  // ... with multiple child tasks
};

const events = generateCalendar(
  userId,
  1,
  templates,
  [goalWithTasks, ...childTasks],
  []
);

// Check: Tasks scheduled in order
```

**✅ Pass Criteria**:

- Goal tasks scheduled sequentially
- Dependencies respected
- All tasks in goal accounted for

### Phase 3: Regression Tests

#### Test 7: Compare with Old System

**Goal**: Ensure output is similar to old system

```typescript
// Save current production output
const oldEvents = getCurrentCalendarEvents();

// Run new system
const newEvents = generateCalendar(/* same inputs */);

// Compare
const differences = compareEventSets(oldEvents, newEvents);

console.log("Differences:", differences);
```

**✅ Pass Criteria**:

- Same tasks scheduled
- Similar time slots (may differ slightly due to improved algorithm)
- No missing tasks

#### Test 8: Metrics Validation

```typescript
const result = generateCalendar(/* ... */);

console.log("Metrics:", {
  attempted: result.metrics.tasksAttempted,
  scheduled: result.metrics.tasksScheduled,
  failed: result.metrics.tasksFailed,
  time: result.metrics.totalExecutionTimeMs,
});

// Check metrics make sense
```

**✅ Pass Criteria**:

- `scheduled + failed = attempted`
- Execution time < 1000ms for typical data
- No NaN or negative values

### Phase 4: Feature Tests

#### Test 9: Urgency Strategy

```typescript
// Create tasks with varying deadlines
const urgentTask = { deadline: tomorrow, priority: 10 };
const futureTask = { deadline: nextMonth, priority: 5 };

const events = generateCalendar(userId, 1, [], [urgentTask, futureTask], []);

// Check: Urgent task scheduled before future task
```

**✅ Pass Criteria**:

- Urgent tasks scheduled earlier
- Priority respected
- Deadlines honored

#### Test 10: Template Conflicts

```typescript
// Create overlapping templates
const template1 = { startDay: "monday", startTime: "09:00", duration: 120 };
const template2 = { startDay: "monday", startTime: "10:00", duration: 60 };

const events = generateCalendar(userId, 1, [template1, template2], tasks, []);

// Check warnings logged
```

**✅ Pass Criteria**:

- Validation warnings appear
- Still generates calendar
- Overlaps handled

### Phase 5: Performance Tests

#### Test 11: Benchmark

```typescript
const scenarios = [
  { tasks: 10, templates: 3, days: 7 },
  { tasks: 50, templates: 5, days: 30 },
  { tasks: 200, templates: 10, days: 90 },
];

for (const scenario of scenarios) {
  const start = performance.now();
  const events = generateCalendar(/* create data for scenario */);
  const duration = performance.now() - start;

  console.log(`${scenario.tasks} tasks, ${scenario.days} days: ${duration}ms`);
}
```

**✅ Pass Criteria**:

- 10 tasks: < 50ms
- 50 tasks: < 100ms
- 200 tasks: < 500ms

#### Test 12: Memory Usage

```typescript
// Monitor memory during generation
const beforeMem = performance.memory?.usedJSHeapSize;

const events = generateCalendar(/* large dataset */);

const afterMem = performance.memory?.usedJSHeapSize;
const diff = (afterMem - beforeMem) / 1024 / 1024;

console.log(`Memory used: ${diff}MB`);
```

**✅ Pass Criteria**:

- No memory leaks
- Reasonable memory usage (< 50MB for large datasets)

## Integration Testing

### Test 13: With React Components

```typescript
// In your calendar component
useEffect(() => {
  try {
    const events = generateCalendar(/* ... */);
    setCalendarEvents(events);
  } catch (error) {
    console.error("Calendar generation failed:", error);
  }
}, [userId, templates, planners]);
```

**✅ Pass Criteria**:

- UI updates correctly
- No React errors
- Loading states work

### Test 14: With Redux

```typescript
// In Redux thunk
dispatch(
  updateAllCalendarStates({
    planners: newPlanners,
  })
);

// Wait for state update
const state = getState();

// Check calendar regenerated
```

**✅ Pass Criteria**:

- State updates correctly
- Calendar regenerates
- No Redux errors

### Test 15: Sync to Database

```typescript
// Verify database sync works
const events = generateCalendar(/* ... */);

// Should trigger sync
await syncCalendarData(userId, events);

// Verify in database
```

**✅ Pass Criteria**:

- Events saved correctly
- No database errors
- Sync completes

## Known Issues to Watch For

### Potential Issues

1. **Template RRule parsing** - Ensure RRule format is correct
2. **Timezone handling** - Check dates in different timezones
3. **Edge of week** - Tasks spanning week boundaries
4. **Midnight boundary** - Events at 00:00
5. **Very long tasks** - Tasks longer than template gaps
6. **Past events** - Ensure past events are preserved

### Debug Mode

```typescript
// Enable detailed logging
const result = generateCalendar({
  // ... input
  config: {
    enableLogging: true,
    maxDaysAhead: 90,
  },
});

// In development, metrics and failures are logged
```

## Rollback Plan

If critical issues found:

```bash
# Rollback to development branch
git checkout development

# Or create hotfix
git checkout -b hotfix/calendar-issues

# Revert specific file if needed
git checkout development -- utils/calendar-generation/calendarGeneration.ts
```

## Sign-Off Checklist

Before merging to main:

- [ ] All Phase 1 tests pass
- [ ] All Phase 2 tests pass
- [ ] No regression (Phase 3)
- [ ] Features work (Phase 4)
- [ ] Performance acceptable (Phase 5)
- [ ] Integration tests pass
- [ ] No console errors
- [ ] No database issues
- [ ] Documentation reviewed
- [ ] Team demo completed

## Success Criteria

✅ **Must Have**:

- Zero breaking changes
- All existing schedules work
- No performance regression
- No new errors

✅ **Should Have**:

- Performance improvement visible
- Metrics provide value
- Failures are informative

✅ **Nice to Have**:

- 10x+ performance improvement
- Better task placement
- Useful diagnostics

---

**Testing Status**: Ready to begin
**Estimated Time**: 2-4 hours comprehensive testing
**Priority**: High (core functionality)
