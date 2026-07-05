import type { Planner } from "@/types/prisma";
import {
  DEFAULT_DRAFT_DURATION_MIN,
  type TriageType,
} from "@/app/(protected)/capture/_constants";

export type DumpItem = {
  // Minted at jot time and reused as the Planner row id — the idempotency key
  // for re-committing on a Back/forward loop.
  id: string;
  title: string;
  type: TriageType;
};

// A rough default duration by type. Goals hold subtasks and carry no duration
// of their own; tasks and plans get a placeholder the AI step refines.
export function durationForType(type: TriageType): number {
  return type === "goal" ? 0 : DEFAULT_DRAFT_DURATION_MIN;
}

// Builds a triaged Planner row from a brain-dump jot. Deadlines, readiness,
// start times, and real durations are deferred to the AI step; this only needs
// to produce a valid, schedulable-once-refined row. isTriaged MUST be true so
// the assistant forest (triaged roots only) picks the item up.
export function buildBrainDumpRow(
  item: DumpItem,
  userId: string,
  nowIso: string,
): Planner {
  return {
    id: item.id,
    title: item.title.trim(),
    parentId: null,
    plannerType: item.type,
    isReady: false,
    isTriaged: true,
    duration: durationForType(item.type),
    deadline: null,
    starts: null,
    sortOrder: 0,
    completedStartTime: null,
    completedEndTime: null,
    priority: 5,
    userId,
    color: null,
    locationId: null,
    useParentLocation: false,
    categoryId: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
