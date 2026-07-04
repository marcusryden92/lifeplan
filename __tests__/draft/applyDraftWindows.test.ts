import { applyDraftWindows } from "@/components/draft/AIDraftModal/applyDraftWindows";
import {
  categoriesToDraftWindows,
  type DraftWindowsState,
} from "@/components/draft/AIDraftModal/draftWindows";
import type { Category, CategoryTimeWindow } from "@/types/prisma";
import type { WeekDayIntegers } from "@/types/calendarTypes";

const USER_ID = "user-1";
const NOW = "2026-07-04T12:00:00.000Z";
const THEN = "2026-01-01T00:00:00.000Z";

function slot(overrides: Partial<CategoryTimeWindow> = {}): CategoryTimeWindow {
  return {
    id: "win-1",
    categoryId: "category-work",
    day: 1 as WeekDayIntegers,
    startTime: "09:00",
    endTime: "17:00",
    userId: USER_ID,
    ...overrides,
  };
}

function category(overrides: Partial<Category> = {}): Category {
  return {
    id: "category-work",
    name: "Work",
    icon: null,
    color: null,
    sortOrder: 0,
    useTimeWindows: true,
    isStrict: false,
    locationId: null,
    parentId: null,
    userId: USER_ID,
    createdAt: THEN,
    updatedAt: THEN,
    timeSlots: [slot()],
    ...overrides,
  } as Category;
}

function draftState(categories: Category[]): DraftWindowsState {
  return categoriesToDraftWindows(categories);
}

describe("applyDraftWindows", () => {
  it("returns untouched categories by object identity", () => {
    const current = [category()];
    const canonical = draftState(current);
    const result = applyDraftWindows({
      currentCategories: current,
      canonical,
      working: canonical,
      userId: USER_ID,
      now: NOW,
    });
    expect(result[0]).toBe(current[0]);
  });

  it("window-only changes do not restamp the category row", () => {
    const current = [category()];
    const canonical = draftState(current);
    const working: DraftWindowsState = {
      windows: [{ ...canonical.windows[0], endTime: "16:00" }],
      settings: canonical.settings,
    };
    const result = applyDraftWindows({
      currentCategories: current,
      canonical,
      working,
      userId: USER_ID,
      now: NOW,
    });
    expect(result[0]).not.toBe(current[0]);
    expect(result[0].updatedAt).toBe(THEN);
    expect(result[0].timeSlots[0].endTime).toBe("16:00");
    expect(result[0].timeSlots[0].userId).toBe(USER_ID);
  });

  it("flag changes restamp updatedAt", () => {
    const current = [category()];
    const canonical = draftState(current);
    const working: DraftWindowsState = {
      windows: canonical.windows,
      settings: [{ ...canonical.settings[0], isStrict: true }],
    };
    const result = applyDraftWindows({
      currentCategories: current,
      canonical,
      working,
      userId: USER_ID,
      now: NOW,
    });
    expect(result[0].isStrict).toBe(true);
    expect(result[0].updatedAt).toBe(NOW);
  });

  it("creates new windows with the draft uuid and userId, deletes removed ones", () => {
    const current = [category()];
    const canonical = draftState(current);
    const working: DraftWindowsState = {
      windows: [
        {
          id: "minted-uuid",
          categoryId: "category-work",
          day: 3,
          startTime: "08:00",
          endTime: "12:00",
        },
      ],
      settings: canonical.settings,
    };
    const result = applyDraftWindows({
      currentCategories: current,
      canonical,
      working,
      userId: USER_ID,
      now: NOW,
    });
    expect(result[0].timeSlots).toHaveLength(1);
    expect(result[0].timeSlots[0]).toMatchObject({
      id: "minted-uuid",
      day: 3,
      userId: USER_ID,
    });
  });

  it("reparents a window across categories", () => {
    const current = [
      category(),
      category({ id: "category-gym", name: "Gym", timeSlots: [] }),
    ];
    const canonical = draftState(current);
    const working: DraftWindowsState = {
      windows: [{ ...canonical.windows[0], categoryId: "category-gym" }],
      settings: canonical.settings,
    };
    const result = applyDraftWindows({
      currentCategories: current,
      canonical,
      working,
      userId: USER_ID,
      now: NOW,
    });
    expect(result[0].timeSlots).toHaveLength(0);
    expect(result[1].timeSlots).toHaveLength(1);
    expect(result[1].timeSlots[0].categoryId).toBe("category-gym");
  });

  it("preserves concurrent rows the assistant never saw", () => {
    const opened = [category()];
    const canonical = draftState(opened);
    const concurrent = slot({ id: "win-concurrent", day: 5 as WeekDayIntegers });
    const current = [category({ timeSlots: [slot(), concurrent] })];
    const result = applyDraftWindows({
      currentCategories: current,
      canonical,
      working: canonical,
      userId: USER_ID,
      now: NOW,
    });
    expect(result[0].timeSlots).toContain(concurrent);
  });

  it("assistant flag edits win, but untouched flags keep concurrent edits", () => {
    const opened = [category()];
    const canonical = draftState(opened);
    // While the modal was open, someone flipped isStrict elsewhere.
    const current = [category({ isStrict: true, updatedAt: "2026-06-01T00:00:00.000Z" })];
    const untouched = applyDraftWindows({
      currentCategories: current,
      canonical,
      working: canonical,
      userId: USER_ID,
      now: NOW,
    });
    expect(untouched[0].isStrict).toBe(true);
    expect(untouched[0]).toBe(current[0]);
  });
});
