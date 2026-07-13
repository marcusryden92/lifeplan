import { Planner } from "@/types/prisma";
import type { PrecedenceEdge } from "@/utils/precedence/types";
import {
  getScheduledLeafSequence,
  getRootParentId,
  collectLinkedTargetIds,
} from "../../../goalPageHandlers";
import { taskIsCompleted } from "../../../taskHelpers";

// The leaf-level precedence graph the flat scheduler walks. Everything the
// scheduler needs to place leaves in the right order is derived here from the
// candidate roots' detour-spliced leaf sequences plus the queue/dependency
// edges. The single load-bearing idea: consecutive-pair edges over each
// candidate's SPLICED sequence encode goal-internal chaining, detour splices,
// AND multi-reference reconciliation uniformly — a target referenced from two
// hosts lives once in the pool with chain predecessors from both.

export interface LeafNode {
  leaf: Planner;
  /** Global clustering order (assigned on first encounter, dedup). */
  scheduleIndex: number;
}

export interface LeafGraph {
  nodes: LeafNode[];
  /** leafId -> chain predecessor leaf ids (goal-internal + detour splice). */
  chainPreds: Map<string, string[]>;
  /**
   * leafId -> tracked roots for which this leaf is the first scheduled leaf.
   * The root-level cross gate (queue/dependency) is applied to these leaves.
   */
  crossGateRoots: Map<string, string[]>;
  /** leafId -> tracked roots whose completion this leaf contributes to. */
  completionRoots: Map<string, string[]>;
  /** trackedRootId -> number of leaves contributing to its completion. */
  rootLeafCount: Map<string, number>;
  /** leafId -> inheritance-adjusted score (primary ordering key, desc). */
  leafEffScore: Map<string, number>;
  /** trackedRootId -> its own last scheduled leaf id (for cross inheritance). */
  rootLastOwnLeaf: Map<string, string>;
}

const pushUnique = (map: Map<string, string[]>, key: string, value: string) => {
  const list = map.get(key);
  if (!list) map.set(key, [value]);
  else if (!list.includes(value)) list.push(value);
};

export function buildLeafGraph(
  candidates: Planner[],
  allPlanners: Planner[],
  memoizedEventIds: Set<string>,
  precedenceEdges: PrecedenceEdge[],
  urgencyScores: Map<string, number>,
): LeafGraph {
  const scheduledSeq = (rootId: string): Planner[] =>
    getScheduledLeafSequence(allPlanners, rootId).filter(
      (leaf) => !taskIsCompleted(leaf) && !memoizedEventIds.has(leaf.id),
    );

  const nodeById = new Map<string, LeafNode>();
  const nodes: LeafNode[] = [];
  const chainPreds = new Map<string, string[]>();
  const crossGateRoots = new Map<string, string[]>();
  const completionRoots = new Map<string, string[]>();
  const rootFirstOwnLeaf = new Map<string, string>();
  const rootLastOwnLeaf = new Map<string, string>();
  let scheduleCounter = 0;

  // Register a tracked root's own chain + completion + gate boundaries. Used
  // for both candidate roots and detour-target roots. Chain edges dedup, so a
  // target's internal chain (also produced when a host splices it) is harmless
  // to re-add.
  const registerRoot = (rootId: string, seq: Planner[]) => {
    if (seq.length === 0) return;
    let prevId: string | null = null;
    for (const leaf of seq) {
      if (!nodeById.has(leaf.id)) {
        const node: LeafNode = { leaf, scheduleIndex: scheduleCounter++ };
        nodeById.set(leaf.id, node);
        nodes.push(node);
      }
      if (prevId) pushUnique(chainPreds, leaf.id, prevId);
      pushUnique(completionRoots, leaf.id, rootId);
      prevId = leaf.id;
    }
    pushUnique(crossGateRoots, seq[0].id, rootId);
    rootFirstOwnLeaf.set(rootId, seq[0].id);
    rootLastOwnLeaf.set(rootId, seq[seq.length - 1].id);
  };

  // Candidate roots: walk each spliced sequence. This is what pulls detour
  // targets' leaves into the pool and builds the splice/multi-ref chain edges.
  for (const candidate of candidates) {
    registerRoot(candidate.id, scheduledSeq(candidate.id));
  }

  // Detour targets get their OWN outcome tracked too (they may be dependency /
  // queue endpoints). Their leaves are already in the pool via the host splice;
  // registering adds target-level completion + the target's own cross gate.
  for (const targetId of collectLinkedTargetIds(allPlanners)) {
    const seq = scheduledSeq(targetId);
    if (seq.length === 0 || !nodeById.has(seq[0].id)) continue;
    registerRoot(targetId, seq);
  }

  const rootLeafCount = new Map<string, number>();
  for (const roots of completionRoots.values()) {
    for (const rootId of roots) {
      rootLeafCount.set(rootId, (rootLeafCount.get(rootId) ?? 0) + 1);
    }
  }

  // Leaf-level priority inheritance. A leaf inherits the max score of every
  // downstream leaf that needs it, over chain edges (so a detour host's
  // before-leaves inherit the spliced target's score, its after-leaves don't)
  // plus lifted cross edges (a dependency predecessor's chain inherits its
  // successor). Backward pass, memoized, cycle-guarded.
  const successors = new Map<string, string[]>();
  for (const [leafId, preds] of chainPreds) {
    for (const predId of preds) pushUnique(successors, predId, leafId);
  }
  for (const edge of precedenceEdges) {
    const fromLast = rootLastOwnLeaf.get(edge.fromId);
    const toFirst = rootFirstOwnLeaf.get(edge.toId);
    if (fromLast && toFirst) pushUnique(successors, fromLast, toFirst);
  }

  const rawScoreOf = (leaf: Planner): number => {
    const rootId = getRootParentId(allPlanners, leaf.id) ?? leaf.id;
    return urgencyScores.get(rootId) ?? 0;
  };

  const leafEffScore = new Map<string, number>();
  const visiting = new Set<string>();
  const resolveScore = (leafId: string): number => {
    const cached = leafEffScore.get(leafId);
    if (cached !== undefined) return cached;
    const node = nodeById.get(leafId);
    if (!node) return 0;
    if (visiting.has(leafId)) return rawScoreOf(node.leaf);
    visiting.add(leafId);
    let score = rawScoreOf(node.leaf);
    for (const successorId of successors.get(leafId) ?? []) {
      const successorScore = resolveScore(successorId);
      if (successorScore > score) score = successorScore;
    }
    visiting.delete(leafId);
    leafEffScore.set(leafId, score);
    return score;
  };
  for (const node of nodes) resolveScore(node.leaf.id);

  return {
    nodes,
    chainPreds,
    crossGateRoots,
    completionRoots,
    rootLeafCount,
    leafEffScore,
    rootLastOwnLeaf,
  };
}
