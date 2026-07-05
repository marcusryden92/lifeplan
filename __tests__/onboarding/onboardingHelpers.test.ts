import {
  buildStarterCategories,
  type AreaSelection,
} from "@/app/(protected)/onboarding/_lib/starterCategories";
import {
  buildWeekTemplates,
  expandDailyRange,
  ALL_WEEK_DAYS,
  WEEKDAYS,
  type WeekFormInput,
} from "@/app/(protected)/onboarding/_lib/weekTemplates";
import { applyWorkCategory } from "@/app/(protected)/onboarding/_lib/workCategory";
import { buildStarterCategories as buildAreas } from "@/app/(protected)/onboarding/_lib/starterCategories";
import {
  buildBrainDumpRow,
  durationForType,
  type DumpItem,
} from "@/app/(protected)/onboarding/_lib/brainDumpRows";
import { migrateProgress } from "@/app/(protected)/onboarding/_lib/onboardingProgress";

const USER_ID = "user-1";
const NOW = "2026-07-05T00:00:00.000Z";

describe("buildStarterCategories", () => {
  const selections: AreaSelection[] = [
    { key: "career", name: "Career", color: "#3b82f6" },
    { key: "health", name: "Health", color: "#22c55e" },
  ];

  it("builds one category per selection with onboarding defaults", () => {
    const categories = buildStarterCategories(selections, USER_ID, NOW);
    expect(categories).toHaveLength(2);
    for (const category of categories) {
      expect(category.userId).toBe(USER_ID);
      expect(category.parentId).toBeNull();
      expect(category.locationId).toBeNull();
      expect(category.useTimeWindows).toBe(false);
      expect(category.isStrict).toBe(false);
      expect(category.confineToOwnWindows).toBe(false);
      expect(category.timeSlots).toEqual([]);
      expect(category.createdAt).toBe(NOW);
      expect(category.updatedAt).toBe(NOW);
      expect(typeof category.id).toBe("string");
      expect(category.id.length).toBeGreaterThan(0);
    }
    expect(categories.map((c) => c.name)).toEqual(["Career", "Health"]);
    expect(categories.map((c) => c.color)).toEqual(["#3b82f6", "#22c55e"]);
  });

  it("assigns unique ids and sequential sortOrder from the offset", () => {
    const categories = buildStarterCategories(selections, USER_ID, NOW, 5);
    expect(categories.map((c) => c.sortOrder)).toEqual([5, 6]);
    expect(new Set(categories.map((c) => c.id)).size).toBe(2);
  });

  it("trims whitespace from custom area names", () => {
    const [category] = buildStarterCategories(
      [{ key: "custom:reading", name: "  Reading  ", color: "#6366f1" }],
      USER_ID,
      NOW,
    );
    expect(category.name).toBe("Reading");
  });
});

describe("expandDailyRange", () => {
  it("keeps a within-day range as one block per day", () => {
    const blocks = expandDailyRange(WEEKDAYS, "09:00", "17:00");
    expect(blocks).toHaveLength(5);
    for (const block of blocks) {
      expect(block.startTime).toBe("09:00");
      expect(block.duration).toBe(480);
    }
    expect(blocks.map((b) => b.startDay)).toEqual([1, 2, 3, 4, 5]);
  });

  it("splits a midnight-crossing range into an evening and a morning block", () => {
    const blocks = expandDailyRange([1], "23:00", "07:00");
    expect(blocks).toEqual([
      { startDay: 1, startTime: "23:00", duration: 60 },
      { startDay: 1, startTime: "00:00", duration: 420 },
    ]);
  });

  it("drops the zero-length morning piece when the range ends at midnight", () => {
    const blocks = expandDailyRange([2], "23:00", "00:00");
    expect(blocks).toEqual([
      { startDay: 2, startTime: "23:00", duration: 60 },
    ]);
  });

  it("returns nothing for an empty day set", () => {
    expect(expandDailyRange([], "09:00", "17:00")).toEqual([]);
  });
});

