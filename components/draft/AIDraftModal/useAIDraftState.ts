"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DraftForest } from "./plannerForestToJson";
import { draftForestsEqual } from "./diffDraftForest";
import { draftTemplatesEqual, type DraftTemplate } from "./draftTemplates";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  // Streaming assistant messages render with a live indicator until the
  // response completes.
  streaming?: boolean;
}

export interface UseAIDraftStateArgs {
  open: boolean;
  canonical: DraftForest;
  canonicalTemplates: DraftTemplate[];
}

export interface UseAIDraftStateReturn {
  workingForest: DraftForest;
  setWorkingForest: (forest: DraftForest) => void;
  workingTemplates: DraftTemplate[];
  setWorkingTemplates: (templates: DraftTemplate[]) => void;
  hasForestChanges: boolean;
  hasTemplateChanges: boolean;
  hasChanges: boolean;

  messages: ChatMessage[];
  appendMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearMessages: () => void;
}

export function useAIDraftState({
  open,
  canonical,
  canonicalTemplates,
}: UseAIDraftStateArgs): UseAIDraftStateReturn {
  const [workingForest, setWorkingForestState] =
    useState<DraftForest>(canonical);
  const [workingTemplates, setWorkingTemplatesState] =
    useState<DraftTemplate[]>(canonicalTemplates);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // On modal open, adopt the current canonical as the working copy and start
  // with an empty chat. Re-opening the modal is a fresh session; we don't
  // persist state between opens (matches WeekStructureModal's discard-on-close
  // semantics).
  useEffect(() => {
    if (open) {
      setWorkingForestState(canonical);
      setWorkingTemplatesState(canonicalTemplates);
      setMessages([]);
    }
    // canonical/canonicalTemplates intentionally excluded — re-running on
    // every planner or template change while the modal is open would blow
    // away in-flight AI edits.
  }, [open]);

  const setWorkingForest = useCallback((forest: DraftForest) => {
    setWorkingForestState(forest);
  }, []);

  const setWorkingTemplates = useCallback((templates: DraftTemplate[]) => {
    setWorkingTemplatesState(templates);
  }, []);

  const hasForestChanges = useMemo(() => {
    if (workingForest === canonical) return false;
    return !draftForestsEqual(workingForest, canonical);
  }, [workingForest, canonical]);

  const hasTemplateChanges = useMemo(() => {
    if (workingTemplates === canonicalTemplates) return false;
    return !draftTemplatesEqual(workingTemplates, canonicalTemplates);
  }, [workingTemplates, canonicalTemplates]);

  const hasChanges = hasForestChanges || hasTemplateChanges;

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
    workingTemplates,
    setWorkingTemplates,
    hasForestChanges,
    hasTemplateChanges,
    hasChanges,
    messages,
    appendMessage,
    updateMessage,
    clearMessages,
  };
}
