import { EngineMessage, Planner, Queue } from "@/types/prisma";
import {
  buildEngineMessageLookups,
  renderEngineMessage,
} from "@/utils/renderEngineMessage";
import { useMemo } from "react";
import {
  plannerIdFromPayload,
  plannerSubjectIdsFromPayload,
} from "@/utils/renderEngineMessage";
import { getRootParentId, getTaskTreeIds } from "@/utils/goalPageHandlers";
import { SerializedLocation } from "@/redux/slices/schedulingSettingsSlice";

export default function useRenderEngineMessages(
  planner: Planner[],
  locations: SerializedLocation[],
  queues: Queue[],
  engineMessages: EngineMessage[],
  filterId?: string,
) {
  const renderedMessages = useMemo(() => {
    const lookups = buildEngineMessageLookups(planner, locations, queues);
    // renderEngineMessage returns null for payload shapes we don't recognize
    // (e.g. a persisted row from a newer client version). Drop those rather
    // than showing an undefined card — no signal is better than a crash.
    // Dismissed rows stay in the array (so the engine can carry the flag
    // forward on the next regen) but never render.
    return engineMessages.flatMap((m) => {
      if (m.dismissed) return [];
      const rendered = renderEngineMessage(m, lookups);
      if (!rendered) return [];
      // Match the calendar popover's "Open full editor" behavior: drill to
      // the root ancestor, not the leaf. Item pages render the full tree
      // rooted at the URL id, so a leaf navigation would land on an
      // uninformative single-node page.
      const leafId = plannerIdFromPayload(m.payload);
      const drillTo = leafId
        ? (getRootParentId(planner, leafId) ?? leafId)
        : null;
      return [
        {
          ...rendered,
          drillTo,
          subjectIds: plannerSubjectIdsFromPayload(m.payload),
        },
      ];
    });
  }, [engineMessages, planner, locations, queues]);

  // Item-page filter: a message belongs to the viewed item when any planner
  // it references sits in the item's subtree — a goal's alerts include every
  // leaf under it, not just rows that name the root itself.
  return useMemo(() => {
    if (!filterId) return renderedMessages;
    const treeIds = new Set(getTaskTreeIds(planner, filterId));
    return renderedMessages.filter((m) =>
      m.subjectIds.some((id) => treeIds.has(id)),
    );
  }, [renderedMessages, planner, filterId]);
}
