import type { Planner, PlannerDependency } from "@/types/prisma";
import {
  dependencyReadyBlockers,
  readyDependents,
} from "@/utils/precedence/readinessBlockers";

const TS = "2026-07-01T00:00:00.000Z";

function makePlanner(id: string, overrides: Partial<Planner> = {}): Planner {
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
    userId: "u",
    color: null,
    locationId: null,
    useParentLocation: false,
    categoryId: null,
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
  };
}

function makeDependency(
  predecessorId: string,
  successorId: string,
): PlannerDependency {
  return {
    id: `dep-${predecessorId}-${successorId}`,
    predecessorId,
    successorId,
    userId: "u",
    createdAt: TS,
    updatedAt: TS,
  };
}

describe("dependencyReadyBlockers", () => {
  it("an unready, uncompleted goal predecessor blocks", () => {
    const planner = [
      makePlanner("goal-x", { plannerType: "goal", isReady: false }),
      makePlanner("target", { plannerType: "goal", isReady: false }),
    ];
    const blockers = dependencyReadyBlockers(
      "target",
      [makeDependency("goal-x", "target")],
      planner,
    );
    expect(blockers.map((b) => b.id)).toEqual(["goal-x"]);
  });

  it("a task predecessor never blocks", () => {
    const planner = [
      makePlanner("task-x", { isReady: false }),
      makePlanner("target", { plannerType: "goal" }),
    ];
    expect(
      dependencyReadyBlockers(
        "target",
        [makeDependency("task-x", "target")],
        planner,
      ),
    ).toEqual([]);
  });

  it("a completed goal predecessor never blocks", () => {
    const planner = [
      makePlanner("goal-x", {
        plannerType: "goal",
        isReady: false,
        completedStartTime: TS,
        completedEndTime: TS,
      }),
      makePlanner("target", { plannerType: "goal" }),
    ];
    expect(
      dependencyReadyBlockers(
        "target",
        [makeDependency("goal-x", "target")],
        planner,
      ),
    ).toEqual([]);
  });

  it("a ready goal predecessor never blocks", () => {
    const planner = [
      makePlanner("goal-x", { plannerType: "goal", isReady: true }),
      makePlanner("target", { plannerType: "goal" }),
    ];
    expect(
      dependencyReadyBlockers(
        "target",
        [makeDependency("goal-x", "target")],
        planner,
      ),
    ).toEqual([]);
  });
});

describe("readyDependents", () => {
  it("a READY goal depending on this one gates un-readying", () => {
    const planner = [
      makePlanner("target", { plannerType: "goal", isReady: true }),
      makePlanner("dependent", { plannerType: "goal", isReady: true }),
    ];
    const dependents = readyDependents(
      "target",
      [makeDependency("target", "dependent")],
      planner,
    );
    expect(dependents.map((d) => d.id)).toEqual(["dependent"]);
  });

  it("unready or completed dependents do not gate", () => {
    const planner = [
      makePlanner("target", { plannerType: "goal", isReady: true }),
      makePlanner("unready-dep", { plannerType: "goal", isReady: false }),
      makePlanner("done-dep", {
        plannerType: "goal",
        isReady: true,
        completedStartTime: TS,
        completedEndTime: TS,
      }),
      makePlanner("task-dep", { isReady: true }),
    ];
    const dependencies = [
      makeDependency("target", "unready-dep"),
      makeDependency("target", "done-dep"),
      makeDependency("target", "task-dep"),
    ];
    expect(readyDependents("target", dependencies, planner)).toEqual([]);
  });
});