describe("buildWeekTemplates", () => {
  it("expands overnight sleep into 14 daily blocks", () => {
    const input: WeekFormInput = {
      sleep: { start: "23:00", end: "07:00" },
      work: null,
    };
    const templates = buildWeekTemplates(input, USER_ID, NOW);
    expect(templates).toHaveLength(ALL_WEEK_DAYS.length * 2);
    expect(templates.every((t) => t.title === "Sleep")).toBe(true);
    expect(templates.every((t) => t.locationId === null)).toBe(true);
    expect(templates.every((t) => t.userId === USER_ID)).toBe(true);
    const evening = templates.filter((t) => t.startTime === "23:00");
    const morning = templates.filter((t) => t.startTime === "00:00");
    expect(evening).toHaveLength(7);
    expect(morning).toHaveLength(7);
    expect(evening.every((t) => t.duration === 60)).toBe(true);
    expect(morning.every((t) => t.duration === 420)).toBe(true);
  });

  it("ignores work hours — they become Work category windows, not templates", () => {
    const input: WeekFormInput = {
      sleep: null,
      work: {
        start: "09:00",
        end: "17:00",
        days: WEEKDAYS,
        locationId: "loc-work",
      },
    };
    expect(buildWeekTemplates(input, USER_ID, NOW)).toEqual([]);
  });

  it("emits nothing when both sections are disabled", () => {
    expect(buildWeekTemplates({ sleep: null, work: null }, USER_ID, NOW)).toEqual(
      [],
    );
  });

  it("mints unique ids across every emitted template", () => {
    const templates = buildWeekTemplates(
      { sleep: { start: "23:00", end: "07:00" }, work: null },
      USER_ID,
      NOW,
    );
    expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length);
  });
});

describe("applyWorkCategory", () => {
  const work = {
    start: "09:00",
    end: "17:00",
    days: WEEKDAYS,
    locationId: "loc-work",
  };

  it("returns prev unchanged with no work hours", () => {
    const prev = buildAreas([{ key: "health", name: "Health", color: "#22c55e" }], USER_ID, NOW);
    expect(applyWorkCategory(prev, null, USER_ID, NOW)).toBe(prev);
    expect(
      applyWorkCategory(prev, { ...work, days: [] }, USER_ID, NOW),
    ).toBe(prev);
  });

  it("creates Career and a Work sub-category with windows and useTimeWindows on", () => {
    const next = applyWorkCategory([], work, USER_ID, NOW);
    const career = next.find((c) => c.name === "Career");
    const workCat = next.find((c) => c.name === "Work");
    expect(career).toBeDefined();
    expect(career?.parentId).toBeNull();
    expect(workCat).toBeDefined();
    expect(workCat?.parentId).toBe(career?.id);
    expect(workCat?.useTimeWindows).toBe(true);
    expect(workCat?.isStrict).toBe(false);
    expect(workCat?.locationId).toBe("loc-work");
    expect(workCat?.timeSlots).toHaveLength(5);
    expect(workCat?.timeSlots.every((w) => w.startTime === "09:00")).toBe(true);
    expect(workCat?.timeSlots.every((w) => w.endTime === "17:00")).toBe(true);
    expect(workCat?.timeSlots.every((w) => w.categoryId === workCat?.id)).toBe(true);
    expect(workCat?.timeSlots.every((w) => w.userId === USER_ID)).toBe(true);
  });

  it("nests Work under an existing Career area instead of duplicating it", () => {
    const prev = buildAreas(
      [{ key: "career", name: "Career", color: "#3b82f6" }],
      USER_ID,
      NOW,
    );
    const next = applyWorkCategory(prev, work, USER_ID, NOW);
    expect(next.filter((c) => c.name === "Career")).toHaveLength(1);
    const workCat = next.find((c) => c.name === "Work");
    expect(workCat?.parentId).toBe(prev[0].id);
  });

  it("replaces Work windows wholesale on re-apply (idempotent Back/forward)", () => {
    const once = applyWorkCategory([], work, USER_ID, NOW);
    const twice = applyWorkCategory(once, { ...work, days: [1, 2] }, USER_ID, NOW);
    expect(twice.filter((c) => c.name === "Work")).toHaveLength(1);
    const workCat = twice.find((c) => c.name === "Work");
    expect(workCat?.timeSlots).toHaveLength(2);
    expect(workCat?.timeSlots.map((w) => w.day).sort()).toEqual([1, 2]);
  });

  it("splits an overnight shift at midnight", () => {
    const next = applyWorkCategory(
      [],
      { start: "22:00", end: "06:00", days: [1], locationId: null },
      USER_ID,
      NOW,
    );
    const workCat = next.find((c) => c.name === "Work");
    expect(workCat?.timeSlots).toEqual([
      expect.objectContaining({ day: 1, startTime: "22:00", endTime: "23:59" }),
      expect.objectContaining({ day: 1, startTime: "00:00", endTime: "06:00" }),
    ]);
  });
});

