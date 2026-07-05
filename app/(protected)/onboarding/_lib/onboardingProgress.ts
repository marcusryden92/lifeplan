import type { DumpItem } from "./brainDumpRows";

export const PROGRESS_KEY = "circadium.onboarding.progress";

export type StoredProgress = {
  version: 2;
  stepIndex: number;
  weekTemplateIds: string[];
  dumpItems: DumpItem[];
  dumpCommittedIds: string[];
};

// Normalizes any persisted payload to the current schema. A versionless (v1)
// payload predates the brain-dump step: its step order was Welcome(0) Areas(1)
// Places(2) Week(3) AI(4), so its AI step (index >= 4) maps to the new AI step
// at index 5, and the brain-dump fields default empty.
export function migrateProgress(raw: unknown): StoredProgress | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const version = typeof obj.version === "number" ? obj.version : 1;
  const weekTemplateIds = Array.isArray(obj.weekTemplateIds)
    ? obj.weekTemplateIds.filter((x): x is string => typeof x === "string")
    : [];
  let stepIndex = typeof obj.stepIndex === "number" ? obj.stepIndex : 0;

  if (version < 2) {
    if (stepIndex >= 4) stepIndex = 5;
    return {
      version: 2,
      stepIndex,
      weekTemplateIds,
      dumpItems: [],
      dumpCommittedIds: [],
    };
  }

  const dumpItems = Array.isArray(obj.dumpItems)
    ? (obj.dumpItems as DumpItem[])
    : [];
  const dumpCommittedIds = Array.isArray(obj.dumpCommittedIds)
    ? obj.dumpCommittedIds.filter((x): x is string => typeof x === "string")
    : [];
  return { version: 2, stepIndex, weekTemplateIds, dumpItems, dumpCommittedIds };
}
