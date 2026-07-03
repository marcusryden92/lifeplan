"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { Button, Backdrop, Grain, ConfirmModal } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { plannerForestToJson } from "./plannerForestToJson";
import { JsonForestView } from "./JsonTreeView";
import { ChatPane } from "./ChatPane";
import { useAICoachState } from "./useAICoachState";
import {
  streamCoach,
  type StreamChatMessage,
  type StreamCoachFocus,
} from "./streamCoach";
import {
  normalizeCoachForest,
  type CoachForestProposal,
} from "./normalizeCoachForest";
import { foldCoachProposals } from "./mergeCoachForest";
import { applyCoachForestToPlanner } from "./applyCoachForestToPlanner";
import { diffCoachForest } from "./diffCoachForest";
import { diffSubtreeHasChanges } from "./diffCoachTree";

import {
  overlay,
  modal,
  banner,
  editingLabel,
  bannerTitle,
  bannerSpacer,
  cancelButtonStyle,
  body,
  chatPane,
  treePane,
  paneDivider,
  paneHeader,
  paneTitle,
  paneSubtitle,
  showAllHeaderButton,
  a11yHiddenTitle,
} from "./AICoachModal.css";

export interface AICoachFocus {
  rootId: string | null;
  itemId: string | null;
}

interface AICoachModalProps {
  open: boolean;
  onClose: () => void;
  focus?: AICoachFocus | null;
  initialPrompt?: string | null;
}

