import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import { taskTooLargeId } from "@/utils/calendar-generation/models/EngineMessage";
import { serializeAllowedTimes } from "@/utils/allowedTimes";
import type { EventTemplate, Planner, SimpleEvent } from "@/types/prisma";

// Per-item scheduling constraints: earliestStartDate keeps a task/goal off the
// calendar before a given instant (riding the same afterTime seam goal-leaf
// chaining uses), and allowedTimes clips dynamic placement to given weekdays /
// time-of-day ranges — inherited down a goal's subtree and enforced as slot
// fragmentation in findAllFittingSlots. A duration no allowed block can ever
// host must fail loud as TOO_LARGE instead of burning the expansion budget.
//
// Positive placement assertions guard the slot fabric — a broken fabric places
// nothing, which would let "nothing landed outside the window" pass vacuously.

const FAKE_TODAY = new Date("2026-01-05T08:00:00"); // a Monday
const USER_ID = "test-user";

// JS getDay(): 0=Sun ... 6=Sat.
const TUESDAY = 2;
const WEDNESDAY = 3;

// Nightly sleep gives the week occupied structure — without it the fabric has
// no gaps and nothing schedules. Daytime 06:00-22:00 stays Available.
const SLEEP_TEMPLATES: EventTemplate[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  id: `sleep-${d}`,
  title: "Sleep",
  startDay: d,
  startTime: "22:00",
  duration: 480,
  userId: USER_ID,
  color: null,
  locationId: null,
  recurrenceExceptions: null,
  createdAt: FAKE_TODAY.toISOString(),
  updatedAt: FAKE_TODAY.toISOString(),
})) as unknown as EventTemplate[];

function makePlanner(id: string, overrides: Partial<Planner>): Planner {
  const ts = FAKE_TODAY.toISOString();
  return {
    id,
    title: id,
    parentId: null,
    plannerType: "task",
    isReady: true,
    isTriaged: true,
    duration: 60,
    deadline: null,
    starts: null,
    recurrence: null,
    recurrenceExceptions: null,
    splitting: null,
    completedSegments: null,
    maxMinutesPerDay: null,
    earliestStartDate: null,
    allowedTimes: null,
    sortOrder: 0,
    completedStartTime: null,
    completedEndTime: null,
    priority: 5,
    userId: USER_ID,
    color: null,
    locationId: null,
    useParentLocation: false,
    categoryId: null,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

let consoleSpies: jest.SpyInstance[] = [];
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["queueMicrotask"] });
  jest.setSystemTime(FAKE_TODAY);
  consoleSpies = [
    jest.spyOn(console, "log").mockImplementation(() => {}),
    jest.spyOn(console, "warn").mockImplementation(() => {}),
    jest.spyOn(console, "info").mockImplementation(() => {}),
  ];
});
afterEach(() => {
  consoleSpies.forEach((s) => s.mockRestore());
  jest.useRealTimers();
});

function run(planners: Planner[]) {
  return generateCalendar(USER_ID, 1, SLEEP_TEMPLATES, planners, [], {
    injectTravelEvents: false,
  });
}

function findEvent(events: SimpleEvent[], id: string): SimpleEvent {
  const event = events.find((e) => e.id === id);
  expect(event).toBeDefined();
  return event!;
}

describe("earliestStartDate", () => {
  it("never places the task before the earliest start instant", () => {
    const earliest = new Date("2026-01-08T10:30:00"); // Thursday
    const task = makePlanner("task-earliest", {
      earliestStartDate: earliest.toISOString(),
    });
    const control = makePlanner("task-control", {});

    const { events } = run([task, control]);

    const placed = findEvent(events, "task-earliest");
    expect(new Date(placed.start).getTime()).toBeGreaterThanOrEqual(
      earliest.getTime(),
    );
    // The unconstrained control proves earlier room existed.
    expect(new Date(findEvent(events, "task-control").start).getTime()).toBeLessThan(
      earliest.getTime(),
    );
  });

  it("combines with allowed days: first allowed day at or after the date", () => {
    const earliest = new Date("2026-01-08T00:00:00"); // Thursday
    const task = makePlanner("task-combined", {
      earliestStartDate: earliest.toISOString(),
      allowedTimes: serializeAllowedTimes({ days: [WEDNESDAY], ranges: null }),
    });

    const { events } = run([task]);

    const placed = findEvent(events, "task-combined");
    const start = new Date(placed.start);
    expect(start.getTime()).toBeGreaterThanOrEqual(earliest.getTime());
    expect(start.getDay()).toBe(WEDNESDAY);
  });
});

describe("allowedTimes", () => {
  it("places only on allowed weekdays", () => {
    const task = makePlanner("task-wednesday", {
      allowedTimes: serializeAllowedTimes({ days: [WEDNESDAY], ranges: null }),
    });

    const { events } = run([task]);

    expect(new Date(findEvent(events, "task-wednesday").start).getDay()).toBe(
      WEDNESDAY,
    );
  });

  it("places inside an allowed time-of-day range", () => {
    const task = makePlanner("task-afternoon", {
      allowedTimes: serializeAllowedTimes({
        days: null,
        ranges: [{ startTime: "14:00", endTime: "16:00" }],
      }),
    });

    const { events } = run([task]);

    const placed = findEvent(events, "task-afternoon");
    const start = new Date(placed.start);
    const end = new Date(placed.end);
    expect(start.getHours()).toBeGreaterThanOrEqual(14);
    expect(
      end.getHours() < 16 || (end.getHours() === 16 && end.getMinutes() === 0),
    ).toBe(true);
  });

  it("constrains a whole goal subtree from the root", () => {
    const root = makePlanner("goal-root", {
      plannerType: "goal",
      duration: 0,
      deadline: new Date("2026-01-30T00:00:00").toISOString(),
      allowedTimes: serializeAllowedTimes({ days: [TUESDAY], ranges: null }),
    });
    const leaf1 = makePlanner("leaf-1", {
      plannerType: "goal",
      parentId: "goal-root",
      sortOrder: 1024,
    });
    const leaf2 = makePlanner("leaf-2", {
      plannerType: "goal",
      parentId: "goal-root",
      sortOrder: 2048,
    });

    const { events } = run([root, leaf1, leaf2]);

    for (const id of ["leaf-1", "leaf-2"]) {
      expect(new Date(findEvent(events, id).start).getDay()).toBe(TUESDAY);
    }
  });

  it("fails loud as TOO_LARGE when no allowed block can ever host the duration", () => {
    const task = makePlanner("task-too-large", {
      duration: 300,
      allowedTimes: serializeAllowedTimes({
        days: null,
        ranges: [{ startTime: "14:00", endTime: "16:00" }],
      }),
    });

    const { events, messages } = run([task]);

    expect(events.find((e) => e.id === "task-too-large")).toBeUndefined();
    expect(
      messages.some((m) => m.id === taskTooLargeId("task-too-large")),
    ).toBe(true);
  });

  it("re-emits identical placements on an idle regen", () => {
    const task = makePlanner("task-stable", {
      allowedTimes: serializeAllowedTimes({
        days: [WEDNESDAY],
        ranges: [{ startTime: "10:00", endTime: "13:00" }],
      }),
    });

    const first = run([task]);
    const placedFirst = findEvent(first.events, "task-stable");
    const second = generateCalendar(
      USER_ID,
      1,
      SLEEP_TEMPLATES,
      [task],
      first.events,
      { injectTravelEvents: false },
    );
    const placedSecond = findEvent(second.events, "task-stable");

    expect(placedSecond.start).toBe(placedFirst.start);
    expect(placedSecond.end).toBe(placedFirst.end);
  });
});
