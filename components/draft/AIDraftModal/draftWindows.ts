import type { Category } from "@/types/prisma";
import { isValidStartDay, isValidTime } from "./draftTemplates";

// The assistant's contract for category time windows plus the categories
// themselves. A trimmed mirror of Category: userId, icon, and sortOrder are
// server concerns re-attached at Save (the assistant never orders categories;
// new ones append after their siblings).
export interface DraftTimeWindow {
  // Route-minted uuid for new rows; becomes the real DB id at Save
  // (WeekStructureModal set the client-minted-uuid precedent).
  id: string;
  // Required — the assistant never creates unassigned draft windows.
  categoryId: string;
  // 0-6, 0 = Sunday (matches WeekDayIntegers / Date.getDay()).
  day: number;
  // "HH:MM", 24h. Windows are within-day: startTime < endTime, with "23:59"
  // as the end-of-day sentinel (the WeekStructureModal grid cannot produce
  // overnight windows, and its serializers would render one as a
  // negative-duration event; spanning midnight = two windows).
  startTime: string;
  endTime: string;
}

// Full assistant-editable category record. Route-minted uuids on new
// categories become the DB ids at Save, same as windows and templates.
export interface DraftCategoryRecord {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  locationId: string | null;
  useTimeWindows: boolean;
  isStrict: boolean;
  confineToOwnWindows: boolean;
}

// The categories domain travels as one state: ops on windows can flip a flag
// (auto-enable), category deletes take their windows along, and category
// edits change what the windows mean — so the SSE event and working copy
// carry both arrays together.
export interface DraftWindowsState {
  windows: DraftTimeWindow[];
  categories: DraftCategoryRecord[];
}

export const MAX_DRAFT_CATEGORY_NAME_CHARS = 60;

export function isValidWindowRange(
  startTime: unknown,
  endTime: unknown,
): boolean {
  return isValidTime(startTime) && isValidTime(endTime) && startTime < endTime;
}

export function isValidCategoryColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function categoriesToDraftWindows(
  categories: Category[],
): DraftWindowsState {
  return {
    windows: categories.flatMap((c) =>
      c.timeSlots
        .filter((w) => w.categoryId !== null)
        .map((w) => ({
          id: w.id,
          categoryId: w.categoryId as string,
          day: w.day as number,
          startTime: w.startTime,
          endTime: w.endTime,
        })),
    ),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color ?? null,
      parentId: c.parentId ?? null,
      locationId: c.locationId ?? null,
      useTimeWindows: c.useTimeWindows,
      isStrict: c.isStrict,
      confineToOwnWindows: c.confineToOwnWindows,
    })),
  };
}

export function normalizeDraftTimeWindow(raw: unknown): DraftTimeWindow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.length === 0) return null;
  if (typeof obj.categoryId !== "string" || obj.categoryId.length === 0) {
    return null;
  }
  if (!isValidStartDay(obj.day)) return null;
  if (!isValidWindowRange(obj.startTime, obj.endTime)) return null;
  return {
    id: obj.id,
    categoryId: obj.categoryId,
    day: obj.day,
    startTime: obj.startTime as string,
    endTime: obj.endTime as string,
  };
}

function normalizeDraftCategoryRecord(
  raw: unknown,
): DraftCategoryRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.length === 0) return null;
  if (
    typeof obj.name !== "string" ||
    obj.name.trim().length === 0 ||
    obj.name.length > MAX_DRAFT_CATEGORY_NAME_CHARS
  ) {
    return null;
  }
  if (obj.color !== null && !isValidCategoryColor(obj.color)) return null;
  if (obj.parentId !== null && typeof obj.parentId !== "string") return null;
  if (obj.locationId !== null && typeof obj.locationId !== "string") {
    return null;
  }
  if (typeof obj.useTimeWindows !== "boolean") return null;
  if (typeof obj.isStrict !== "boolean") return null;
  if (typeof obj.confineToOwnWindows !== "boolean") return null;
  return {
    id: obj.id,
    name: obj.name,
    color: obj.color,
    parentId: obj.parentId,
    locationId: obj.locationId,
    useTimeWindows: obj.useTimeWindows,
    isStrict: obj.isStrict,
    confineToOwnWindows: obj.confineToOwnWindows,
  };
}

