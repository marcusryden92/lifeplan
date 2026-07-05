import type { Planner } from "@/types/prisma";
import { applyDraftForestToPlanner } from "@/components/draft/AIDraftModal/applyDraftForestToPlanner";
import { plannerForestToJson } from "@/components/draft/AIDraftModal/plannerForestToJson";
import type { DraftNode } from "@/components/draft/AIDraftModal/plannerTreeToJson";

const USER_ID = "test-user";
const TS = "2026-01-01T00:00:00.000Z";
const VALID_CATEGORY_IDS: ReadonlySet<string> = new Set(["cat-1", "cat-2"]);

function row(overrides: Partial<Planner> & { id: string }): Planner {
  return {
    title: overrides.id,
    parentId: null,
    plannerType: "task",
    isReady: null,
    isTriaged: true,
    duration: 30,
    deadline: null,
    starts: null,
    sortOrder: 0,
    completedStartTime: null,
    completedEndTime: null,
    priority: 0,
    userId: USER_ID,
    color: null,
    locationId: null,
    useParentLocation: false,
    categoryId: null,
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
  };
}

// Two goals with sortOrder-keyed children, one childless loose task at top
// level, and one untriaged Capture jot that the forest must ignore.
function makePlanner(): Planner[] {
  return [
    row({ id: "goal-a", plannerType: "goal", categoryId: "cat-1" }),
    row({ id: "a1", parentId: "goal-a", sortOrder: 1024 }),
    row({ id: "a2", parentId: "goal-a", sortOrder: 2048 }),
    row({ id: "goal-b", plannerType: "goal" }),
    row({ id: "b1", parentId: "goal-b", sortOrder: 1024 }),
    row({ id: "b2", parentId: "goal-b", sortOrder: 2048 }),
    row({ id: "goal-c", plannerType: "task" }),
    row({ id: "inbox-1", isTriaged: false }),
  ];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function byId(planner: Planner[], id: string): Planner {
  const found = planner.find((p) => p.id === id);
  if (!found) throw new Error(`row ${id} missing`);
  return found;
}

describe("applyDraftForestToPlanner", () => {
  it("returns unchanged rows by reference when the forest is untouched", () => {
    const planner = makePlanner();
    const workingForest = plannerForestToJson(planner);

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result).toHaveLength(planner.length);
    for (const original of planner) {
      expect(byId(result, original.id)).toBe(original);
    }
  });

  it("preserves retained UUIDs and leaves untouched goals alone", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    const goalA = workingForest.goals.find((g) => g.id === "goal-a")!;
    goalA.children.find((c) => c.id === "a1")!.title = "renamed a1";

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(byId(result, "a1").title).toBe("renamed a1");
    expect(byId(result, "a2").id).toBe("a2");
    // Untouched goal B rows keep their exact references — no updatedAt churn.
    expect(byId(result, "goal-b")).toBe(byId(planner, "goal-b"));
    expect(byId(result, "b1")).toBe(byId(planner, "b1"));
    // The untriaged inbox row passes through untouched.
    expect(byId(result, "inbox-1")).toBe(byId(planner, "inbox-1"));
  });

  it("creates a new root with top-level defaults and internal threading", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    const newGoal: DraftNode = {
      id: "",
      title: "Learn violin",
      plannerType: "goal",
      duration: 0,
      deadline: "2026-06-01",
      priority: 3,
      isReady: null,
      categoryId: "cat-2",
      children: [
        {
          id: "",
          title: "Buy violin",
          plannerType: "task",
          duration: 60,
          deadline: null,
          priority: 3,
          isReady: null,
          categoryId: null,
          children: [],
        },
        {
          id: "",
          title: "Basics",
          plannerType: "goal",
          duration: 0,
          deadline: null,
          priority: 3,
          isReady: null,
          categoryId: null,
          children: [
            {
              id: "",
              title: "First lesson",
              plannerType: "task",
              duration: 45,
              deadline: null,
              priority: 3,
              isReady: null,
              categoryId: null,
              children: [],
            },
          ],
        },
      ],
    };
    workingForest.goals.push(newGoal);

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result).toHaveLength(planner.length + 4);
    const root = result.find((p) => p.title === "Learn violin")!;
    expect(root.parentId).toBeNull();
    expect(root.sortOrder).toBe(0);
    expect(root.isTriaged).toBe(true);
    expect(root.isReady).toBe(false);
    expect(root.categoryId).toBe("cat-2");
    expect(root.plannerType).toBe("goal");
    expect(root.duration).toBe(1);

    const buy = result.find((p) => p.title === "Buy violin")!;
    const basics = result.find((p) => p.title === "Basics")!;
    const lesson = result.find((p) => p.title === "First lesson")!;
    expect(buy.parentId).toBe(root.id);
    expect(basics.parentId).toBe(root.id);
    expect(lesson.parentId).toBe(basics.id);
    // Sibling sortOrder is stamped from array position at each level.
    expect(buy.sortOrder).toBe(1024);
    expect(basics.sortOrder).toBe(2048);
    expect(lesson.sortOrder).toBe(1024);
    // Children inherit the root's category.
    expect(buy.categoryId).toBe("cat-2");
    expect(lesson.categoryId).toBe("cat-2");
    // New subtasks are NOT ready by default — readying is a user decision,
    // and the whole subtree carries the root's value.
    expect(buy.isReady).toBe(false);
    expect(lesson.isReady).toBe(false);
  });

  it("only readies a new goal that has both subtasks and a deadline", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    const child: DraftNode = {
      id: "",
      title: "step",
      plannerType: "task",
      duration: 15,
      deadline: null,
      priority: 0,
      isReady: null,
      categoryId: null,
      children: [],
    };
    workingForest.goals.push(
      {
        id: "",
        title: "no deadline",
        plannerType: "goal",
        duration: 0,
        deadline: null,
        priority: 0,
        isReady: true,
        categoryId: null,
        children: [clone(child)],
      },
      {
        id: "",
        title: "fully gated",
        plannerType: "goal",
        duration: 0,
        deadline: "2026-08-01",
        priority: 0,
        isReady: true,
        categoryId: null,
        children: [clone(child)],
      },
    );

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result.find((p) => p.title === "no deadline")!.isReady).toBe(false);
    expect(result.find((p) => p.title === "fully gated")!.isReady).toBe(true);

    // Readiness cascades: every row in a subtree carries the root's value.
    const gatedRoot = result.find((p) => p.title === "fully gated")!;
    const gatedChild = result.find(
      (p) => p.title === "step" && p.parentId === gatedRoot.id,
    )!;
    expect(gatedChild.isReady).toBe(true);
    const ungatedRoot = result.find((p) => p.title === "no deadline")!;
    const ungatedChild = result.find(
      (p) => p.title === "step" && p.parentId === ungatedRoot.id,
    )!;
    expect(ungatedChild.isReady).toBe(false);
  });

  it("cascades a retained root's ready state to restructured descendants", () => {
    const planner = makePlanner().map((p) =>
      p.id === "goal-a" || p.id === "a1" || p.id === "a2"
        ? { ...p, isReady: true, deadline: "2026-08-01" }
        : p,
    );
    const workingForest = clone(plannerForestToJson(planner));
    const goalA = workingForest.goals.find((g) => g.id === "goal-a")!;
    goalA.children.push({
      id: "",
      title: "new step",
      plannerType: "task",
      duration: 20,
      deadline: null,
      priority: 0,
      isReady: null,
      categoryId: null,
      children: [],
    });

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    const added = result.find((p) => p.title === "new step")!;
    expect(added.parentId).toBe("goal-a");
    expect(added.isReady).toBe(true);
    expect(byId(result, "a1").isReady).toBe(true);
  });

  it("coerces a new top-level plan to a non-plan type", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    workingForest.goals.push({
      id: "",
      title: "Dentist",
      plannerType: "plan",
      duration: 30,
      deadline: null,
      priority: 0,
      isReady: null,
      categoryId: null,
      children: [],
    });

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result.find((p) => p.title === "Dentist")!.plannerType).toBe(
      "task",
    );
  });

  it("converts a top-level plan to a task while preserving its start time", () => {
    const planner = [
      ...makePlanner(),
      row({ id: "plan-1", plannerType: "plan", starts: TS }),
    ];
    const workingForest = clone(plannerForestToJson(planner));
    const plan = workingForest.goals.find((g) => g.id === "plan-1")!;
    plan.plannerType = "task";

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    const converted = byId(result, "plan-1");
    expect(converted.plannerType).toBe("task");
    expect(converted.starts).toBe(TS);
  });

  it("keeps an unchanged top-level plan a plan when a sibling goal changes", () => {
    const planner = [
      ...makePlanner(),
      row({ id: "plan-1", plannerType: "plan", starts: TS }),
    ];
    const workingForest = clone(plannerForestToJson(planner));
    // Touch a different goal so the plan round-trips through apply unchanged.
    workingForest.goals.find((g) => g.id === "goal-a")!.title = "renamed";

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(byId(result, "plan-1").plannerType).toBe("plan");
  });

  it("promotes a top-level task to a goal once it gains a subtask", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    const loose = workingForest.goals.find((g) => g.id === "goal-c")!;
    loose.plannerType = "goal";
    loose.children.push({
      id: "",
      title: "first step",
      plannerType: "task",
      duration: 15,
      deadline: null,
      priority: 0,
      isReady: null,
      categoryId: null,
      children: [],
    });

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(byId(result, "goal-c").plannerType).toBe("goal");
    expect(result.find((p) => p.title === "first step")!.parentId).toBe(
      "goal-c",
    );
  });

  it("deletes a removed goal's whole subtree and leaves the rest untouched", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    workingForest.goals = workingForest.goals.filter(
      (g) => g.id !== "goal-b",
    );

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result.find((p) => p.id === "goal-b")).toBeUndefined();
    expect(result.find((p) => p.id === "b1")).toBeUndefined();
    expect(result.find((p) => p.id === "b2")).toBeUndefined();
    // Order is a local property now — no neighboring row is touched by a
    // subtree deletion.
    expect(byId(result, "goal-c")).toBe(byId(planner, "goal-c"));
    expect(byId(result, "goal-a")).toBe(byId(planner, "goal-a"));
  });

  it("applies a valid root categoryId and rejects an unknown one", () => {
    const planner = makePlanner();

    const validForest = clone(plannerForestToJson(planner));
    validForest.goals.find((g) => g.id === "goal-a")!.categoryId = "cat-2";
    const validResult = applyDraftForestToPlanner({
      planner,
      workingForest: validForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });
    expect(byId(validResult, "goal-a").categoryId).toBe("cat-2");

    const bogusForest = clone(plannerForestToJson(planner));
    const bogusGoal = bogusForest.goals.find((g) => g.id === "goal-a")!;
    bogusGoal.categoryId = "not-a-category";
    bogusGoal.title = "forces apply";
    const bogusResult = applyDraftForestToPlanner({
      planner,
      workingForest: bogusForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });
    expect(byId(bogusResult, "goal-a").categoryId).toBe("cat-1");
  });

  it("removes a leaf from a retained goal without touching other goals", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    const goalA = workingForest.goals.find((g) => g.id === "goal-a")!;
    goalA.children = goalA.children.filter((c) => c.id !== "a2");

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result.find((p) => p.id === "a2")).toBeUndefined();
    expect(byId(result, "a1").id).toBe("a1");
    // Goal B is untouched by goal A's restructure.
    expect(byId(result, "b1")).toBe(byId(planner, "b1"));
  });

  it("applies a draft goal with route-minted ids as a new root with fresh ids and clean keys", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    // Draft ids as minted by the route at propose/add time: unknown to the
    // planner array. Save must re-mint every id and derive parentId +
    // sortOrder from the tree shape alone.
    workingForest.goals.push({
      id: "draft-root",
      title: "Draft goal",
      plannerType: "goal",
      duration: 0,
      deadline: null,
      priority: 0,
      isReady: null,
      categoryId: null,
      children: [
        {
          id: "draft-child-1",
          title: "first step",
          plannerType: "task",
          duration: 30,
          deadline: null,
          priority: 0,
          isReady: null,
          categoryId: null,
          children: [],
        },
        {
          id: "draft-child-2",
          title: "second step",
          plannerType: "task",
          duration: 30,
          deadline: null,
          priority: 0,
          isReady: null,
          categoryId: null,
          children: [],
        },
      ],
    });

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    // No draft id survives into the planner array — not as a row id, not as
    // a parentId.
    const draftIds = new Set(["draft-root", "draft-child-1", "draft-child-2"]);
    for (const p of result) {
      expect(draftIds.has(p.id)).toBe(false);
      if (p.parentId) expect(draftIds.has(p.parentId)).toBe(false);
    }

    const root = result.find((p) => p.title === "Draft goal")!;
    const first = result.find((p) => p.title === "first step")!;
    const second = result.find((p) => p.title === "second step")!;
    expect(root.parentId).toBeNull();
    expect(root.sortOrder).toBe(0);
    expect(first.parentId).toBe(root.id);
    expect(second.parentId).toBe(root.id);
    expect(first.sortOrder).toBe(1024);
    expect(second.sortOrder).toBe(2048);
  });

  it("treats a goal whose id matches a nested row as a brand-new goal", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    // Out-of-contract: the model "promotes" subtask a1 to top level while
    // goal A still contains it. The promoted copy must get a fresh id.
    workingForest.goals.push({
      id: "a1",
      title: "promoted a1",
      plannerType: "task",
      duration: 30,
      deadline: null,
      priority: 0,
      isReady: null,
      categoryId: null,
      children: [],
    });

    const result = applyDraftForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    const promoted = result.find((p) => p.title === "promoted a1")!;
    expect(promoted.id).not.toBe("a1");
    expect(promoted.parentId).toBeNull();
    // The original a1 stays where it was.
    expect(byId(result, "a1").parentId).toBe("goal-a");
  });
});
