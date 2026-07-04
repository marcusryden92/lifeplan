import * as fs from "fs";
import * as path from "path";
import { generateCalendar } from "@/utils/calendar-generation/calendarGeneration";
import type {
  Planner,
  SimpleEvent,
  EventTemplate,
  Category,
} from "@/types/prisma";
import { PlannerType } from "@/types/prisma";

// Two invariants around previousCalendar:
//
// 1. Idempotent regen. Feeding a run's own output back as previousCalendar
//    must reproduce it exactly. Event builders used to mint a fresh
//    extendedProps.id and createdAt/updatedAt on every emit, so every regen
//    marked every event row as changed — full-table sync churn, and each
//    churn sync bumped the OCC dataVersion, which made a second open window's
//    next sync stale (its in-flight edit silently discarded).
//
// 2. Plans are never memoized. A plan whose event already ended used to be
//    preserved verbatim from previousCalendar, so dragging it updated
//    planner.starts while the calendar kept rendering the stale copy.

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

const OPTIONS = {
  bufferTimeMinutes: 10,
  categories: FIXTURE.categories,
  previousEngineMessages: [],
};

let consoleSpies: jest.SpyInstance[] = [];

describe("regen stability against previousCalendar", () => {
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

  it("re-running with its own output as previousCalendar is a no-op", () => {
    const first = generateCalendar(
      "1",
      1,
      templates,
      FIXTURE.planner,
      [],
      OPTIONS,
    );
    const second = generateCalendar(
      "1",
      1,
      templates,
      FIXTURE.planner,
      first.events,
      OPTIONS,
    );

    const byId = (events: SimpleEvent[]) =>
      [...events].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId(second.events)).toEqual(byId(first.events));
  });

  it("honors a starts change on a plan whose previous event already ended", () => {
    const plan: Planner = {
      ...FIXTURE.planner[0],
      id: "test-plan-id",
      title: "Test plan",
      parentId: null,
      plannerType: PlannerType.plan,
      isReady: true,
      duration: 60,
      deadline: null,
      starts: "2026-07-02T08:00:00.000Z",
      sortOrder: 0,
      completedStartTime: null,
      completedEndTime: null,
      locationId: null,
      useParentLocation: false,
      categoryId: null,
    };

    const planner = [...FIXTURE.planner, plan];
    const first = generateCalendar("1", 1, templates, planner, [], OPTIONS);
    const firstPlanEvent = first.events.find((e) => e.id === plan.id);
    expect(firstPlanEvent?.start).toBe("2026-07-02T08:00:00.000Z");

    // Simulate the drag: starts moves to tomorrow while the old event (which
    // ended yesterday) is still in previousCalendar.
    const draggedStarts = "2026-07-04T08:00:00.000Z";
    const draggedPlanner = planner.map((p) =>
      p.id === plan.id ? { ...p, starts: draggedStarts } : p,
    );
    const second = generateCalendar(
      "1",
      1,
      templates,
      draggedPlanner,
      first.events,
      OPTIONS,
    );

    const planEvents = second.events.filter((e) => e.id === plan.id);
    expect(planEvents).toHaveLength(1);
    expect(planEvents[0].start).toBe(draggedStarts);
  });
});
