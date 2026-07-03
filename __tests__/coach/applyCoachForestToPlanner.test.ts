import type { Planner } from "@/types/prisma";
import { applyCoachForestToPlanner } from "@/components/coach/AICoachModal/applyCoachForestToPlanner";
import { plannerForestToJson } from "@/components/coach/AICoachModal/plannerForestToJson";
import type { CoachNode } from "@/components/coach/AICoachModal/plannerTreeToJson";

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
    dependency: null,
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

// Two goals with leaf chains threaded through the bottom layer
// (a1 -> a2 -> b1 -> b2 -> goal-c), one childless loose task at top level,
// and one untriaged Capture jot that the forest must ignore.
function makePlanner(): Planner[] {
  return [
    row({ id: "goal-a", plannerType: "goal", categoryId: "cat-1" }),
    row({ id: "a1", parentId: "goal-a", dependency: null }),
    row({ id: "a2", parentId: "goal-a", dependency: "a1" }),
    row({ id: "goal-b", plannerType: "goal" }),
    row({ id: "b1", parentId: "goal-b", dependency: "a2" }),
    row({ id: "b2", parentId: "goal-b", dependency: "b1" }),
    row({ id: "goal-c", plannerType: "task", dependency: "b2" }),
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

describe("applyCoachForestToPlanner", () => {
  it("returns unchanged rows by reference when the forest is untouched", () => {
    const planner = makePlanner();
    const workingForest = plannerForestToJson(planner);

    const result = applyCoachForestToPlanner({
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

    const result = applyCoachForestToPlanner({
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
    const newGoal: CoachNode = {
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

    const result = applyCoachForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result).toHaveLength(planner.length + 4);
    const root = result.find((p) => p.title === "Learn violin")!;
    expect(root.parentId).toBeNull();
    expect(root.dependency).toBeNull();
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
    // Internal chain from a null cursor: first leaf has no dep; the
    // intermediate node records the cursor at visit time (the previous
    // leaf), and the next leaf chains onto that same previous leaf.
    expect(buy.dependency).toBeNull();
    expect(basics.dependency).toBe(buy.id);
    expect(lesson.dependency).toBe(buy.id);
    // Children inherit the root's category.
    expect(buy.categoryId).toBe("cat-2");
    expect(lesson.categoryId).toBe("cat-2");
  });

  it("only readies a new goal that has both subtasks and a deadline", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    const child: CoachNode = {
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

    const result = applyCoachForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result.find((p) => p.title === "no deadline")!.isReady).toBe(false);
    expect(result.find((p) => p.title === "fully gated")!.isReady).toBe(true);
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

    const result = applyCoachForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result.find((p) => p.title === "Dentist")!.plannerType).toBe(
      "task",
    );
  });

  it("deletes a removed goal's subtree and bridges the outer chain", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    workingForest.goals = workingForest.goals.filter(
      (g) => g.id !== "goal-b",
    );

    const result = applyCoachForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result.find((p) => p.id === "goal-b")).toBeUndefined();
    expect(result.find((p) => p.id === "b1")).toBeUndefined();
    expect(result.find((p) => p.id === "b2")).toBeUndefined();
    // goal-c depended on b2 (B's last leaf); it bridges to a2, which b1
    // (B's first leaf) depended on.
    expect(byId(result, "goal-c").dependency).toBe("a2");
    // No dependency may point at a removed row.
    const ids = new Set(result.map((p) => p.id));
    for (const p of result) {
      if (p.dependency) expect(ids.has(p.dependency)).toBe(true);
    }
  });

  it("applies a valid root categoryId and rejects an unknown one", () => {
    const planner = makePlanner();

    const validForest = clone(plannerForestToJson(planner));
    validForest.goals.find((g) => g.id === "goal-a")!.categoryId = "cat-2";
    const validResult = applyCoachForestToPlanner({
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
    const bogusResult = applyCoachForestToPlanner({
      planner,
      workingForest: bogusForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });
    expect(byId(bogusResult, "goal-a").categoryId).toBe("cat-1");
  });

  it("repoints the outer neighbor when a retained goal's last leaf changes", () => {
    const planner = makePlanner();
    const workingForest = clone(plannerForestToJson(planner));
    const goalA = workingForest.goals.find((g) => g.id === "goal-a")!;
    goalA.children = goalA.children.filter((c) => c.id !== "a2");

    const result = applyCoachForestToPlanner({
      planner,
      workingForest,
      userId: USER_ID,
      validCategoryIds: VALID_CATEGORY_IDS,
    });

    expect(result.find((p) => p.id === "a2")).toBeUndefined();
    // b1 pointed at a2 (A's old last leaf); A's new last leaf is a1.
    expect(byId(result, "b1").dependency).toBe("a1");
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

    const result = applyCoachForestToPlanner({
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
