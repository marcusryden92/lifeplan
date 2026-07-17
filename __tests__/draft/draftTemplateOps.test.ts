import {
  addDraftTemplates,
  deleteDraftTemplates,
  updateDraftTemplates,
} from "@/utils/draft/draftTemplateOps";
import {
  draftTemplatesEqual,
  normalizeDraftTemplates,
  templatesToDraft,
  type DraftTemplate,
} from "@/utils/draft/draftTemplates";
import type { EventTemplate } from "@/types/prisma";

const LOCATION_GYM = "loc-gym";
const LOCATION_WORK = "loc-work";
const VALID_LOCATIONS = new Set([LOCATION_GYM, LOCATION_WORK]);

function template(overrides: Partial<DraftTemplate> = {}): DraftTemplate {
  return {
    id: "tpl-1",
    title: "Work",
    startDay: 1,
    startTime: "09:00",
    duration: 480,
    color: "#F77F00",
    locationId: LOCATION_WORK,
    ...overrides,
  };
}

describe("addDraftTemplates", () => {
  it("mints fresh ids and discards model-supplied ones", () => {
    const result = addDraftTemplates(
      [],
      [
        {
          id: "model-made-this-up",
          title: "Gym",
          startDay: 2,
          startTime: "18:00",
          duration: 60,
          locationId: LOCATION_GYM,
        },
      ],
      VALID_LOCATIONS,
    );
    expect(result.failures).toHaveLength(0);
    expect(result.changed).toBe(true);
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].id).not.toBe("model-made-this-up");
    expect(result.templates[0].id.length).toBeGreaterThan(0);
    expect(result.templates[0].title).toBe("Gym");
    expect(result.templates[0].locationId).toBe(LOCATION_GYM);
    expect(result.templates[0].color).toBeNull();
  });

  it("collects per-row validation failures without dropping valid rows", () => {
    const result = addDraftTemplates(
      [],
      [
        { title: "", startDay: 1, startTime: "09:00", duration: 60 },
        { title: "Bad day", startDay: 7, startTime: "09:00", duration: 60 },
        { title: "Bad time", startDay: 1, startTime: "24:00", duration: 60 },
        { title: "Bad duration", startDay: 1, startTime: "09:00", duration: 999999 },
        { title: "Bad color", startDay: 1, startTime: "09:00", duration: 60, color: "red" },
        { title: "Bad location", startDay: 1, startTime: "09:00", duration: 60, locationId: "nope" },
        { title: "Sleep", startDay: 0, startTime: "23:00", duration: 480 },
      ],
      VALID_LOCATIONS,
    );
    expect(result.failures).toHaveLength(6);
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].title).toBe("Sleep");
  });

  it("floors sub-minute durations up to 1", () => {
    const result = addDraftTemplates(
      [],
      [{ title: "Blink", startDay: 3, startTime: "12:00", duration: 0.4 }],
      VALID_LOCATIONS,
    );
    expect(result.templates[0].duration).toBe(1);
  });

  it("does not mutate the input array", () => {
    const existing = [template()];
    addDraftTemplates(
      existing,
      [{ title: "Gym", startDay: 2, startTime: "18:00", duration: 60 }],
      VALID_LOCATIONS,
    );
    expect(existing).toEqual([template()]);
  });
});

describe("updateDraftTemplates", () => {
  it("applies partial patches and reports change", () => {
    const result = updateDraftTemplates(
      [template()],
      [{ id: "tpl-1", startTime: "10:00", duration: 420 }],
      VALID_LOCATIONS,
    );
    expect(result.failures).toHaveLength(0);
    expect(result.changed).toBe(true);
    expect(result.templates[0]).toMatchObject({
      startTime: "10:00",
      duration: 420,
      title: "Work",
    });
  });

  it("null clears color and locationId", () => {
    const result = updateDraftTemplates(
      [template()],
      [{ id: "tpl-1", color: null, locationId: null }],
      VALID_LOCATIONS,
    );
    expect(result.templates[0].color).toBeNull();
    expect(result.templates[0].locationId).toBeNull();
  });

  it("fails on unknown id and unknown locationId", () => {
    const result = updateDraftTemplates(
      [template()],
      [
        { id: "ghost", title: "Nope" },
        { id: "tpl-1", locationId: "nowhere" },
      ],
      VALID_LOCATIONS,
    );
    expect(result.failures).toHaveLength(2);
    expect(result.templates[0].locationId).toBe(LOCATION_WORK);
  });

  it("does not mutate the input array", () => {
    const existing = [template()];
    updateDraftTemplates(
      existing,
      [{ id: "tpl-1", title: "Changed" }],
      VALID_LOCATIONS,
    );
    expect(existing[0].title).toBe("Work");
  });
});

describe("deleteDraftTemplates", () => {
  it("removes rows, dedupes ids, and reports unknown ids", () => {
    const result = deleteDraftTemplates(
      [template(), template({ id: "tpl-2", title: "Gym" })],
      ["tpl-2", "tpl-2", "ghost"],
    );
    expect(result.changed).toBe(true);
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].id).toBe("tpl-1");
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].id).toBe("ghost");
  });

  it("reports no change when nothing matched", () => {
    const result = deleteDraftTemplates([template()], ["ghost"]);
    expect(result.changed).toBe(false);
    expect(result.templates).toHaveLength(1);
  });
});

describe("draftTemplatesEqual", () => {
  it("is order-insensitive", () => {
    const a = [template(), template({ id: "tpl-2", title: "Gym" })];
    const b = [template({ id: "tpl-2", title: "Gym" }), template()];
    expect(draftTemplatesEqual(a, b)).toBe(true);
  });

  it("detects field changes and membership changes", () => {
    expect(
      draftTemplatesEqual([template()], [template({ startTime: "09:30" })]),
    ).toBe(false);
    expect(draftTemplatesEqual([template()], [])).toBe(false);
    expect(
      draftTemplatesEqual([template()], [template({ id: "other" })]),
    ).toBe(false);
  });
});

describe("templatesToDraft / normalizeDraftTemplates", () => {
  it("strips server fields and normalizes optionals", () => {
    const row = {
      id: "tpl-1",
      title: "Work",
      startDay: 1,
      startTime: "09:00",
      duration: 480,
      color: null,
      locationId: null,
      userId: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as EventTemplate;
    expect(templatesToDraft([row])).toEqual([
      {
        id: "tpl-1",
        title: "Work",
        startDay: 1,
        startTime: "09:00",
        duration: 480,
        color: null,
        locationId: null,
      },
    ]);
  });

  it("drops malformed rows from SSE payloads", () => {
    const normalized = normalizeDraftTemplates({
      templates: [
        template(),
        { id: "", title: "no id", startDay: 1, startTime: "09:00", duration: 60 },
        { id: "x", title: "bad time", startDay: 1, startTime: "9am", duration: 60 },
        "not an object",
      ],
    });
    expect(normalized).toHaveLength(1);
    expect(normalized?.[0].id).toBe("tpl-1");
  });

  it("returns null for a payload without a templates array", () => {
    expect(normalizeDraftTemplates({})).toBeNull();
    expect(normalizeDraftTemplates(null)).toBeNull();
  });
});
