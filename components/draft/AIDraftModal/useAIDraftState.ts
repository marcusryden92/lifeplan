"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getDraftConversation,
  listDraftConversations,
  upsertDraftConversation,
  type DraftConversationMessage,
} from "@/actions/draftConversations";
import type { DraftForest } from "./plannerForestToJson";
import { draftForestsEqual } from "./diffDraftForest";
import { draftTemplatesEqual, type DraftTemplate } from "./draftTemplates";
import {
  draftWindowsStateEqual,
  type DraftWindowsState,
} from "./draftWindows";

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
  // True once the initial calendar snapshot has hydrated. Seeding waits for
  // it: a modal that is open before hydration (onboarding resumed on the AI
  // step, or mod+I in the first moments after load) would otherwise adopt an
  // EMPTY canonical as the working copy — every real item then diffs as
  // deleted, the model is sent an empty forest, and a save would actually
  // delete everything.
  ready: boolean;
  canonical: DraftForest;
  canonicalTemplates: DraftTemplate[];
  canonicalWindows: DraftWindowsState;
  // Adopt the most recent conversation on first open. Off for the onboarding
  // instance, which always starts on a fresh chat.
  autoResume?: boolean;
}

export interface UseAIDraftStateReturn {
  workingForest: DraftForest;
  setWorkingForest: (forest: DraftForest) => void;
  workingTemplates: DraftTemplate[];
  setWorkingTemplates: (templates: DraftTemplate[]) => void;
  workingWindows: DraftWindowsState;
  setWorkingWindows: (state: DraftWindowsState) => void;
  hasForestChanges: boolean;
  hasTemplateChanges: boolean;
  hasWindowChanges: boolean;
  hasChanges: boolean;

  messages: ChatMessage[];
  appendMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;

  conversationId: string;
  startNewConversation: () => void;
  adoptConversation: (payload: {
    id: string;
    messages: DraftConversationMessage[];
  }) => void;
}

