import type { Planner } from "@/types/prisma";
import {
  canLinkAsDetour,
  wouldCreateDetourCycle,
  isValidDetourTarget,
} from "@/utils/precedence/detourLinks";
import { prunePlannerDetours } from "@/utils/precedence/prunePrecedenceInputs";
import { getScheduledLeafSequence } from "@/utils/goalPageHandlers";

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

describe("getScheduledLeafSequence", () => {
  it("splices a linked target's leaves at the placeholder position", () => {
    const planner = [
      makePlanner("host", { plannerType: "goal" }),
      makePlanner("a", { parentId: "host", sortOrder: 1024 }),
      makePlanner("ph", { parentId: "host", sortOrder: 2048, linkedItemId: "t" }),
      makePlanner("b", { parentId: "host", sortOrder: 3072 }),
      makePlanner("t", { plannerType: "goal" }),
      makePlanner("t1", { parentId: "t", sortOrder: 1024 }),
      makePlanner("t2", { parentId: "t", sortOrder: 2048 }),
    ];
    expect(getScheduledLeafSequence(planner, "host").map((p) => p.id)).toEqual([
      "a",
      "t1",
      "t2",
      "b",
    ]);
    // The placeholder itself is never emitted.
    expect(getScheduledLeafSequence(planner, "host").map((p) => p.id)).not.toContain(
      "ph",
    );
  });

  it("cycle-guards a detour that links back to an ancestor host", () => {
    const planner = [
      makePlanner("h", { plannerType: "goal" }),
      makePlanner("hp", { parentId: "h", sortOrder: 1024, linkedItemId: "g" }),
      makePlanner("g", { plannerType: "goal" }),
      makePlanner("gp", { parentId: "g", sortOrder: 1024, linkedItemId: "h" }),
    ];
    // No infinite loop; the revisit is skipped defensively.
    expect(() => getScheduledLeafSequence(planner, "h")).not.toThrow();
  });

  it("treats a dangling link (missing target) as a no-op", () => {
    const planner = [
      makePlanner("host", { plannerType: "goal" }),
      makePlanner("a", { parentId: "host", sortOrder: 1024 }),
      makePlanner("ph", { parentId: "host", sortOrder: 2048, linkedItemId: "gone" }),
    ];
    expect(getScheduledLeafSequence(planner, "host").map((p) => p.id)).toEqual([
      "a",
    ]);
  });
});

describe("canLinkAsDetour", () => {
  const base = () => [
    makePlanner("host", { plannerType: "goal" }),
    makePlanner("ph", { parentId: "host", sortOrder: 1024 }),
    makePlanner("target", { plannerType: "goal" }),
  ];

  it("accepts a valid triaged root target", () => {
    expect(canLinkAsDetour(base(), "ph", "target").ok).toBe(true);
  });

  it("rejects linking a subtask to its own root (self)", () => {
    expect(canLinkAsDetour(base(), "ph", "host")).toEqual({
      ok: false,
      reason: "self",
    });
  });

  it("rejects a non-root or untriaged target", () => {
    const planner = [
      ...base(),
      makePlanner("nested", { parentId: "target", sortOrder: 1024 }),
    ];
    expect(canLinkAsDetour(planner, "ph", "nested").reason).toBe(
      "invalid-target",
    );
  });

  it("rejects a link that would close a detour cycle", () => {
    // target already splices host (target's placeholder -> host).
    const planner = [
      makePlanner("host", { plannerType: "goal" }),
      makePlanner("ph", { parentId: "host", sortOrder: 1024 }),
      makePlanner("target", { plannerType: "goal" }),
      makePlanner("tp", { parentId: "target", sortOrder: 1024, linkedItemId: "host" }),
    ];
    expect(wouldCreateDetourCycle(planner, "ph", "target")).toBe(true);
    expect(canLinkAsDetour(planner, "ph", "target").reason).toBe("cycle");
  });

  it("isValidDetourTarget gates on root + triaged + non-plan", () => {
    expect(isValidDetourTarget(makePlanner("x", { plannerType: "goal" }))).toBe(
      true,
    );
    expect(isValidDetourTarget(makePlanner("x", { plannerType: "plan" }))).toBe(
      false,
    );
    expect(
      isValidDetourTarget(makePlanner("x", { parentId: "y" })),
    ).toBe(false);
    expect(isValidDetourTarget(makePlanner("x", { isTriaged: false }))).toBe(
      false,
    );
  });
});

describe("prunePlannerDetours", () => {
  it("clears a link whose target no longer resolves to a valid root", () => {
    const planner = [
      makePlanner("host", { plannerType: "goal" }),
      makePlanner("ph", { parentId: "host", sortOrder: 1024, linkedItemId: "gone" }),
    ];
    const pruned = prunePlannerDetours(planner);
    expect(pruned.find((p) => p.id === "ph")!.linkedItemId).toBeNull();
  });

  it("clears a link whose target was nested (no longer a root)", () => {
    const planner = [
      makePlanner("host", { plannerType: "goal" }),
      makePlanner("ph", { parentId: "host", sortOrder: 1024, linkedItemId: "t" }),
      makePlanner("t", { parentId: "other" }),
      makePlanner("other", { plannerType: "goal" }),
    ];
    const pruned = prunePlannerDetours(planner);
    expect(pruned.find((p) => p.id === "ph")!.linkedItemId).toBeNull();
  });

  it("is identity-preserving when every link is valid", () => {
    const planner = [
      makePlanner("host", { plannerType: "goal" }),
      makePlanner("ph", { parentId: "host", sortOrder: 1024, linkedItemId: "t" }),
      makePlanner("t", { plannerType: "goal" }),
    ];
    expect(prunePlannerDetours(planner)).toBe(planner);
  });
});