export function AICoachModal({
  open,
  onClose,
  focus,
  initialPrompt,
}: AICoachModalProps) {
  const { planner, categories, updatePlannerArray, userId } =
    useCalendarProvider();
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [chatBasisPct, setChatBasisPct] = useState(50);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const onDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const bodyRect = bodyRef.current?.getBoundingClientRect();
      if (!bodyRect) return;
      const startX = e.clientX;
      const startPct = chatBasisPct;
      const bodyWidth = bodyRect.width;
      setIsDraggingDivider(true);

      const onMove = (ev: MouseEvent) => {
        const deltaX = ev.clientX - startX;
        const deltaPct = (deltaX / bodyWidth) * 100;
        // Clamp to keep both panes usable; matches the CSS minWidth on each.
        setChatBasisPct(Math.max(20, Math.min(80, startPct + deltaPct)));
      };
      const onUp = () => {
        setIsDraggingDivider(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [chatBasisPct],
  );

  const canonical = useMemo(() => plannerForestToJson(planner), [planner]);

  const {
    workingForest,
    setWorkingForest,
    hasChanges,
    messages,
    appendMessage,
    updateMessage,
  } = useAICoachState({ open, canonical });

  // Recompute on every workingForest/canonical tick. Cheap: pure walk of a
  // personal-scale forest, no memo cost worth introducing.
  const diffedGoals = diffCoachForest(workingForest, canonical);

  // The tree pane shows a relevance-scoped subset: the focused goal, goals
  // the AI touched (any diff status in the subtree), and goals brought into
  // view via show_goals — with a manual show-all escape hatch. The working
  // forest itself always stays complete; this is a render filter only, so
  // Save/delete semantics are unaffected.
  const [showAll, setShowAll] = useState(false);
  const [shownGoalIds, setShownGoalIds] = useState<Set<string>>(new Set());
  const focusRootId = focus?.rootId ?? null;
  useEffect(() => {
    if (open) {
      setShowAll(false);
      setShownGoalIds(focusRootId ? new Set([focusRootId]) : new Set());
    }
  }, [open, focusRootId]);

  const visibleGoals = showAll
    ? diffedGoals
    : diffedGoals.filter(
        (g) => shownGoalIds.has(g.id) || diffSubtreeHasChanges(g),
      );
  const hiddenCount = diffedGoals.length - visibleGoals.length;

  const focusedGoalTitle = focusRootId
    ? canonical.goals.find((g) => g.id === focusRootId)?.title ?? null
    : null;

  // Keep the latest workingForest in a ref so the send callback always reads
  // fresh state without having to be recreated on every forest tick.
  const workingForestRef = useRef(workingForest);
  useEffect(() => {
    workingForestRef.current = workingForest;
  }, [workingForest]);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const isStreaming = messages.some((m) => m.streaming);

  // Abort any in-flight stream when the modal closes.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [open]);

  const handleSend = useCallback(
    async (content: string) => {
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();

      // Tool-only turns can leave an assistant message with empty content;
      // the server rejects empty history entries, so drop them here.
      const history: StreamChatMessage[] = [
        ...messagesRef.current
          .filter((m) => m.content.trim().length > 0)
          .map((m) => ({
            role: m.role,
            content: m.content,
          })),
        { role: "user", content },
      ];

      appendMessage({ id: userMessageId, role: "user", content });
      appendMessage({
        id: assistantMessageId,
        role: "assistant",
        content: "",
        streaming: true,
      });

      const controller = new AbortController();
      abortRef.current = controller;

      // Snapshot the working forest once per send. Every propose_goals call
      // streams partial re-parses keyed by callIndex; folding the latest
      // snapshot of each call over this same base means re-parses replace
      // (never compound) while multiple calls in one turn still stack.
      const turnStartForest = workingForestRef.current;
      const proposalsByCall = new Map<number, CoachForestProposal>();
      setStreamStatus(null);
      const streamFocus: StreamCoachFocus | null = focus?.rootId
        ? { rootId: focus.rootId, itemId: focus.itemId ?? null }
        : null;

      let assistantText = "";
      let sawForest = false;
      let sawShow = false;
      await streamCoach({
        currentForest: turnStartForest,
        history,
        focus: streamFocus,
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
        // Local date, not server UTC — deadlines are user-local decisions.
        today: format(new Date(), "yyyy-MM-dd"),
        signal: controller.signal,
        onText: (delta) => {
          assistantText += delta;
          setStreamStatus(null);
          updateMessage(assistantMessageId, { content: assistantText });
        },
        onForest: ({ callIndex, proposal: raw }) => {
          sawForest = true;
          const proposal = normalizeCoachForest(raw);
          if (proposal) {
            proposalsByCall.set(callIndex, proposal);
            const ordered = [...proposalsByCall.keys()]
              .sort((a, b) => a - b)
              .map((idx) => proposalsByCall.get(idx)!);
            setWorkingForest(foldCoachProposals(turnStartForest, ordered));
          }
        },
        onStatus: ({ tool, count }) => {
          const plural = count === 1 ? "" : "s";
          const label =
            tool === "get_goal_trees"
              ? `reading ${count} goal${plural}…`
              : tool === "search_items"
                ? "searching…"
                : tool === "update_items"
                  ? `editing ${count} item${plural}…`
                  : tool === "move_item"
                    ? "moving an item…"
                    : tool === "add_items"
                      ? `adding ${count} item${plural}…`
                      : tool === "delete_items"
                        ? `deleting ${count} item${plural}…`
                        : null;
          if (label) setStreamStatus(label);
        },
        onShow: ({ goalIds, all }) => {
          sawShow = true;
          if (all) setShowAll(true);
          else if (goalIds.length > 0) {
            // A specific-goal show reads as narrowing ("open just X"), so it
            // also exits show-all mode; ids still union across turns.
            setShowAll(false);
            setShownGoalIds((prev) => new Set([...prev, ...goalIds]));
          }
        },
        onDone: () => {
          setStreamStatus(null);
          // A tool-only turn produces no prose; fill the bubble so it isn't
          // blank (this fallback also enters future history as the
          // assistant's reply).
          const fallback = sawForest
            ? "Proposed changes — review them in the goals pane."
            : sawShow
              ? "Brought them into view in the goals pane."
              : "Done.";
          updateMessage(assistantMessageId, {
            streaming: false,
            ...(assistantText.trim().length === 0
              ? { content: fallback }
              : {}),
          });
        },
        onError: (message) => {
          setStreamStatus(null);
          updateMessage(assistantMessageId, {
            content:
              assistantText.length > 0
                ? `${assistantText}\n\n[Error: ${message}]`
                : `[Error: ${message}]`,
            streaming: false,
          });
        },
      });

      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    },
    [appendMessage, updateMessage, setWorkingForest, focus, categories],
  );

  const requestClose = useCallback(() => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [hasChanges, onClose]);

  const handleSave = useCallback(() => {
    if (!hasChanges || !userId) return;
    const nextPlanner = applyCoachForestToPlanner({
      planner,
      workingForest,
      userId,
      validCategoryIds: new Set(categories.map((c) => c.id)),
    });
    updatePlannerArray(nextPlanner);
    onClose();
  }, [
    workingForest,
    hasChanges,
    userId,
    planner,
    categories,
    updatePlannerArray,
    onClose,
  ]);

  return (
    <Dialog.Root
      open={open}
      // Non-modal: the sidebar stays interactive while the assistant is open
      // (theme toggle, nav). Dismissal is Esc / the Close button only.
      modal={false}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <Dialog.Overlay className={overlay} />
      <Dialog.Content
        className={modal}
        aria-describedby={undefined}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <Dialog.Title className={a11yHiddenTitle}>AI Assistant</Dialog.Title>
        <Backdrop variant="blob" />
        <Grain />

        <div className={banner}>
          <span className={editingLabel}>ai assistant</span>
          <span className={bannerTitle}>{focusedGoalTitle ?? "All goals"}</span>
          <span className={bannerSpacer} />
          <Button
            variant="glass"
            size="sm"
            onClick={requestClose}
            className={cancelButtonStyle}
          >
            {hasChanges ? "Cancel" : "Close"}
          </Button>
          <Button
            variant="solidLight"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isStreaming || !userId}
          >
            {hasChanges ? "Save changes" : "Save"}
          </Button>
        </div>

        <div className={body} ref={bodyRef}>
          <div className={chatPane} style={{ flex: `0 0 ${chatBasisPct}%` }}>
            <div className={paneHeader}>
              <h2 className={paneTitle}>Chat</h2>
              <span className={paneSubtitle}>
                {isStreaming
                  ? streamStatus ?? "assistant is thinking…"
                  : "send a prompt to begin"}
              </span>
            </div>
            <ChatPane
              messages={messages}
              onSend={handleSend}
              disabled={isStreaming}
              initialDraft={open ? initialPrompt ?? null : null}
            />
          </div>
          <div
            className={paneDivider}
            data-dragging={isDraggingDivider ? "true" : undefined}
            onMouseDown={onDividerMouseDown}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat / tree panes"
          />
          <div className={treePane} style={{ flex: "1 1 0" }}>
            <div className={paneHeader}>
              <h2 className={paneTitle}>Goals</h2>
              <span className={paneSubtitle}>
                {hasChanges ? "unsaved changes" : "current goals"}
              </span>
              {hiddenCount > 0 ? (
                <button
                  type="button"
                  className={showAllHeaderButton}
                  onClick={() => setShowAll(true)}
                >
                  Show all · {hiddenCount} more goal
                  {hiddenCount === 1 ? "" : "s"}
                </button>
              ) : showAll && visibleGoals.length > 0 ? (
                <button
                  type="button"
                  className={showAllHeaderButton}
                  onClick={() => setShowAll(false)}
                >
                  Show relevant only
                </button>
              ) : null}
            </div>
            <JsonForestView
              goals={visibleGoals}
              hiddenCount={hiddenCount}
              categories={categories}
              focusRootId={focusRootId}
            />
          </div>
        </div>

        <ConfirmModal
          open={showDiscardConfirm}
          title="Discard changes?"
          body={
            <p style={{ margin: 0 }}>
              The assistant has proposed changes to your goals. Closing now
              will discard them.
            </p>
          }
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          tone="danger"
          onCancel={() => setShowDiscardConfirm(false)}
          onConfirm={() => {
            setShowDiscardConfirm(false);
            onClose();
          }}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
