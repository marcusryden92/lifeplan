import {
  countWindowChanges,
  diffDraftWindows,
  groupWindowsByCategory,
} from "@/components/draft/AIDraftModal/diffDraftWindows";
import type {
  DraftTimeWindow,
  DraftWindowsState,
} from "@/components/draft/AIDraftModal/draftWindows";

function window(overrides: Partial<DraftTimeWindow> = {}): DraftTimeWindow {
  return {
    id: "win-1",
    categoryId: "category-work",
    day: 1,
    startTime: "09:00",
    endTime: "17:00",
    ...overrides,
  };
}

const CANONICAL: DraftWindowsState = {
  windows: [window(), window({ id: "win-2", day: 2 })],
  settings: [
    { id: "category-work", useTimeWindows: true, isStrict: false },
    { id: "category-gym", useTimeWindows: false, isStrict: false },
  ],
};

describe("diffDraftWindows", () => {
  it("assigns statuses, changedFields, and changedFlags", () => {
    const working: DraftWindowsState = {
      windows: [
        window({ endTime: "16:00" }),
        window({ id: "win-3", day: 4, categoryId: "category-gym" }),
      ],
      settings: [
        { id: "category-work", useTimeWindows: true, isStrict: true },
        { id: "category-gym", useTimeWindows: true, isStrict: false },
      ],
    };
    const diffed = diffDraftWindows(working, CANONICAL);

    expect(diffed.windows.map((w) => [w.id, w.status])).toEqual([
      ["win-1", "modified"],
      ["win-3", "added"],
      ["win-2", "deleted"],
    ]);
    expect(diffed.windows[0].changedFields).toEqual(["endTime"]);
    expect(
      diffed.settings.find((s) => s.id === "category-work")?.changedFlags,
    ).toEqual(["isStrict"]);
    expect(
      diffed.settings.find((s) => s.id === "category-gym")?.changedFlags,
    ).toEqual(["useTimeWindows"]);
    expect(countWindowChanges(diffed)).toBe(5);
  });

  it("counts zero for identical states", () => {
    const diffed = diffDraftWindows(CANONICAL, CANONICAL);
    expect(countWindowChanges(diffed)).toBe(0);
  });
});

describe("groupWindowsByCategory", () => {
  it("orders by the given category order, sorts rows Monday-first, and omits empty groups", () => {
    const working: DraftWindowsState = {
      windows: [
        window({ id: "win-sun", day: 0, startTime: "10:00" }),
        window({ id: "win-mon-late", day: 1, startTime: "12:00" }),
        window(),
      ],
      settings: CANONICAL.settings,
    };
    const diffed = diffDraftWindows(working, {
      windows: working.windows,
      settings: CANONICAL.settings,
    });
    const groups = groupWindowsByCategory(diffed, [
      "category-gym",
      "category-work",
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].categoryId).toBe("category-work");
    expect(groups[0].rows.map((w) => w.id)).toEqual([
      "win-1",
      "win-mon-late",
      "win-sun",
    ]);
  });

  it("keeps a windowless category visible when its flags changed", () => {
    const working: DraftWindowsState = {
      windows: [],
      settings: [
        { id: "category-work", useTimeWindows: true, isStrict: false },
        { id: "category-gym", useTimeWindows: true, isStrict: false },
      ],
    };
    const diffed = diffDraftWindows(
      working,
      { windows: [], settings: CANONICAL.settings },
    );
    const groups = groupWindowsByCategory(diffed, [
      "category-work",
      "category-gym",
    ]);
    expect(groups.map((g) => g.categoryId)).toEqual(["category-gym"]);
  });
});
