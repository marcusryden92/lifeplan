"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CoachForest } from "./plannerForestToJson";
import { coachForestsEqual } from "./diffCoachForest";

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
  canonical: CoachForest;
}

export interface UseAICoachStateReturn {
  workingForest: CoachForest;
  setWorkingForest: (forest: CoachForest) => void;
  resetWorkingForest: () => void;
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
  const [workingForest, setWorkingForestState] =
    useState<CoachForest>(canonical);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // On modal open, adopt the current canonical as the working copy and start
  // with an empty chat. Re-opening the modal is a fresh session; we don't
  // persist state between opens (matches WeekStructureModal's discard-on-close
  // semantics).
  useEffect(() => {
    if (open) {
      setWorkingForestState(canonical);
      setMessages([]);
    }
    // canonical intentionally excluded — re-running on every planner change
    // while the modal is open would blow away in-flight AI edits.
  }, [open]);

  const setWorkingForest = useCallback((forest: CoachForest) => {
    setWorkingForestState(forest);
  }, []);

  const resetWorkingForest = useCallback(() => {
    setWorkingForestState(canonical);
  }, [canonical]);

  const hasChanges = useMemo(() => {
    if (workingForest === canonical) return false;
    return !coachForestsEqual(workingForest, canonical);
  }, [workingForest, canonical]);

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
    workingForest,
    setWorkingForest,
    resetWorkingForest,
    hasChanges,
    messages,
    appendMessage,
    updateMessage,
    clearMessages,
  };
}
