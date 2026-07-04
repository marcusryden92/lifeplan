"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { Button, Backdrop, Grain, ConfirmModal } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { plannerForestToJson } from "./plannerForestToJson";
import { JsonForestView } from "./JsonTreeView";
import { TemplateWeekView } from "./TemplateWeekView";
import { ChatPane } from "./ChatPane";
import { useAIDraftState } from "./useAIDraftState";
import {
  streamDraft,
  type StreamChatMessage,
  type StreamDraftFocus,
} from "./streamDraft";
import {
  normalizeDraftForest,
  type DraftForestProposal,
} from "./normalizeDraftForest";
import { foldDraftProposals } from "./mergeDraftForest";
import { applyDraftForestToPlanner } from "./applyDraftForestToPlanner";
import { applyDraftTemplates } from "./applyDraftTemplates";
import { templatesToDraft } from "./draftTemplates";
import {
  countTemplateChanges,
  diffDraftTemplates,
} from "./diffDraftTemplates";
import { diffDraftForest } from "./diffDraftForest";
import { diffSubtreeHasChanges } from "./diffDraftTree";

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
  paneTab,
  paneTabLabel,
  tabChangeCount,
  showAllHeaderButton,
  a11yHiddenTitle,
} from "./AIDraftModal.css";

type DraftPaneTab = "goals" | "week";

export interface AIDraftFocus {
  rootId: string | null;
  itemId: string | null;
}

interface AIDraftModalProps {
  open: boolean;
  onClose: () => void;
  focus?: AIDraftFocus | null;
  initialPrompt?: string | null;
}

