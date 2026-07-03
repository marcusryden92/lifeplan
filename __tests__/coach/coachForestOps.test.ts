import type { CoachNode } from "@/components/coach/AICoachModal/plannerTreeToJson";
import type { CoachForest } from "@/components/coach/AICoachModal/plannerForestToJson";
import {
  addCoachItems,
  deleteCoachItems,
  moveCoachItem,
  searchCoachItems,
  updateCoachItems,
} from "@/components/coach/AICoachModal/coachForestOps";

const VALID_CATEGORY_IDS: ReadonlySet<string> = new Set(["cat-1", "cat-2"]);

function node(overrides: Partial<CoachNode> & { id: string }): CoachNode {
  return {
    title: overrides.id,
    plannerType: "task",
    duration: 30,
    deadline: null,
    priority: 0,
    isReady: null,
    categoryId: null,
    children: [],
    ...overrides,
  };
}

// goal-a: a1, basics(b1, b2) — goal-b: x1
function makeForest(): CoachForest {
  return {
    goals: [
      node({
        id: "goal-a",
        title: "Learn Spanish",
        plannerType: "goal",
        categoryId: "cat-1",
        deadline: "2026-12-01",
        children: [
          node({ id: "a1", title: "Install Anki" }),
          node({
            id: "basics",
            title: "Basics",
            plannerType: "goal",
            children: [
              node({ id: "b1", title: "Learn 100 words" }),
              node({ id: "b2", title: "First lesson" }),
            ],
          }),
        ],
      }),
      node({
        id: "goal-b",
        title: "Run a marathon",
        plannerType: "goal",
        children: [node({ id: "x1", title: "Buy shoes" })],
      }),
    ],
  };
}

describe("searchCoachItems", () => {
  it("finds nested items with path and root, ranking better matches first", () => {
    const hits = searchCoachItems(makeForest(), "lesson");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      id: "b2",
      rootId: "goal-a",
      rootTitle: "Learn Spanish",
      path: "Learn Spanish > Basics > First lesson",
    });

    const ranked = searchCoachItems(makeForest(), "learn");
    expect(ranked[0].id).toBe("goal-a"); // startsWith beats includes
    expect(ranked.map((h) => h.id)).toContain("b1");
  });

  it("skips unsaved (id-less) items and blank queries", () => {
    const forest = makeForest();
    forest.goals[0].children.push(node({ id: "", title: "learn everything" }));
    expect(
      searchCoachItems(forest, "learn everything").map((h) => h.id),
    ).toEqual([]);
    expect(searchCoachItems(forest, "  ")).toEqual([]);
  });
});

describe("updateCoachItems", () => {
  it("updates fields, floors numerics, and reports the touched root", () => {
    const result = updateCoachItems(
      makeForest(),
      [{ id: "b1", title: "  Learn 200 words  ", duration: 45.9, priority: 2.7 }],
      VALID_CATEGORY_IDS,
    );
    expect(result.failures).toEqual([]);
    expect(result.updatedRootIds).toEqual(["goal-a"]);
    const b1 = result.forest.goals[0].children[1].children[0];
    expect(b1).toMatchObject({
      title: "Learn 200 words",
      duration: 45,
      priority: 2,
    });
  });

  it("rejects categoryId on non-roots and unknown categories, allows clearing on roots", () => {
    const result = updateCoachItems(
      makeForest(),
      [
        { id: "b1", categoryId: "cat-2" },
        { id: "goal-a", categoryId: "bogus" },
        { id: "goal-a", categoryId: null },
      ],
      VALID_CATEGORY_IDS,
    );
    expect(result.failures.map((f) => f.reason)).toEqual([
      "categoryId can only be set on top-level goals",
      "unknown categoryId",
    ]);
    expect(result.forest.goals[0].categoryId).toBeNull();
  });

  it("gates readying a root goal on subtasks + deadline", () => {
    const gated = updateCoachItems(
      makeForest(),
      [{ id: "goal-b", isReady: true }], // has subtask but no deadline
      VALID_CATEGORY_IDS,
    );
    expect(gated.failures).toHaveLength(1);

    const ok = updateCoachItems(
      makeForest(),
      [{ id: "goal-b", deadline: "2026-09-01", isReady: true }],
      VALID_CATEGORY_IDS,
    );
    expect(ok.failures).toEqual([]);
    expect(ok.forest.goals[1].isReady).toBe(true);
  });

  it("reports unknown ids without touching anything", () => {
    const result = updateCoachItems(
      makeForest(),
      [{ id: "nope", title: "x" }],
      VALID_CATEGORY_IDS,
    );
    expect(result.failures[0]).toMatchObject({ id: "nope" });
    expect(result.updatedRootIds).toEqual([]);
  });
});

