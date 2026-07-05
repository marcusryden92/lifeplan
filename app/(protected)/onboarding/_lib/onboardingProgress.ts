import type { TriageType } from "@/app/(protected)/capture/_constants";
import type { CommittedDump, DumpItem } from "./brainDumpRows";

export const PROGRESS_KEY = "circadium.onboarding.progress";

export type StoredCommittedDump = { id: string } & CommittedDump;

export type StoredProgress = {
  version: 3;
  stepIndex: number;
  roleCommittedIds: string[];
  weekTemplateIds: string[];
  dumpItems: DumpItem[];
  dumpCommitted: StoredCommittedDump[];
};

const TRIAGE_TYPES: ReadonlySet<string> = new Set<TriageType>([
  "task",
  "plan",
  "goal",
]);

function isTriageType(value: unknown): value is TriageType {
  return typeof value === "string" && TRIAGE_TYPES.has(value);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];
}

function toDumpItems(value: unknown): DumpItem[] {
  if (!Array.isArray(value)) return [];
  const items: DumpItem[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, title, type } = entry as Record<string, unknown>;
    if (typeof id !== "string" || id.length === 0) continue;
    if (typeof title !== "string") continue;
    if (!isTriageType(type)) continue;
    items.push({ id, title, type });
  }
  return items;
}

// Normalizes any persisted payload to the current schema.
//
// A versionless (v1) payload predates the brain-dump step: its step order was
// Welcome(0) Areas(1) Places(2) Week(3) AI(4), so its AI step (index >= 4) maps
// to the new AI step at index 5, and the brain-dump / area-tracking fields
// default empty.
//
// A v2 payload predates role-commit reconciliation and per-dump snapshots: it
// carried `dumpCommittedIds: string[]` instead of `dumpCommitted`. We rebuild
// snapshots from its own `dumpItems` (last-committed assumed equal to the
// persisted jots — the safe default, which treats nothing as user-edited on the
// next commit) and default `roleCommittedIds` empty.
export function migrateProgress(raw: unknown): StoredProgress | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const version = typeof obj.version === "number" ? obj.version : 1;
  const weekTemplateIds = toStringArray(obj.weekTemplateIds);
  let stepIndex = typeof obj.stepIndex === "number" ? obj.stepIndex : 0;

  if (version < 2) {
    if (stepIndex >= 4) stepIndex = 5;
    return {
      version: 3,
      stepIndex,
      roleCommittedIds: [],
      weekTemplateIds,
      dumpItems: [],
      dumpCommitted: [],
    };
  }

  const dumpItems = toDumpItems(obj.dumpItems);
  // `areaCommittedIds` is the pre-rename key from the first v3 blobs; read it as
  // a fallback so an in-flight session's owned roles survive the rename.
  const roleCommittedIds = toStringArray(
    obj.roleCommittedIds ?? obj.areaCommittedIds,
  );

  let dumpCommitted: StoredCommittedDump[];
  if (Array.isArray(obj.dumpCommitted)) {
    dumpCommitted = [];
    for (const entry of obj.dumpCommitted) {
      if (typeof entry !== "object" || entry === null) continue;
      const { id, title, type } = entry as Record<string, unknown>;
      if (typeof id !== "string" || id.length === 0) continue;
      if (typeof title !== "string" || !isTriageType(type)) continue;
      dumpCommitted.push({ id, title, type });
    }
  } else {
    // v2 → v3: rebuild snapshots from the committed ids using the persisted jots.
    const committedIds = new Set(toStringArray(obj.dumpCommittedIds));
    dumpCommitted = dumpItems
      .filter((it) => committedIds.has(it.id))
      .map((it) => ({ id: it.id, title: it.title.trim(), type: it.type }));
  }

  return {
    version: 3,
    stepIndex,
    roleCommittedIds,
    weekTemplateIds,
    dumpItems,
    dumpCommitted,
  };
}
