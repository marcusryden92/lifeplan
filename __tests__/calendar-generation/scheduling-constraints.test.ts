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
    linkedItemId: null,
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

// Travel absorb/reclaim under constraints. Removing a redundant travel leg is
// always correct for a same-location follow-up; only the back-extension into
// the freed span can violate a placement bound. A constrained task must still
// coalesce travel when the slide is legal (tier 1), and when a bound sits
// inside the freed span the leg is removed without moving the task (tier 2) —
// never the old blanket behavior of a fresh round trip per placement.
describe("travel coalescing under constraints", () => {
  const MONDAY = 1;
  const HOME = "loc-home";
  const GYM = "loc-gym";
  const TRAVEL_MINUTES = 30;
  const BUFFER_MINUTES = 10;

  const HOME_SLEEP_TEMPLATES = SLEEP_TEMPLATES.map((t) => ({
    ...t,
    locationId: HOME,
  })) as EventTemplate[];

  const travelEntry = (from: string, to: string) => ({
    fromLocationId: from,
    toLocationId: to,
    rushHourMinutes: TRAVEL_MINUTES,
    regularMinutes: TRAVEL_MINUTES,
    nightMinutes: TRAVEL_MINUTES,
  });
  const TRAVEL_MATRIX = new Map([
    [`${HOME}->${GYM}`, travelEntry(HOME, GYM)],
    [`${GYM}->${HOME}`, travelEntry(GYM, HOME)],
  ]);

  function runWithTravel(planners: Planner[]) {
    return generateCalendar(USER_ID, 1, HOME_SLEEP_TEMPLATES, planners, [], {
      injectTravelEvents: true,
      travelTimeMatrix: TRAVEL_MATRIX,
      bufferTimeMinutes: BUFFER_MINUTES,
    });
  }

  it("chains same-location leaves of a day-constrained goal with one outbound and one return leg", () => {
    const root = makePlanner("bakery-goal", {
      plannerType: "goal",
      duration: 0,
      deadline: new Date("2026-01-30T00:00:00").toISOString(),
      allowedTimes: serializeAllowedTimes({ days: [MONDAY], ranges: null }),
    });
    const leaves = [1, 2, 3].map((i) =>
      makePlanner(`bakery-leaf-${i}`, {
        parentId: "bakery-goal",
        locationId: GYM,
        sortOrder: i * 1024,
      }),
    );

    const { events, travelEvents } = runWithTravel([root, ...leaves]);

    const placed = leaves.map((l) => findEvent(events, l.id));
    for (const event of placed) {
      expect(new Date(event.start).getDay()).toBe(MONDAY);
    }

    // Consecutive same-location leaves absorb the previous leaf's return
    // travel: each next leaf starts one placement buffer after the previous
    // ended, with no travel between them (a round trip would need
    // 2 * TRAVEL_MINUTES more).
    const bufferMs = BUFFER_MINUTES * 60000;
    expect(new Date(placed[1].start).getTime()).toBe(
      new Date(placed[0].end).getTime() + bufferMs,
    );
    expect(new Date(placed[2].start).getTime()).toBe(
      new Date(placed[1].end).getTime() + bufferMs,
    );

    expect(travelEvents.filter((t) => t.toLocationId === GYM)).toHaveLength(1);
    expect(travelEvents.filter((t) => t.fromLocationId === GYM)).toHaveLength(
      1,
    );
  });

  it("removes the redundant travel without back-extending when a bound sits inside the freed span", () => {
    const first = makePlanner("gym-first", {
      locationId: GYM,
      priority: 7,
    });

    // Calibrate: place the first task alone to learn where its return leg
    // ends, then bound the second task a few minutes after that — inside the
    // absorb search window, but with the freed span lying before the bound.
    const solo = runWithTravel([first]);
    const soloFirst = findEvent(solo.events, "gym-first");
    const legEnd = new Date(
      new Date(soloFirst.end).getTime() + TRAVEL_MINUTES * 60000,
    );
    const earliest = new Date(legEnd.getTime() + 5 * 60000);

    const second = makePlanner("gym-second", {
      locationId: GYM,
      priority: 2,
      earliestStartDate: earliest.toISOString(),
    });

    const { events, travelEvents } = runWithTravel([first, second]);

    const placedFirst = findEvent(events, "gym-first");
    const placedSecond = findEvent(events, "gym-second");

    // The earliest-start bound is respected: no back-extension into the
    // freed travel span (which would start before the bound).
    expect(new Date(placedSecond.start).getTime()).toBeGreaterThanOrEqual(
      earliest.getTime(),
    );
    expect(new Date(placedSecond.start).getTime()).toBeGreaterThan(
      new Date(placedFirst.end).getTime(),
    );

    // The first task's return leg is still removed: one outbound to the gym
    // (before the first task), one return home (after the second).
    expect(travelEvents.filter((t) => t.toLocationId === GYM)).toHaveLength(1);
    expect(travelEvents.filter((t) => t.fromLocationId === GYM)).toHaveLength(
      1,
    );
  });
});
