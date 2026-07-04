import {
  addDraftTimeWindows,
  deleteDraftTimeWindows,
  updateDraftCategorySettings,
  updateDraftTimeWindows,
} from "@/components/draft/AIDraftModal/draftWindowOps";
import {
  draftWindowsStateEqual,
  findWindowOverlaps,
  normalizeDraftWindowsState,
  type DraftCategorySettings,
  type DraftTimeWindow,
  type DraftWindowsState,
} from "@/components/draft/AIDraftModal/draftWindows";

const CATEGORY_WORK = "category-work";
const CATEGORY_GYM = "category-gym";
const VALID_CATEGORIES = new Set([CATEGORY_WORK, CATEGORY_GYM]);

function window(overrides: Partial<DraftTimeWindow> = {}): DraftTimeWindow {
  return {
    id: "win-1",
    categoryId: CATEGORY_WORK,
    day: 1,
    startTime: "09:00",
    endTime: "17:00",
    ...overrides,
  };
}

function settings(
  overrides: Partial<DraftCategorySettings> = {},
): DraftCategorySettings {
  return {
    id: CATEGORY_WORK,
    useTimeWindows: true,
    isStrict: false,
    ...overrides,
  };
}

function state(overrides: Partial<DraftWindowsState> = {}): DraftWindowsState {
  return {
    windows: [window()],
    settings: [
      settings(),
      settings({ id: CATEGORY_GYM, useTimeWindows: false }),
    ],
    ...overrides,
  };
}

describe("addDraftTimeWindows", () => {
  it("mints fresh ids and discards model-supplied ones", () => {
    const result = addDraftTimeWindows(
      state(),
      [
        {
          id: "model-made-this-up",
          categoryId: CATEGORY_WORK,
          day: 2,
          startTime: "08:00",
          endTime: "12:00",
        },
      ],
      VALID_CATEGORIES,
    );
    expect(result.failures).toHaveLength(0);
    expect(result.changed).toBe(true);
    expect(result.state.windows).toHaveLength(2);
    expect(result.state.windows[1].id).not.toBe("model-made-this-up");
    expect(result.state.windows[1].id.length).toBeGreaterThan(0);
    expect(result.autoEnabledCategoryIds).toHaveLength(0);
  });

  it("auto-enables useTimeWindows on the target category and reports it", () => {
    const result = addDraftTimeWindows(
      state(),
      [{ categoryId: CATEGORY_GYM, day: 3, startTime: "18:00", endTime: "20:00" }],
      VALID_CATEGORIES,
    );
    const gym = result.state.settings.find((s) => s.id === CATEGORY_GYM);
    expect(gym?.useTimeWindows).toBe(true);
    expect(result.autoEnabledCategoryIds).toEqual([CATEGORY_GYM]);
  });

  it("collects per-row validation failures without dropping valid rows", () => {
    const result = addDraftTimeWindows(
      state(),
      [
        { categoryId: "nope", day: 1, startTime: "09:00", endTime: "10:00" },
        { categoryId: CATEGORY_WORK, day: 7, startTime: "09:00", endTime: "10:00" },
        { categoryId: CATEGORY_WORK, day: 1, startTime: "24:00", endTime: "10:00" },
        { categoryId: CATEGORY_WORK, day: 1, startTime: "17:00", endTime: "09:00" },
        { categoryId: CATEGORY_WORK, day: 1, startTime: "09:00", endTime: "09:00" },
        { categoryId: CATEGORY_WORK, day: 5, startTime: "10:00", endTime: "23:59" },
      ],
      VALID_CATEGORIES,
    );
    expect(result.failures).toHaveLength(5);
    expect(result.state.windows).toHaveLength(2);
    expect(result.state.windows[1].endTime).toBe("23:59");
  });

  it("does not mutate the input state", () => {
    const input = state();
    addDraftTimeWindows(
      input,
      [{ categoryId: CATEGORY_GYM, day: 3, startTime: "18:00", endTime: "20:00" }],
      VALID_CATEGORIES,
    );
    expect(input).toEqual(state());
  });
});

describe("updateDraftTimeWindows", () => {
  it("applies partial patches including reparenting", () => {
    const result = updateDraftTimeWindows(
      state(),
      [{ id: "win-1", categoryId: CATEGORY_GYM, startTime: "10:00" }],
      VALID_CATEGORIES,
    );
    expect(result.failures).toHaveLength(0);
    expect(result.state.windows[0]).toMatchObject({
      categoryId: CATEGORY_GYM,
      startTime: "10:00",
      endTime: "17:00",
    });
  });

  it("validates the patched start/end pair together", () => {
    const result = updateDraftTimeWindows(
      state(),
      [{ id: "win-1", startTime: "18:00" }],
      VALID_CATEGORIES,
    );
    expect(result.failures).toHaveLength(1);
    expect(result.state.windows[0].startTime).toBe("09:00");
  });

  it("fails on unknown id and unknown categoryId", () => {
    const result = updateDraftTimeWindows(
      state(),
      [
        { id: "ghost", day: 2 },
        { id: "win-1", categoryId: "nope" },
      ],
      VALID_CATEGORIES,
    );
    expect(result.failures).toHaveLength(2);
    expect(result.state.windows[0].categoryId).toBe(CATEGORY_WORK);
  });

  it("does not mutate the input state", () => {
    const input = state();
    updateDraftTimeWindows(input, [{ id: "win-1", day: 4 }], VALID_CATEGORIES);
    expect(input.windows[0].day).toBe(1);
  });
});

