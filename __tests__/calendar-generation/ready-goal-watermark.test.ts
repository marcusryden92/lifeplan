import * as fs from "fs";
import * as path from "path";
import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import type {
  Planner,
  SimpleEvent,
  EventTemplate,
  Category,
} from "@/types/prisma";

// A ready root goal enters the candidate list carrying its subtree-aggregate
// duration (here 1800 min). The proactive expansion watermark used to compare
// that aggregate against the largest available slot — which can never fit it —
// so every loop iteration expanded the horizon and the placement walk never
// ran: zero events, zero failures, SCHEDULED_OK, and the sync then deleted
// every previously placed event. Goal candidates must size as their largest
// uncompleted leaf, and an exhausted expansion budget must surface failures.

const ROOT_GOAL_ID = "ce1a7c26-986e-478d-8fdf-8be5bc0ac68b";

const FIXTURE = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "fixtures/completed-task-fixture.json"),
    "utf8",
  ),
) as {
  planner: Planner[];
  calendar: SimpleEvent[];
  templates: (Omit<EventTemplate, "startDay"> & { startDay: string })[];
  categories: Category[];
};

const WEEKDAY_INT: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};
const templates = FIXTURE.templates.map((t) => ({
  ...t,
  startDay: WEEKDAY_INT[t.startDay],
})) as unknown as EventTemplate[];

let consoleSpies: jest.SpyInstance[] = [];

describe("ready root goal does not starve the scheduler", () => {
  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ["queueMicrotask"] });
    jest.setSystemTime(new Date("2026-07-03T12:45:00.000Z"));
    consoleSpies = [
      jest.spyOn(console, "log").mockImplementation(() => {}),
      jest.spyOn(console, "warn").mockImplementation(() => {}),
      jest.spyOn(console, "info").mockImplementation(() => {}),
    ];
  });
  afterAll(() => {
    consoleSpies.forEach((s) => s.mockRestore());
    jest.useRealTimers();
  });

  it("schedules every leaf of a ready goal whose aggregate duration exceeds any slot", () => {
    const planner = FIXTURE.planner.map((p) =>
      p.id === ROOT_GOAL_ID
        ? { ...p, isReady: true, deadline: "2026-08-09T10:08:00.000Z" }
        : p,
    );
    const rootGoal = planner.find((p) => p.id === ROOT_GOAL_ID)!;
    // The premise of the regression: the aggregate is unschedulable as a block.
    expect(rootGoal.duration).toBeGreaterThan(24 * 60);

    const subtreeTasks = planner.filter((p) => p.plannerType === "task");

    const { events } = generateCalendar("1", 1, templates, planner, [], {
      bufferTimeMinutes: 10,
      categories: FIXTURE.categories,
      previousEngineMessages: [],
    });

    const placed = subtreeTasks.filter((t) =>
      events.some((e) => e.id === t.id),
    );
    expect(placed.length).toBe(subtreeTasks.length);
  });
});