export function normalizeDraftWindowsState(
  raw: unknown,
): DraftWindowsState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { windows, categories } = raw as {
    windows?: unknown;
    categories?: unknown;
  };
  if (!Array.isArray(windows) || !Array.isArray(categories)) return null;
  return {
    windows: windows
      .map((entry) => normalizeDraftTimeWindow(entry))
      .filter((w): w is DraftTimeWindow => w !== null),
    categories: categories
      .map((entry) => normalizeDraftCategoryRecord(entry))
      .filter((c): c is DraftCategoryRecord => c !== null),
  };
}

// All ids reachable from `id` by following parentId downward, `id` included.
// Used for cascade deletes and reparent cycle checks.
export function collectCategorySubtreeIds(
  categories: DraftCategoryRecord[],
  id: string,
): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const list = childrenByParent.get(c.parentId);
    if (list) list.push(c.id);
    else childrenByParent.set(c.parentId, [c.id]);
  }
  const result = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    if (result.has(current)) continue;
    result.add(current);
    for (const child of childrenByParent.get(current) ?? []) {
      queue.push(child);
    }
  }
  return result;
}

export interface WindowOverlap {
  a: DraftTimeWindow;
  b: DraftTimeWindow;
}

// Same-day range intersections, within or across categories. When
// involvedIds is given, only pairs touching at least one involved window are
// reported — pre-existing overlaps in the user's data shouldn't nag on every
// unrelated op. HH:MM strings compare correctly as strings.
export function findWindowOverlaps(
  windows: DraftTimeWindow[],
  involvedIds?: ReadonlySet<string>,
): WindowOverlap[] {
  const overlaps: WindowOverlap[] = [];
  for (let i = 0; i < windows.length; i++) {
    for (let j = i + 1; j < windows.length; j++) {
      const a = windows[i];
      const b = windows[j];
      if (a.day !== b.day) continue;
      if (involvedIds && !involvedIds.has(a.id) && !involvedIds.has(b.id)) {
        continue;
      }
      if (a.startTime < b.endTime && b.startTime < a.endTime) {
        overlaps.push({ a, b });
      }
    }
  }
  return overlaps;
}

function draftWindowEquals(a: DraftTimeWindow, b: DraftTimeWindow): boolean {
  return (
    a.categoryId === b.categoryId &&
    a.day === b.day &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime
  );
}

export function draftCategoryRecordEquals(
  a: DraftCategoryRecord,
  b: DraftCategoryRecord,
): boolean {
  return (
    a.name === b.name &&
    a.color === b.color &&
    a.parentId === b.parentId &&
    a.locationId === b.locationId &&
    a.useTimeWindows === b.useTimeWindows &&
    a.isStrict === b.isStrict &&
    a.confineToOwnWindows === b.confineToOwnWindows
  );
}

// Order-insensitive on both arrays: neither window order nor category order
// is semantic (sync diffs windows by id; categories match by id and the
// assistant never reorders them).
export function draftWindowsStateEqual(
  a: DraftWindowsState,
  b: DraftWindowsState,
): boolean {
  if (
    a.windows.length !== b.windows.length ||
    a.categories.length !== b.categories.length
  ) {
    return false;
  }
  const windowsById = new Map(b.windows.map((w) => [w.id, w]));
  if (windowsById.size !== b.windows.length) return false;
  const categoriesById = new Map(b.categories.map((c) => [c.id, c]));
  if (categoriesById.size !== b.categories.length) return false;
  return (
    a.windows.every((w) => {
      const other = windowsById.get(w.id);
      return other !== undefined && draftWindowEquals(w, other);
    }) &&
    a.categories.every((c) => {
      const other = categoriesById.get(c.id);
      return other !== undefined && draftCategoryRecordEquals(c, other);
    })
  );
}