describe("deleteDraftTimeWindows", () => {
  it("removes rows, dedupes ids, and reports unknown ids", () => {
    const result = deleteDraftTimeWindows(
      state({ windows: [window(), window({ id: "win-2", day: 2 })] }),
      ["win-2", "win-2", "ghost"],
    );
    expect(result.changed).toBe(true);
    expect(result.state.windows).toHaveLength(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].id).toBe("ghost");
  });
});

describe("updateDraftCategorySettings", () => {
  it("patches flags by category id", () => {
    const result = updateDraftCategorySettings(
      state(),
      [{ id: CATEGORY_WORK, isStrict: true }],
      VALID_CATEGORIES,
    );
    expect(result.failures).toHaveLength(0);
    expect(result.changed).toBe(true);
    const work = result.state.settings.find((s) => s.id === CATEGORY_WORK);
    expect(work).toMatchObject({ useTimeWindows: true, isStrict: true });
  });

  it("fails on unknown category and empty patches", () => {
    const result = updateDraftCategorySettings(
      state(),
      [{ id: "nope", isStrict: true }, { id: CATEGORY_WORK }],
      VALID_CATEGORIES,
    );
    expect(result.failures).toHaveLength(2);
    expect(result.changed).toBe(false);
  });

  it("does not mutate the input state", () => {
    const input = state();
    updateDraftCategorySettings(
      input,
      [{ id: CATEGORY_WORK, isStrict: true }],
      VALID_CATEGORIES,
    );
    expect(input.settings[0].isStrict).toBe(false);
  });
});

describe("findWindowOverlaps", () => {
  it("reports same-day intersections within and across categories", () => {
    const overlaps = findWindowOverlaps([
      window({ id: "work-sat", day: 6, startTime: "10:00", endTime: "14:00" }),
      window({
        id: "fun-sat",
        categoryId: CATEGORY_GYM,
        day: 6,
        startTime: "12:00",
        endTime: "16:00",
      }),
      window({ id: "work-sun", day: 0, startTime: "10:00", endTime: "14:00" }),
    ]);
    expect(overlaps).toHaveLength(1);
    expect([overlaps[0].a.id, overlaps[0].b.id].sort()).toEqual([
      "fun-sat",
      "work-sat",
    ]);
  });

  it("does not flag adjacent ranges (end == start) or different days", () => {
    expect(
      findWindowOverlaps([
        window({ id: "a", day: 2, startTime: "09:00", endTime: "12:00" }),
        window({ id: "b", day: 2, startTime: "12:00", endTime: "15:00" }),
        window({ id: "c", day: 3, startTime: "09:00", endTime: "12:00" }),
      ]),
    ).toHaveLength(0);
  });

  it("scopes to involved ids so pre-existing overlaps are not re-reported", () => {
    const windows = [
      window({ id: "old-1", day: 1, startTime: "09:00", endTime: "12:00" }),
      window({ id: "old-2", day: 1, startTime: "11:00", endTime: "13:00" }),
      window({ id: "new-1", day: 1, startTime: "12:30", endTime: "14:00" }),
    ];
    const scoped = findWindowOverlaps(windows, new Set(["new-1"]));
    expect(scoped).toHaveLength(1);
    expect([scoped[0].a.id, scoped[0].b.id].sort()).toEqual([
      "new-1",
      "old-2",
    ]);
    expect(findWindowOverlaps(windows)).toHaveLength(2);
  });
});

describe("draftWindowsStateEqual / normalizeDraftWindowsState", () => {
  it("is order-insensitive on both arrays", () => {
    const a = state({
      windows: [window(), window({ id: "win-2", day: 2 })],
    });
    const b = state({
      windows: [window({ id: "win-2", day: 2 }), window()],
      settings: [...state().settings].reverse(),
    });
    expect(draftWindowsStateEqual(a, b)).toBe(true);
  });

  it("detects window field, flag, and membership changes", () => {
    expect(
      draftWindowsStateEqual(
        state(),
        state({ windows: [window({ endTime: "16:00" })] }),
      ),
    ).toBe(false);
    expect(draftWindowsStateEqual(state(), state({ windows: [] }))).toBe(false);
    expect(
      draftWindowsStateEqual(
        state(),
        state({
          settings: [
            settings({ isStrict: true }),
            settings({ id: CATEGORY_GYM, useTimeWindows: false }),
          ],
        }),
      ),
    ).toBe(false);
  });

  it("drops malformed entries from SSE payloads", () => {
    const normalized = normalizeDraftWindowsState({
      windows: [
        window(),
        { id: "x", categoryId: CATEGORY_WORK, day: 1, startTime: "17:00", endTime: "09:00" },
        "not an object",
      ],
      settings: [settings(), { id: "", useTimeWindows: true, isStrict: false }],
    });
    expect(normalized?.windows).toHaveLength(1);
    expect(normalized?.settings).toHaveLength(1);
  });

  it("returns null for payloads missing either array", () => {
    expect(normalizeDraftWindowsState({ windows: [] })).toBeNull();
    expect(normalizeDraftWindowsState(null)).toBeNull();
  });
});
