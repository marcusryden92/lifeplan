import { v4 as uuidv4 } from "uuid";
import type { DraftOpFailure } from "./draftForestOps";
import { isValidStartDay } from "./draftTemplates";
import { type DraftWindowsState, isValidWindowRange } from "./draftWindows";

// Deterministic operations on the assistant's working windows state, executed
// server-side like draftTemplateOps: the model states intent, code performs
// the mutation, and the route emits the full next state wholesale. Ops never
// reject on overlap — the route runs findWindowOverlaps on the result and
// reports collisions back to the model, which is instructed to resolve them.

export interface DraftWindowOpsResult {
  state: DraftWindowsState;
  changed: boolean;
  failures: DraftOpFailure[];
  // Categories whose useTimeWindows was auto-enabled by add_time_windows, so
  // the tool_result can report the side effect.
  autoEnabledCategoryIds: string[];
}

export interface DraftTimeWindowUpdate {
  id: string;
  categoryId?: string;
  day?: number;
  startTime?: string;
  endTime?: string;
}

export interface DraftCategorySettingsUpdate {
  id: string;
  useTimeWindows?: boolean;
  isStrict?: boolean;
}

export function addDraftTimeWindows(
  state: DraftWindowsState,
  items: unknown[],
  validCategoryIds: ReadonlySet<string>,
): DraftWindowOpsResult {
  const windows = [...state.windows];
  const settings = state.settings.map((s) => ({ ...s }));
  const failures: DraftOpFailure[] = [];
  const autoEnabled = new Set<string>();
  let changed = false;

  for (const raw of Array.isArray(items) ? items : []) {
    if (typeof raw !== "object" || raw === null) {
      failures.push({ id: null, reason: "window must be an object" });
      continue;
    }
    const obj = raw as Record<string, unknown>;

    const categoryId =
      typeof obj.categoryId === "string" ? obj.categoryId : "";
    if (!validCategoryIds.has(categoryId)) {
      failures.push({ id: null, reason: "unknown categoryId" });
      continue;
    }
    if (!isValidStartDay(obj.day)) {
      failures.push({
        id: null,
        reason: "day must be an integer 0-6 (0 = Sunday)",
      });
      continue;
    }
    if (!isValidWindowRange(obj.startTime, obj.endTime)) {
      failures.push({
        id: null,
        reason:
          'startTime/endTime must be "HH:MM" (24h) with startTime < endTime; use "23:59" for end of day and two windows to span midnight',
      });
      continue;
    }

    // New windows are new by definition — any model-supplied id is discarded
    // and a fresh uuid minted (it becomes the DB id at Save).
    windows.push({
      id: uuidv4(),
      categoryId,
      day: obj.day,
      startTime: obj.startTime as string,
      endTime: obj.endTime as string,
    });
    changed = true;

    const setting = settings.find((s) => s.id === categoryId);
    if (setting && !setting.useTimeWindows) {
      setting.useTimeWindows = true;
      autoEnabled.add(categoryId);
    }
  }

  return {
    state: { windows, settings },
    changed,
    failures,
    autoEnabledCategoryIds: [...autoEnabled],
  };
}

export function updateDraftTimeWindows(
  state: DraftWindowsState,
  updates: DraftTimeWindowUpdate[],
  validCategoryIds: ReadonlySet<string>,
): DraftWindowOpsResult {
  const windows = state.windows.map((w) => ({ ...w }));
  const failures: DraftOpFailure[] = [];
  let changed = false;

  for (const update of updates) {
    const id = typeof update.id === "string" ? update.id : "";
    const target = windows.find((w) => w.id === id);
    if (!target) {
      failures.push({ id: id || null, reason: "window not found" });
      continue;
    }

    if (update.categoryId !== undefined) {
      if (
        typeof update.categoryId !== "string" ||
        !validCategoryIds.has(update.categoryId)
      ) {
        failures.push({ id, reason: "unknown categoryId" });
        continue;
      }
    }
    if (update.day !== undefined && !isValidStartDay(update.day)) {
      failures.push({ id, reason: "day must be an integer 0-6 (0 = Sunday)" });
      continue;
    }
    // The range rule spans both fields, so validate the patched pair.
    const nextStart = update.startTime ?? target.startTime;
    const nextEnd = update.endTime ?? target.endTime;
    if (
      (update.startTime !== undefined || update.endTime !== undefined) &&
      !isValidWindowRange(nextStart, nextEnd)
    ) {
      failures.push({
        id,
        reason:
          'startTime/endTime must be "HH:MM" (24h) with startTime < endTime; use "23:59" for end of day',
      });
      continue;
    }

    if (update.categoryId !== undefined) target.categoryId = update.categoryId;
    if (update.day !== undefined) target.day = update.day;
    if (update.startTime !== undefined) target.startTime = update.startTime;
    if (update.endTime !== undefined) target.endTime = update.endTime;
    changed = true;
  }

  return {
    state: { windows, settings: state.settings },
    changed,
    failures,
    autoEnabledCategoryIds: [],
  };
}

export function deleteDraftTimeWindows(
  state: DraftWindowsState,
  windowIds: string[],
): DraftWindowOpsResult {
  const ids = [...new Set(windowIds.filter((id) => typeof id === "string"))];
  const failures: DraftOpFailure[] = [];
  const present = new Set(state.windows.map((w) => w.id));

  for (const id of ids) {
    if (!present.has(id)) {
      failures.push({ id, reason: "window not found" });
    }
  }

  const remove = new Set(ids);
  const windows = state.windows.filter((w) => !remove.has(w.id));
  return {
    state: { windows, settings: state.settings },
    changed: windows.length !== state.windows.length,
    failures,
    autoEnabledCategoryIds: [],
  };
}

export function updateDraftCategorySettings(
  state: DraftWindowsState,
  updates: DraftCategorySettingsUpdate[],
  validCategoryIds: ReadonlySet<string>,
): DraftWindowOpsResult {
  const settings = state.settings.map((s) => ({ ...s }));
  const failures: DraftOpFailure[] = [];
  let changed = false;

  for (const update of updates) {
    const id = typeof update.id === "string" ? update.id : "";
    if (!validCategoryIds.has(id)) {
      failures.push({ id: id || null, reason: "unknown categoryId" });
      continue;
    }
    const target = settings.find((s) => s.id === id);
    if (!target) {
      failures.push({ id, reason: "category settings not found" });
      continue;
    }
    if (
      update.useTimeWindows !== undefined &&
      typeof update.useTimeWindows !== "boolean"
    ) {
      failures.push({ id, reason: "useTimeWindows must be a boolean" });
      continue;
    }
    if (update.isStrict !== undefined && typeof update.isStrict !== "boolean") {
      failures.push({ id, reason: "isStrict must be a boolean" });
      continue;
    }
    if (update.useTimeWindows === undefined && update.isStrict === undefined) {
      failures.push({ id, reason: "no fields to update" });
      continue;
    }

    if (update.useTimeWindows !== undefined) {
      target.useTimeWindows = update.useTimeWindows;
    }
    if (update.isStrict !== undefined) target.isStrict = update.isStrict;
    changed = true;
  }

  return {
    state: { windows: state.windows, settings },
    changed,
    failures,
    autoEnabledCategoryIds: [],
  };
}
