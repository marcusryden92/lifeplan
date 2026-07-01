import { Planner } from "@/types/prisma";

import {
  getSortedTreeBottomLayer,
  sortTasksByDependencies,
} from "@/utils/goalPageHandlers";

// Wire a freshly-cloned subtree into the sibling chain. Unlike
// updateDependenciesOnCreate (single-leaf insert), the new subtree's chain
// runs through the bottom layer, so the boundary wiring happens on the new
// tree's first/last BLI — not on newRootId. Otherwise the calendar would
// render A1, A2, A3, B, X1, ... instead of A1, A2, A3, B1, B2, B3, X1, ...
export function updateDependenciesOnDuplicate(
  combined: Planner[],
  parentId: string,
  newRootId: string,
): Planner[] {
  const siblings = combined.filter(
    (t) => t.parentId === parentId && t.id !== newRootId,
  );

  if (siblings.length === 0) return combined;

  const sortedSiblings = sortTasksByDependencies(combined, siblings);
  const lastSibling = sortedSiblings[sortedSiblings.length - 1];
  const prevBottomLayer = getSortedTreeBottomLayer(combined, lastSibling.id);
  const prevLastBLI = prevBottomLayer[prevBottomLayer.length - 1];

  const newBottomLayer = getSortedTreeBottomLayer(combined, newRootId);
  const newFirstBLI = newBottomLayer[0];
  const newLastBLI = newBottomLayer[newBottomLayer.length - 1];

  return combined.map((t) => {
    if (t.id === newFirstBLI.id) {
      return { ...t, dependency: prevLastBLI.id };
    }
    if (t.dependency === prevLastBLI.id && t.id !== newFirstBLI.id) {
      return { ...t, dependency: newLastBLI.id };
    }
    return t;
  });
}