export function AIDraftModal({
  open,
  onClose,
  focus,
  initialPrompt,
}: AIDraftModalProps) {
  const { planner, categories, template, locations, updateAll, userId } =
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
  const canonicalTemplates = useMemo(
    () => templatesToDraft(template),
    [template],
  );

  const {
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
  } = useAIDraftState({ open, canonical, canonicalTemplates });

  // Recompute on every working/canonical tick. Cheap: pure walks of
  // personal-scale data, no memo cost worth introducing.
  const diffedGoals = diffDraftForest(workingForest, canonical);
  const diffedTemplates = diffDraftTemplates(
    workingTemplates,
    canonicalTemplates,
  );
  const goalChangeCount = diffedGoals.filter(diffSubtreeHasChanges).length;
  const templateChangeCount = countTemplateChanges(diffedTemplates);

  // Goals / Week tabs. During a stream the pane follows the assistant's work
  // (last streamed domain wins) unless the user clicked a tab this turn; the
  // pin resets on each send.
  const [activeTab, setActiveTab] = useState<DraftPaneTab>("goals");
  const tabPinnedRef = useRef(false);
  const selectTab = useCallback((tab: DraftPaneTab) => {
    tabPinnedRef.current = true;
    setActiveTab(tab);
  }, []);
  const autoSwitchTab = useCallback((tab: DraftPaneTab) => {
    if (!tabPinnedRef.current) setActiveTab(tab);
  }, []);
  useEffect(() => {
    if (open) {
      setActiveTab("goals");
      tabPinnedRef.current = false;
    }
  }, [open]);

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

  // Keep the latest working state in refs so the send callback always reads
  // fresh state without having to be recreated on every tick.
  const workingForestRef = useRef(workingForest);
  useEffect(() => {
    workingForestRef.current = workingForest;
  }, [workingForest]);

  const workingTemplatesRef = useRef(workingTemplates);
  useEffect(() => {
    workingTemplatesRef.current = workingTemplates;
  }, [workingTemplates]);

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
      const proposalsByCall = new Map<number, DraftForestProposal>();
      setStreamStatus(null);
      tabPinnedRef.current = false;
      const streamFocus: StreamDraftFocus | null = focus?.rootId
        ? { rootId: focus.rootId, itemId: focus.itemId ?? null }
        : null;

      let assistantText = "";
      let sawForest = false;
      let sawTemplates = false;
      let sawShow = false;
      await streamDraft({
        currentForest: turnStartForest,
        currentTemplates: workingTemplatesRef.current,
        history,
        focus: streamFocus,
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          isStrict: c.isStrict,
          useTimeWindows: c.useTimeWindows,
          timeSlots: c.timeSlots.map((w) => ({
            day: w.day,
            startTime: w.startTime,
            endTime: w.endTime,
          })),
        })),
        locations: locations.map((l) => ({ id: l.id, name: l.name })),
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
          const proposal = normalizeDraftForest(raw);
          if (proposal) {
            proposalsByCall.set(callIndex, proposal);
            const ordered = [...proposalsByCall.keys()]
              .sort((a, b) => a - b)
              .map((idx) => proposalsByCall.get(idx)!);
            setWorkingForest(foldDraftProposals(turnStartForest, ordered));
            autoSwitchTab("goals");
          }
        },
        onTemplates: (templates) => {
          sawTemplates = true;
          // Full authoritative array from the server's working copy — replace
          // wholesale, no folding.
          setWorkingTemplates(templates);
          autoSwitchTab("week");
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
                        : tool === "add_templates"
                          ? `adding ${count} template${plural}…`
                          : tool === "update_templates"
                            ? `editing ${count} template${plural}…`
                            : tool === "delete_templates"
                              ? `deleting ${count} template${plural}…`
                              : null;
          if (label) setStreamStatus(label);
        },
        onShow: ({ goalIds, all }) => {
          sawShow = true;
          autoSwitchTab("goals");
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
          const fallback =
            sawForest && sawTemplates
              ? "Proposed changes — review the Goals and Week tabs."
              : sawTemplates
                ? "Proposed changes — review them on the Week tab."
                : sawForest
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
    [
      appendMessage,
      updateMessage,
      setWorkingForest,
      setWorkingTemplates,
      autoSwitchTab,
      focus,
      categories,
      locations,
    ],
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
    // Clean domains pass undefined so their state keeps identity — one
    // updateAll call means one engine regen and one sync for both domains.
    const nextPlanner = hasForestChanges
      ? applyDraftForestToPlanner({
          planner,
          workingForest,
          userId,
          validCategoryIds: new Set(categories.map((c) => c.id)),
        })
      : undefined;
    const nextTemplates = hasTemplateChanges
      ? applyDraftTemplates({
          current: template,
          canonical: canonicalTemplates,
          working: workingTemplates,
          userId,
          now: new Date().toISOString(),
        })
      : undefined;
    updateAll(nextPlanner, undefined, nextTemplates);
    onClose();
  }, [
    workingForest,
    workingTemplates,
    canonicalTemplates,
    hasChanges,
    hasForestChanges,
    hasTemplateChanges,
    userId,
    planner,
    template,
    categories,
    updateAll,
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
              <button
                type="button"
                className={paneTab}
                data-active={activeTab === "goals" ? "true" : undefined}
                onClick={() => selectTab("goals")}
              >
                <span className={paneTabLabel}>Goals</span>
                {goalChangeCount > 0 && (
                  <span className={tabChangeCount}>{goalChangeCount}</span>
                )}
              </button>
              <button
                type="button"
                className={paneTab}
                data-active={activeTab === "week" ? "true" : undefined}
                onClick={() => selectTab("week")}
              >
                <span className={paneTabLabel}>Week</span>
                {templateChangeCount > 0 && (
                  <span className={tabChangeCount}>{templateChangeCount}</span>
                )}
              </button>
              <span className={paneSubtitle}>
                {hasChanges ? "unsaved changes" : "current state"}
              </span>
              {activeTab === "goals" &&
                (hiddenCount > 0 ? (
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
                ) : null)}
            </div>
            {activeTab === "goals" ? (
              <JsonForestView
                goals={visibleGoals}
                hiddenCount={hiddenCount}
                categories={categories}
                focusRootId={focusRootId}
                groupByCategory={showAll}
              />
            ) : (
              <TemplateWeekView
                templates={diffedTemplates}
                locations={locations}
              />
            )}
          </div>
        </div>

        <ConfirmModal
          open={showDiscardConfirm}
          title="Discard changes?"
          body={
            <p style={{ margin: 0 }}>
              The assistant has proposed changes to your{" "}
              {hasForestChanges && hasTemplateChanges
                ? "goals and weekly schedule"
                : hasTemplateChanges
                  ? "weekly schedule"
                  : "goals"}
              . Closing now will discard them.
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
