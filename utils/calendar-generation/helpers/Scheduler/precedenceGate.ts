import type { Planner, SimpleEvent } from "@/types/prisma";
import type { PrecedenceEdge } from "@/utils/precedence/types";
import { plannerIdFromEventId } from "../../../planRecurrence";

// Placement-gate bookkeeping for precedence chains. The gate bounds each
// candidate to start after the max end across all PLACED predecessors; a
// failed predecessor breaks the chain loudly (sequence break), and a
// predecessor with no outcome yet keeps the successor waiting.

export type ChainFailCause = "failed" | "unready" | "horizon";

export type ChainOutcome =
  | { status: "placed"; lastEnd?: Date }
  | { status: "failed"; failCause: ChainFailCause };

export type SequenceBreak = {
  source: "queue" | "dependency";
  queueId?: string;
  fromId: string;
  toId: string;
  cause: ChainFailCause;
};

/**
 * Seed outcomes for edge sources that are NOT scheduling candidates this run:
 * - Sources with pre-existing events (memoized past placements, completed
 *   split segments) resolve `placed` with the max end across their subtree's
 *   events in `scheduledEvents` — past-only, effectively unconstraining.
 *   Events are matched to their source planner via the composite-id prefix
 *   (chunk `|chunk:n` / segment `|done:start` ids), never raw id equality.
 * - Unready-goal dependency predecessors resolve `failed`/`unready` so the
 *   defensive fallback is loud (semantics: a prerequisite never stops being
 *   a prerequisite). Queue edges never reach here with an unready goal —
 *   the edge builder chains through them silently.
 * - Anything else unseedable resolves `failed` — a starvation guard so a
 *   successor never waits forever on a source that cannot produce events.
 */
export function seedChainOutcomes(
  edges: PrecedenceEdge[],
  candidates: Planner[],
  allPlanners: Planner[],
  scheduledEvents: SimpleEvent[],
): Map<string, ChainOutcome> {
  const outcomes = new Map<string, ChainOutcome>();
  const candidateIds = new Set(candidates.map((c) => c.id));
  const plannerById = new Map(allPlanners.map((p) => [p.id, p]));

  const sourceIds = new Set<string>();
  for (const edge of edges) sourceIds.add(edge.fromId);

  const unseededSources = [...sourceIds].filter(
    (id) => !candidateIds.has(id) && !outcomes.has(id),
  );
  if (unseededSources.length === 0) return outcomes;

  // rootOf with cycle guard, resolved lazily per event planner id.
  const rootCache = new Map<string, string>();
  const rootOf = (id: string): string => {
    const cached = rootCache.get(id);
    if (cached !== undefined) return cached;
    const seen = new Set<string>([id]);
    let current = plannerById.get(id);
    while (current?.parentId) {
      const parent = plannerById.get(current.parentId);
      if (!parent || seen.has(parent.id)) break;
      seen.add(parent.id);
      current = parent;
    }
    const root = current?.id ?? id;
    rootCache.set(id, root);
    return root;
  };

  const lastEndByRoot = new Map<string, Date>();
  for (const event of scheduledEvents) {
    if (event.extendedProps?.eventType !== "planner") continue;
    const root = rootOf(plannerIdFromEventId(event.id));
    const end = new Date(event.end);
    const prior = lastEndByRoot.get(root);
    if (!prior || end > prior) lastEndByRoot.set(root, end);
  }

  for (const sourceId of unseededSources) {
    const planner = plannerById.get(sourceId);
    const lastEnd = lastEndByRoot.get(sourceId);
    if (lastEnd) {
      outcomes.set(sourceId, { status: "placed", lastEnd });
    } else if (
      planner &&
      planner.plannerType === "goal" &&
      planner.isReady !== true
    ) {
      outcomes.set(sourceId, { status: "failed", failCause: "unready" });
    } else {
      outcomes.set(sourceId, { status: "failed", failCause: "failed" });
    }
  }

  return outcomes;
}

export type GateDecision =
  | { blocked: true }
  | {
      blocked: false;
      afterTime: Date | undefined;
      failedEdges: { edge: PrecedenceEdge; cause: ChainFailCause }[];
    };

/**
 * Gate a candidate against its incoming edges. Blocked (predecessor outcome
 * still missing) means "skip this pass, stay a candidate"; otherwise the
 * candidate schedules bounded by the max end over the PLACED subset
 * (unbounded when none placed), with one recorded break per failed edge.
 */
export function gateCandidate(
  plannerId: string,
  predecessorMap: Map<string, PrecedenceEdge[]>,
  chainOutcome: Map<string, ChainOutcome>,
): GateDecision {
  const incoming = predecessorMap.get(plannerId);
  if (!incoming || incoming.length === 0) {
    return { blocked: false, afterTime: undefined, failedEdges: [] };
  }

  let afterTime: Date | undefined;
  const failedEdges: { edge: PrecedenceEdge; cause: ChainFailCause }[] = [];

  for (const edge of incoming) {
    const outcome = chainOutcome.get(edge.fromId);
    if (!outcome) return { blocked: true };
    if (outcome.status === "placed") {
      if (outcome.lastEnd && (!afterTime || outcome.lastEnd > afterTime)) {
        afterTime = outcome.lastEnd;
      }
    } else {
      failedEdges.push({ edge, cause: outcome.failCause });
    }
  }

  return { blocked: false, afterTime, failedEdges };
}

/** Dedupe-and-record sequence breaks (one per edge+cause across passes). */
export function recordSequenceBreaks(
  breaks: SequenceBreak[],
  seen: Set<string>,
  failedEdges: { edge: PrecedenceEdge; cause: ChainFailCause }[],
): void {
  for (const { edge, cause } of failedEdges) {
    const key = `${edge.source}|${edge.queueId ?? ""}|${edge.fromId}|${edge.toId}|${cause}`;
    if (seen.has(key)) continue;
    seen.add(key);
    breaks.push({
      source: edge.source,
      queueId: edge.queueId,
      fromId: edge.fromId,
      toId: edge.toId,
      cause,
    });
  }
}