describe("moveCoachItem", () => {
  it("reparents within the same goal at the requested position", () => {
    const result = moveCoachItem(makeForest(), {
      itemId: "a1",
      newParentId: "basics",
      afterSiblingId: "b1",
    });
    expect(result.failures).toEqual([]);
    expect(result.updatedRootIds).toEqual(["goal-a"]);
    const basics = result.forest.goals[0].children[0];
    expect(basics.id).toBe("basics");
    expect(basics.children.map((c) => c.id)).toEqual(["b1", "a1", "b2"]);
  });

  it("supports atStart and default-append", () => {
    const atStart = moveCoachItem(makeForest(), {
      itemId: "b2",
      newParentId: "goal-a",
      atStart: true,
    });
    expect(atStart.forest.goals[0].children.map((c) => c.id)).toEqual([
      "b2",
      "a1",
      "basics",
    ]);

    const append = moveCoachItem(makeForest(), {
      itemId: "b1",
      newParentId: "goal-a",
    });
    expect(append.forest.goals[0].children.map((c) => c.id)).toEqual([
      "a1",
      "basics",
      "b1",
    ]);
  });

  it("rejects cross-goal moves, cycles, and moving roots", () => {
    expect(
      moveCoachItem(makeForest(), { itemId: "a1", newParentId: "goal-b" })
        .failures[0].reason,
    ).toMatch(/cross-goal/);
    expect(
      moveCoachItem(makeForest(), { itemId: "basics", newParentId: "b1" })
        .failures[0].reason,
    ).toMatch(/own subtree/);
    expect(
      moveCoachItem(makeForest(), { itemId: "goal-a", newParentId: "goal-b" })
        .failures[0].reason,
    ).toMatch(/top-level/);
  });
});

describe("deleteCoachItems", () => {
  it("splices nested items and turns root deletions into deletedGoalIds", () => {
    const result = deleteCoachItems(makeForest(), ["b1", "goal-b"]);
    expect(result.failures).toEqual([]);
    expect(result.deletedGoalIds).toEqual(["goal-b"]);
    expect(result.updatedRootIds).toEqual(["goal-a"]);
    expect(result.forest.goals).toHaveLength(1);
    const basics = result.forest.goals[0].children[1];
    expect(basics.children.map((c) => c.id)).toEqual(["b2"]);
  });

  it("tolerates ids already removed by an earlier deletion in the same call", () => {
    const result = deleteCoachItems(makeForest(), ["basics", "b1"]);
    expect(result.forest.goals[0].children.map((c) => c.id)).toEqual(["a1"]);
    expect(result.failures[0]).toMatchObject({ id: "b1" });
  });
});

describe("addCoachItems", () => {
  it("inserts normalized, id-stripped subtrees at the requested position", () => {
    const result = addCoachItems(makeForest(), {
      parentId: "goal-a",
      items: [
        {
          id: "should-be-stripped",
          title: "Listening practice",
          plannerType: "task",
          duration: 30,
          children: [{ title: "Find a podcast", plannerType: "task", duration: 10 }],
        },
      ],
      afterSiblingId: "a1",
    });
    expect(result.failures).toEqual([]);
    const children = result.forest.goals[0].children;
    expect(children.map((c) => c.title)).toEqual([
      "Install Anki",
      "Listening practice",
      "Basics",
    ]);
    expect(children[1].id).toBe("");
    expect(children[1].children[0]).toMatchObject({
      id: "",
      title: "Find a podcast",
    });
  });

  it("rejects unknown parents and empty item lists", () => {
    expect(
      addCoachItems(makeForest(), { parentId: "nope", items: [{}] })
        .failures[0].reason,
    ).toBe("parent not found");
    expect(
      addCoachItems(makeForest(), { parentId: "goal-a", items: [] })
        .failures[0].reason,
    ).toBe("no valid items to add");
  });
});
