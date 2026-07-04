import type { Category } from "@/types/prisma";
import { isValidStartDay, isValidTime } from "./draftTemplates";

// The assistant's contract for category time windows plus the two category
// flags that govern them. A trimmed mirror of Category.timeSlots +
// useTimeWindows/isStrict: userId is a server concern re-attached at Save.
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

export interface DraftCategorySettings {
  id: string;
  useTimeWindows: boolean;
  isStrict: boolean;
}

// The windows domain travels as one state: ops on windows can flip a flag
// (auto-enable) and flag edits change what the windows mean, so the SSE
// event and working copy carry both arrays together.
export interface DraftWindowsState {
  windows: DraftTimeWindow[];
  settings: DraftCategorySettings[];
}

export function isValidWindowRange(
  startTime: unknown,
  endTime: unknown,
): boolean {
  return isValidTime(startTime) && isValidTime(endTime) && startTime < endTime;
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
    settings: categories.map((c) => ({
      id: c.id,
      useTimeWindows: c.useTimeWindows,
      isStrict: c.isStrict,
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

function normalizeDraftCategorySettings(
  raw: unknown,
): DraftCategorySettings | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.length === 0) return null;
  if (typeof obj.useTimeWindows !== "boolean") return null;
  if (typeof obj.isStrict !== "boolean") return null;
  return {
    id: obj.id,
    useTimeWindows: obj.useTimeWindows,
    isStrict: obj.isStrict,
  };
}

export function normalizeDraftWindowsState(
  raw: unknown,
): DraftWindowsState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { windows, settings } = raw as {
    windows?: unknown;
    settings?: unknown;
  };
  if (!Array.isArray(windows) || !Array.isArray(settings)) return null;
  return {
    windows: windows
      .map((entry) => normalizeDraftTimeWindow(entry))
      .filter((w): w is DraftTimeWindow => w !== null),
    settings: settings
      .map((entry) => normalizeDraftCategorySettings(entry))
      .filter((s): s is DraftCategorySettings => s !== null),
  };
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

// Order-insensitive on both arrays: neither window order nor settings order
// is semantic (sync diffs windows by id; settings match categories by id).
export function draftWindowsStateEqual(
  a: DraftWindowsState,
  b: DraftWindowsState,
): boolean {
  if (
    a.windows.length !== b.windows.length ||
    a.settings.length !== b.settings.length
  ) {
    return false;
  }
  const windowsById = new Map(b.windows.map((w) => [w.id, w]));
  if (windowsById.size !== b.windows.length) return false;
  const settingsById = new Map(b.settings.map((s) => [s.id, s]));
  if (settingsById.size !== b.settings.length) return false;
  return (
    a.windows.every((w) => {
      const other = windowsById.get(w.id);
      return other !== undefined && draftWindowEquals(w, other);
    }) &&
    a.settings.every((s) => {
      const other = settingsById.get(s.id);
      return (
        other !== undefined &&
        other.useTimeWindows === s.useTimeWindows &&
        other.isStrict === s.isStrict
      );
    })
  );
}