export function useAIDraftState({
  open,
  ready,
  canonical,
  canonicalTemplates,
  canonicalWindows,
  autoResume = true,
}: UseAIDraftStateArgs): UseAIDraftStateReturn {
  const [workingForest, setWorkingForestState] =
    useState<DraftForest>(canonical);
  const [workingTemplates, setWorkingTemplatesState] =
    useState<DraftTemplate[]>(canonicalTemplates);
  const [workingWindows, setWorkingWindowsState] =
    useState<DraftWindowsState>(canonicalWindows);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Minted fresh per chat; becomes the DraftConversation row id on the first
  // persisted turn. Empty conversations never reach the DB.
  const [conversationId, setConversationId] = useState(() => uuidv4());

  // On modal open, adopt the current canonical as the working copy — unsaved
  // drafts follow WeekStructureModal's discard-on-close semantics. The chat
  // itself persists across close/reopen (the modal stays mounted in the
  // shell); "New chat" is the explicit reset.
  //
  // Waits for `ready` so an open-before-hydration modal reseeds the moment
  // the real data lands; layout effect so the reseed commits before paint
  // (no flash of every item badged as deleted).
  useLayoutEffect(() => {
    if (open && ready) {
      setWorkingForestState(canonical);
      setWorkingTemplatesState(canonicalTemplates);
      setWorkingWindowsState(canonicalWindows);
    }
    // canonical* intentionally excluded — re-running on every planner,
    // template, or category change while the modal is open would blow away
    // in-flight AI edits.
  }, [open, ready]);

  const setWorkingForest = useCallback((forest: DraftForest) => {
    setWorkingForestState(forest);
  }, []);

  const setWorkingTemplates = useCallback((templates: DraftTemplate[]) => {
    setWorkingTemplatesState(templates);
  }, []);

  const setWorkingWindows = useCallback((state: DraftWindowsState) => {
    setWorkingWindowsState(state);
  }, []);

  // All three gate on `ready`: until the working copies have been seeded from
  // hydrated data, any apparent diff is the stale pre-hydration seed and must
  // not enable Save.
  const hasForestChanges = useMemo(() => {
    if (!ready || workingForest === canonical) return false;
    return !draftForestsEqual(workingForest, canonical);
  }, [ready, workingForest, canonical]);

  const hasTemplateChanges = useMemo(() => {
    if (!ready || workingTemplates === canonicalTemplates) return false;
    return !draftTemplatesEqual(workingTemplates, canonicalTemplates);
  }, [ready, workingTemplates, canonicalTemplates]);

  const hasWindowChanges = useMemo(() => {
    if (!ready || workingWindows === canonicalWindows) return false;
    return !draftWindowsStateEqual(workingWindows, canonicalWindows);
  }, [ready, workingWindows, canonicalWindows]);

  const hasChanges = hasForestChanges || hasTemplateChanges || hasWindowChanges;

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

  // Guards against re-persisting content that is already in the DB — an
  // adopted conversation must not bump its own updatedAt (and reorder the
  // history list) just because it was loaded.
  const lastPersistedRef = useRef<string | null>(null);

  const startNewConversation = useCallback(() => {
    setConversationId(uuidv4());
    setMessages([]);
    lastPersistedRef.current = null;
  }, []);

  const adoptConversation = useCallback(
    ({
      id,
      messages: adopted,
    }: {
      id: string;
      messages: DraftConversationMessage[];
    }) => {
      setConversationId(id);
      setMessages(adopted);
      lastPersistedRef.current = JSON.stringify([id, adopted]);
    },
    [],
  );

  // Persistence: one debounced upsert whenever the chat settles (no message
  // streaming) with content the DB hasn't seen. Covers normal turns, aborted
  // turns, and multi-tool turns without threading saves through handleSend.
  useEffect(() => {
    if (messages.length === 0) return;
    if (messages.some((m) => m.streaming)) return;
    const settled: DraftConversationMessage[] = messages
      .filter((m) => m.content.trim().length > 0)
      .map(({ id, role, content }) => ({ id, role, content }));
    if (settled.length === 0) return;
    const serialized = JSON.stringify([conversationId, settled]);
    if (serialized === lastPersistedRef.current) return;

    const firstUserMessage = settled.find((m) => m.role === "user");
    const title = (firstUserMessage?.content ?? "Untitled").slice(0, 80);
    const timer = setTimeout(() => {
      lastPersistedRef.current = serialized;
      // Fire-and-forget: a failed save costs this turn's history entry, not
      // the conversation itself.
      upsertDraftConversation({
        id: conversationId,
        title,
        messages: settled,
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [messages, conversationId]);

  // Auto-resume: on the first open of a fresh page load, adopt the most
  // recent conversation so "shut down and reopen" lands where the user
  // left off. Any failure degrades silently to an empty chat.
  const resumeAttemptedRef = useRef(false);
  const messageCountRef = useRef(0);
  useEffect(() => {
    messageCountRef.current = messages.length;
  }, [messages]);
  useEffect(() => {
    if (!open || resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;
    if (!autoResume) return;
    if (messageCountRef.current > 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await listDraftConversations();
        if (cancelled || list.length === 0) return;
        const conversation = await getDraftConversation(list[0].id);
        if (cancelled || messageCountRef.current > 0) return;
        adoptConversation({
          id: conversation.id,
          messages: conversation.messages,
        });
      } catch {
        // No history or fetch failure — start empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, autoResume, adoptConversation]);

  return {
    workingForest,
    setWorkingForest,
    workingTemplates,
    setWorkingTemplates,
    workingWindows,
    setWorkingWindows,
    hasForestChanges,
    hasTemplateChanges,
    hasWindowChanges,
    hasChanges,
    messages,
    appendMessage,
    updateMessage,
    conversationId,
    startNewConversation,
    adoptConversation,
  };
}
