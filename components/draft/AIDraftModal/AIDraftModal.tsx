"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import {
  Button,
  Backdrop,
  Grain,
  ConfirmModal,
  SegmentedControl,
} from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { plannerForestToJson } from "./plannerForestToJson";
import { JsonForestView } from "./JsonTreeView";
import { TemplateWeekView } from "./TemplateWeekView";
import { ChatPane } from "./ChatPane";
import { ChatHistoryPopover } from "./ChatHistoryPopover";
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
import { applyDraftWindows } from "./applyDraftWindows";
import { templatesToDraft } from "./draftTemplates";
import { categoriesToDraftWindows } from "./draftWindows";
import {
  countTemplateChanges,
  diffDraftTemplates,
} from "./diffDraftTemplates";
import {
  countWindowChanges,
  diffDraftWindows,
} from "./diffDraftWindows";
import { WindowsView } from "./WindowsView";
import { diffDraftForest } from "./diffDraftForest";
import { diffSubtreeHasChanges } from "./diffDraftTree";

import {
  overlay,
  modal,
  embeddedRoot,
  banner,
  editingLabel,
  bannerTitle,
  bannerSpacer,
  cancelButtonStyle,
  body,
  mobilePaneSwitch,
  paneMobileHidden,
  chatPane,
  chatBasisVar,
  treePane,
  paneDivider,
  paneHeader,
  paneTitle,
  paneSubtitle,
  paneTab,
  paneTabLabel,
  tabChangeCount,
  headerActionButton,
  headerActionCluster,
  a11yHiddenTitle,
} from "./AIDraftModal.css";

type DraftPaneTab = "goals" | "week" | "windows";
type MobilePane = "chat" | "review";

export interface AIDraftFocus {
  rootId: string | null;
  itemId: string | null;
}