describe("buildBrainDumpRow", () => {
  const base: Omit<DumpItem, "type"> = { id: "row-1", title: "  Write book  " };

  it("keeps the jotted id and trims the title", () => {
    const row = buildBrainDumpRow({ ...base, type: "task" }, USER_ID, NOW);
    expect(row.id).toBe("row-1");
    expect(row.title).toBe("Write book");
  });

  it("stamps triaged, not-ready planning defaults for every type", () => {
    for (const type of ["task", "plan", "goal"] as const) {
      const row = buildBrainDumpRow({ ...base, type }, USER_ID, NOW);
      expect(row.plannerType).toBe(type);
      expect(row.isTriaged).toBe(true);
      expect(row.isReady).toBe(false);
      expect(row.parentId).toBeNull();
      expect(row.deadline).toBeNull();
      expect(row.starts).toBeNull();
      expect(row.categoryId).toBeNull();
      expect(row.locationId).toBeNull();
      expect(row.useParentLocation).toBe(false);
      expect(row.userId).toBe(USER_ID);
      expect(row.createdAt).toBe(NOW);
      expect(row.updatedAt).toBe(NOW);
    }
  });

  it("gives tasks and plans a placeholder duration, goals zero", () => {
    expect(durationForType("task")).toBe(30);
    expect(durationForType("plan")).toBe(30);
    expect(durationForType("goal")).toBe(0);
    expect(
      buildBrainDumpRow({ ...base, type: "task" }, USER_ID, NOW).duration,
    ).toBe(30);
    expect(
      buildBrainDumpRow({ ...base, type: "plan" }, USER_ID, NOW).duration,
    ).toBe(30);
    expect(
      buildBrainDumpRow({ ...base, type: "goal" }, USER_ID, NOW).duration,
    ).toBe(0);
  });
});

describe("migrateProgress", () => {
  it("returns null for a non-object payload", () => {
    expect(migrateProgress(null)).toBeNull();
    expect(migrateProgress("nope")).toBeNull();
  });

  it("maps a versionless AI-step payload to the new AI index and empties the dump", () => {
    const migrated = migrateProgress({
      stepIndex: 4,
      weekTemplateIds: ["t-1", "t-2"],
    });
    expect(migrated).toEqual({
      version: 2,
      stepIndex: 5,
      weekTemplateIds: ["t-1", "t-2"],
      dumpItems: [],
      dumpCommittedIds: [],
    });
  });

  it("leaves an early versionless step index untouched", () => {
    expect(migrateProgress({ stepIndex: 1 })?.stepIndex).toBe(1);
  });

  it("passes a v2 payload through, defaulting missing fields", () => {
    const dumpItems: DumpItem[] = [{ id: "d-1", title: "Ship", type: "goal" }];
    const migrated = migrateProgress({
      version: 2,
      stepIndex: 4,
      weekTemplateIds: [],
      dumpItems,
      dumpCommittedIds: ["d-1"],
    });
    expect(migrated).toEqual({
      version: 2,
      stepIndex: 4,
      weekTemplateIds: [],
      dumpItems,
      dumpCommittedIds: ["d-1"],
    });
  });

  it("drops non-string ids from the persisted arrays", () => {
    const migrated = migrateProgress({
      version: 2,
      stepIndex: 4,
      weekTemplateIds: ["ok", 3, null],
      dumpItems: [],
      dumpCommittedIds: ["keep", undefined],
    });
    expect(migrated?.weekTemplateIds).toEqual(["ok"]);
    expect(migrated?.dumpCommittedIds).toEqual(["keep"]);
  });
});
