import type { DiffStatus } from "./diffDraftTree";
import type {
  DraftCategorySettings,
  DraftTimeWindow,
  DraftWindowsState,
} from "./draftWindows";

export interface DiffWindow extends DraftTimeWindow {
  status: DiffStatus;
  // Populated only when status === "modified".
  changedFields: string[];
}

export interface DiffCategorySettings extends DraftCategorySettings {
  // Flag names that differ from canonical ("useTimeWindows", "isStrict").
  changedFlags: string[];
}

export interface DiffWindowsState {
  windows: DiffWindow[];
  settings: DiffCategorySettings[];
}

const COMPARED_FIELDS = ["categoryId", "day", "startTime", "endTime"] as const;

function fieldsThatChanged(a: DraftTimeWindow, b: DraftTimeWindow): string[] {
  return COMPARED_FIELDS.filter((field) => a[field] !== b[field]);
}

// Match by id: working rows keep their order, canonical rows missing from
// working are appended as deleted so removals stay visible in the review pane.
export function diffDraftWindows(
  working: DraftWindowsState,
  canonical: DraftWindowsState,
): DiffWindowsState {
  const canonicalById = new Map(canonical.windows.map((w) => [w.id, w]));
  const workingIds = new Set(working.windows.map((w) => w.id));

  const windows: DiffWindow[] = working.windows.map((w) => {
    const base = canonicalById.get(w.id);
    if (!base) return { ...w, status: "added", changedFields: [] };
    const changedFields = fieldsThatChanged(w, base);
    return {
      ...w,
      status: changedFields.length > 0 ? "modified" : "unchanged",
      changedFields,
    };
  });

  for (const w of canonical.windows) {
    if (!workingIds.has(w.id)) {
      windows.push({ ...w, status: "deleted", changedFields: [] });
    }
  }

  const canonicalSettingsById = new Map(
    canonical.settings.map((s) => [s.id, s]),
  );
  const settings: DiffCategorySettings[] = working.settings.map((s) => {
    const base = canonicalSettingsById.get(s.id);
    const changedFlags: string[] = [];
    if (base) {
      if (s.useTimeWindows !== base.useTimeWindows) {
        changedFlags.push("useTimeWindows");
      }
      if (s.isStrict !== base.isStrict) changedFlags.push("isStrict");
    }
    return { ...s, changedFlags };
  });

  return { windows, settings };
}

export interface WindowCategoryGroup {
  categoryId: string;
  settings: DiffCategorySettings | null;
  // Sorted Monday-first, then by startTime.
  rows: DiffWindow[];
}

// Category order follows the provided id order (the provider's categories
// array). Categories with no windows and no flag changes are omitted.
export function groupWindowsByCategory(
  diffed: DiffWindowsState,
  categoryIdOrder: string[],
): WindowCategoryGroup[] {
  const dayRank = new Map([1, 2, 3, 4, 5, 6, 0].map((d, i) => [d, i]));
  const settingsById = new Map(diffed.settings.map((s) => [s.id, s]));

  return categoryIdOrder
    .map((categoryId) => {
      const settings = settingsById.get(categoryId) ?? null;
      const rows = diffed.windows
        .filter((w) => w.categoryId === categoryId)
        .sort(
          (a, b) =>
            (dayRank.get(a.day) ?? 7) - (dayRank.get(b.day) ?? 7) ||
            a.startTime.localeCompare(b.startTime),
        );
      return { categoryId, settings, rows };
    })
    .filter(
      (group) =>
        group.rows.length > 0 ||
        (group.settings?.changedFlags.length ?? 0) > 0,
    );
}

export function countWindowChanges(diffed: DiffWindowsState): number {
  return (
    diffed.windows.filter((w) => w.status !== "unchanged").length +
    diffed.settings.filter((s) => s.changedFlags.length > 0).length
  );
}
