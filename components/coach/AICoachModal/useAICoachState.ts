"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CoachNode } from "./plannerTreeToJson";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  // Streaming assistant messages render with a live indicator until the
  // response completes.
  streaming?: boolean;
}

export interface UseAICoachStateArgs {
  open: boolean;
  canonical: CoachNode | null;
}

export interface UseAICoachStateReturn {
  workingTree: CoachNode | null;
  setWorkingTree: (tree: CoachNode | null) => void;
  resetWorkingTree: () => void;
  hasChanges: boolean;

  messages: ChatMessage[];
  appendMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearMessages: () => void;
}

export function useAICoachState({
  open,
  canonical,
}: UseAICoachStateArgs): UseAICoachStateReturn {
  const [workingTree, setWorkingTreeState] = useState<CoachNode | null>(
    canonical,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // On modal open, adopt the current canonical as the working copy and start
  // with an empty chat. Re-opening the modal is a fresh session; we don't
  // persist state between opens (matches WeekStructureModal's discard-on-close
  // semantics).
  useEffect(() => {
    if (open) {
      setWorkingTreeState(canonical);
      setMessages([]);
    }
    // canonical intentionally excluded — re-running on every planner change
    // while the modal is open would blow away in-flight AI edits.
  }, [open]);

  const setWorkingTree = useCallback((tree: CoachNode | null) => {
    setWorkingTreeState(tree);
  }, []);

  const resetWorkingTree = useCallback(() => {
    setWorkingTreeState(canonical);
  }, [canonical]);

  const hasChanges = useMemo(() => {
    if (workingTree === canonical) return false;
    if (!workingTree || !canonical) return workingTree !== canonical;
    return !treesEqual(workingTree, canonical);
  }, [workingTree, canonical]);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      );
    },
    [],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    workingTree,
    setWorkingTree,
    resetWorkingTree,
    hasChanges,
    messages,
    appendMessage,
    updateMessage,
    clearMessages,
  };
}

// Shallow-fields-plus-child-ids equality. Cheap and sufficient: the AI writes
// wholesale subtree replacements, so a real edit always changes at least one
// title/duration/id/child-ordering.
function treesEqual(a: CoachNode, b: CoachNode): boolean {
  if (
    a.id !== b.id ||
    a.title !== b.title ||
    a.plannerType !== b.plannerType ||
    a.duration !== b.duration ||
    a.deadline !== b.deadline ||
    a.priority !== b.priority ||
    a.isReady !== b.isReady ||
    a.children.length !== b.children.length
  ) {
    return false;
  }
  for (let i = 0; i < a.children.length; i++) {
    if (!treesEqual(a.children[i], b.children[i])) return false;
  }
  return true;
}