function formatDirtyDomains(
  forest: boolean,
  templates: boolean,
  windows: boolean,
): string {
  const parts = [
    forest ? "goals" : null,
    templates ? "weekly schedule" : null,
    windows ? "category windows" : null,
  ].filter((p): p is string => p !== null);
  if (parts.length <= 1) return parts[0] ?? "plan";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

interface AIDraftModalProps {
  open: boolean;
  onClose: () => void;
  focus?: AIDraftFocus | null;
  initialPrompt?: string | null;
  // Programmatic session hint (e.g. "onboarding") — forwarded to the route for
  // a prompt preamble, and used to tune the onboarding instance (empty-state
  // hint, no History popover, no auto-resume).
  intent?: string | null;
  // Embedded mode (onboarding AI step): renders inline in the host's container
  // with no Dialog overlay and no save/cancel banner. The host drives saving
  // via the reported `save` fn and is told when saving finished via onSaved.
  embedded?: boolean;
  onSaved?: () => void;
  onStateChange?: (state: {
    hasChanges: boolean;
    isStreaming: boolean;
    save: () => void;
  }) => void;
}

export function AIDraftModal({
  open,
  onClose,
  focus,
  initialPrompt,
  intent,
  embedded = false,
  onSaved,
  onStateChange,
}: AIDraftModalProps) {
  const { planner, categories, template, locations, updateAll, userId } =
    useCalendarProvider();
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [chatBasisPct, setChatBasisPct] = useState(50);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const onDividerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const bodyRect = bodyRef.current?.getBoundingClientRect();
      if (!bodyRect) return;
      const startX = e.clientX;
      const startPct = chatBasisPct;
      const bodyWidth = bodyRect.width;
      setIsDraggingDivider(true);

      const onMove = (ev: PointerEvent) => {
        const deltaX = ev.clientX - startX;
        const deltaPct = (deltaX / bodyWidth) * 100;
        // Clamp to keep both panes usable; matches the CSS minWidth on each.
        setChatBasisPct(Math.max(20, Math.min(80, startPct + deltaPct)));
      };
      const onUp = () => {
        setIsDraggingDivider(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [chatBasisPct],
  );

  const onDividerKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step =
      e.key === "ArrowLeft" ? -4 : e.key === "ArrowRight" ? 4 : null;
    if (step === null) return;
    e.preventDefault();
    setChatBasisPct((prev) => Math.max(20, Math.min(80, prev + step)));
  }, []);

  const canonical = useMemo(() => plannerForestToJson(planner), [planner]);
  const canonicalTemplates = useMemo(
    () => templatesToDraft(template),
    [template],
  );
  const canonicalWindows = useMemo(
    () => categoriesToDraftWindows(categories),
    [categories],
  );

  const {
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
  } = useAIDraftState({
    open,
    canonical,
    canonicalTemplates,
    canonicalWindows,
    autoResume: intent !== "onboarding",
  });

  // Recompute on every working/canonical tick. Cheap: pure walks of
  // personal-scale data, no memo cost worth introducing.
  const diffedGoals = diffDraftForest(workingForest, canonical);
  const diffedTemplates = diffDraftTemplates(
    workingTemplates,
    canonicalTemplates,
  );
  const diffedWindows = diffDraftWindows(workingWindows, canonicalWindows);
  const goalChangeCount = diffedGoals.filter(diffSubtreeHasChanges).length;
  const templateChangeCount = countTemplateChanges(diffedTemplates);
  const windowChangeCount = countWindowChanges(diffedWindows);
  const reviewChangeCount =
    goalChangeCount + templateChangeCount + windowChangeCount;

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
  // On mobile only one pane renders at a time (CSS hides the other); this is
  // a render filter only — the hidden pane stays mounted so streams and
  // working state keep flowing.
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");
  useEffect(() => {
    if (open) {
      setActiveTab("goals");
      tabPinnedRef.current = false;
      setMobilePane("chat");
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

  const workingWindowsRef = useRef(workingWindows);
  useEffect(() => {
    workingWindowsRef.current = workingWindows;
  }, [workingWindows]);

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
      const completedCalls = new Set<number>();
      setStreamStatus(null);
      tabPinnedRef.current = false;
      const streamFocus: StreamDraftFocus | null = focus?.rootId
        ? { rootId: focus.rootId, itemId: focus.itemId ?? null }
        : null;

      let assistantText = "";
      let sawForest = false;
      let sawTemplates = false;
      let sawWindows = false;
      let sawShow = false;
      let finished = false;
      // Categories ride from the WORKING windows state, not the provider —
      // pending window/flag drafts must be visible to the model on the next
      // turn (names still come from the provider; only the assistant-editable
      // parts are draft-backed).
      const windowsState = workingWindowsRef.current;
      const settingsById = new Map(windowsState.settings.map((s) => [s.id, s]));
      await streamDraft({
        currentForest: turnStartForest,
        currentTemplates: workingTemplatesRef.current,
        history,
        focus: streamFocus,
        categories: categories.map((c) => {
          const setting = settingsById.get(c.id);
          return {
            id: c.id,
            name: c.name,
            isStrict: setting?.isStrict ?? c.isStrict,
            useTimeWindows: setting?.useTimeWindows ?? c.useTimeWindows,
            timeSlots: windowsState.windows
              .filter((w) => w.categoryId === c.id)
              .map((w) => ({
                id: w.id,
                day: w.day,
                startTime: w.startTime,
                endTime: w.endTime,
              })),
          };
        }),
        locations: locations.map((l) => ({ id: l.id, name: l.name })),
        // Local date, not server UTC — deadlines are user-local decisions.
        today: format(new Date(), "yyyy-MM-dd"),
        intent,
        signal: controller.signal,
        onText: (delta) => {
          assistantText += delta;
          setStreamStatus(null);
          updateMessage(assistantMessageId, { content: assistantText });
        },
        onForest: ({ callIndex, proposal: raw, complete }) => {
          sawForest = true;
          const proposal = normalizeDraftForest(raw);
          if (proposal) {
            proposalsByCall.set(callIndex, proposal);
            if (complete) completedCalls.add(callIndex);
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
        onWindows: (state) => {
          sawWindows = true;
          setWorkingWindows(state);
          autoSwitchTab("windows");
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
                              : tool === "add_time_windows"
                                ? `adding ${count} window${plural}…`
                                : tool === "update_time_windows"
                                  ? `editing ${count} window${plural}…`
                                  : tool === "delete_time_windows"
                                    ? `deleting ${count} window${plural}…`
                                    : tool === "update_categories"
                                      ? `updating ${count} categor${count === 1 ? "y" : "ies"}…`
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
          finished = true;
          setStreamStatus(null);
          // A tool-only turn produces no prose; fill the bubble so it isn't
          // blank (this fallback also enters future history as the
          // assistant's reply).
          const touchedTabs = [
            sawForest ? "Goals" : null,
            sawTemplates ? "Week" : null,
            sawWindows ? "Windows" : null,
          ].filter((t): t is string => t !== null);
          const fallback =
            touchedTabs.length > 0
              ? `Proposed changes — review the ${touchedTabs.join(" and ")} tab${
                  touchedTabs.length === 1 ? "" : "s"
                }.`
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
          finished = true;
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

      // An aborted stream (Stop button or modal close) resolves without
      // reaching onDone/onError. Completed work stays, but a propose_goals
      // call cut off mid-stream leaves a truncated tree in the fold — refold
      // with only the calls whose finalized emit arrived before the abort.
      if (!finished) {
        setStreamStatus(null);
        if (completedCalls.size < proposalsByCall.size) {
          const completeOrdered = [...proposalsByCall.keys()]
            .filter((idx) => completedCalls.has(idx))
            .sort((a, b) => a - b)
            .map((idx) => proposalsByCall.get(idx)!);
          setWorkingForest(
            foldDraftProposals(turnStartForest, completeOrdered),
          );
        }
        updateMessage(assistantMessageId, {
          streaming: false,
          ...(assistantText.trim().length === 0
            ? { content: "Stopped." }
            : {}),
        });
      }

      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    },
    [
      appendMessage,
      updateMessage,
      setWorkingForest,
      setWorkingTemplates,
      setWorkingWindows,
      autoSwitchTab,
      focus,
      categories,
      locations,
      intent,
    ],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

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
          categoryColorById: new Map(categories.map((c) => [c.id, c.color])),
        })
      : undefined;
    const now = new Date().toISOString();
    const nextTemplates = hasTemplateChanges
      ? applyDraftTemplates({
          current: template,
          canonical: canonicalTemplates,
          working: workingTemplates,
          userId,
          now,
        })
      : undefined;
    const nextCategories = hasWindowChanges
      ? applyDraftWindows({
          currentCategories: categories,
          canonical: canonicalWindows,
          working: workingWindows,
          userId,
          now,
        })
      : undefined;
    updateAll(nextPlanner, undefined, nextTemplates, nextCategories);
    if (embedded) onSaved?.();
    else onClose();
  }, [
    workingForest,
    workingTemplates,
    workingWindows,
    canonicalTemplates,
    canonicalWindows,
    hasChanges,
    hasForestChanges,
    hasTemplateChanges,
    hasWindowChanges,
    userId,
    planner,
    template,
    categories,
    updateAll,
    onClose,
    embedded,
    onSaved,
  ]);

  // In embedded mode the host (onboarding) owns the Save action, so surface the
  // current dirty/streaming state and a save handle it can call from its own
  // footer.
  useEffect(() => {
    if (!embedded) return;
    onStateChange?.({ hasChanges, isStreaming, save: handleSave });
  }, [embedded, hasChanges, isStreaming, handleSave, onStateChange]);

  const content = (
    <>
      <Backdrop variant="blob" />
      <Grain />

      {!embedded && (
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
      )}

      <div className={mobilePaneSwitch}>
          <SegmentedControl<MobilePane>
            options={[
              { key: "chat", label: "Chat" },
              {
                key: "review",
                label: (
                  <>
                    Review
                    {reviewChangeCount > 0 && (
                      <span className={tabChangeCount}>
                        {reviewChangeCount}
                      </span>
                    )}
                  </>
                ),
              },
            ]}
            value={mobilePane}
            onChange={setMobilePane}
          />
        </div>

        <div className={body} ref={bodyRef}>
          <div
            className={`${chatPane} ${
              mobilePane === "chat" ? "" : paneMobileHidden
            }`}
            style={assignInlineVars({ [chatBasisVar]: `${chatBasisPct}%` })}
          >
            <div className={paneHeader}>
              <h2 className={paneTitle}>Chat</h2>
              <span className={paneSubtitle}>
                {isStreaming
                  ? streamStatus ?? "assistant is thinking…"
                  : "send a prompt to begin"}
              </span>
              <span className={headerActionCluster}>
                {intent !== "onboarding" && (
                  <ChatHistoryPopover
                    currentConversationId={conversationId}
                    disabled={isStreaming}
                    onAdopt={adoptConversation}
                    onDeletedCurrent={startNewConversation}
                  />
                )}
                {messages.length > 0 && !isStreaming && (
                  <button
                    type="button"
                    className={headerActionButton}
                    onClick={startNewConversation}
                  >
                    New chat
                  </button>
                )}
              </span>
            </div>
            <ChatPane
              messages={messages}
              onSend={handleSend}
              onStop={handleStop}
              isStreaming={isStreaming}
              initialDraft={open ? initialPrompt ?? null : null}
              emptyHint={
                intent === "onboarding"
                  ? "Ask the assistant to help — it can turn what you jotted into real goals and set the deadlines and durations they need. Nothing is saved until you continue."
                  : undefined
              }
            />
          </div>
          <div
            className={paneDivider}
            data-dragging={isDraggingDivider ? "true" : undefined}
            onPointerDown={onDividerPointerDown}
            onKeyDown={onDividerKeyDown}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat / tree panes"
            tabIndex={0}
          />
          <div
            className={`${treePane} ${
              mobilePane === "review" ? "" : paneMobileHidden
            }`}
          >
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
              <button
                type="button"
                className={paneTab}
                data-active={activeTab === "windows" ? "true" : undefined}
                onClick={() => selectTab("windows")}
              >
                <span className={paneTabLabel}>Windows</span>
                {windowChangeCount > 0 && (
                  <span className={tabChangeCount}>{windowChangeCount}</span>
                )}
              </button>
              <span className={paneSubtitle}>
                {hasChanges ? "unsaved changes" : "current state"}
              </span>
              {activeTab === "goals" &&
                (hiddenCount > 0 ? (
                  <span className={headerActionCluster}>
                    <button
                      type="button"
                      className={headerActionButton}
                      onClick={() => setShowAll(true)}
                    >
                      Show all · {hiddenCount} more goal
                      {hiddenCount === 1 ? "" : "s"}
                    </button>
                  </span>
                ) : showAll && visibleGoals.length > 0 ? (
                  <span className={headerActionCluster}>
                    <button
                      type="button"
                      className={headerActionButton}
                      onClick={() => setShowAll(false)}
                    >
                      Show relevant only
                    </button>
                  </span>
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
            ) : activeTab === "week" ? (
              <TemplateWeekView
                templates={diffedTemplates}
                locations={locations}
              />
            ) : (
              <WindowsView diffed={diffedWindows} categories={categories} />
            )}
          </div>
        </div>

      {!embedded && (
        <ConfirmModal
          open={showDiscardConfirm}
          title="Discard changes?"
          body={
            <p style={{ margin: 0 }}>
              The assistant has proposed changes to your{" "}
              {formatDirtyDomains(
                hasForestChanges,
                hasTemplateChanges,
                hasWindowChanges,
              )}
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
      )}
    </>
  );

  if (embedded) {
    return <div className={embeddedRoot}>{content}</div>;
  }

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
        {content}
      </Dialog.Content>
    </Dialog.Root>
  );
}
