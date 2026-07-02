"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { v4 as uuidv4 } from "uuid";
import { Button, Backdrop, Grain, ConfirmModal } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { plannerTreeToJson } from "./plannerTreeToJson";
import { JsonTreeView } from "./JsonTreeView";
import { ChatPane } from "./ChatPane";
import { useAICoachState } from "./useAICoachState";
import { streamCoach, type StreamChatMessage } from "./streamCoach";
import { normalizeCoachTree } from "./normalizeCoachTree";
import { applyCoachTreeToPlanner } from "./applyCoachTreeToPlanner";
import { diffCoachTree } from "./diffCoachTree";

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
  a11yHiddenTitle,
} from "./AICoachModal.css";

interface AICoachModalProps {
  open: boolean;
  onClose: () => void;
  rootId: string;
}

export function AICoachModal({ open, onClose, rootId }: AICoachModalProps) {
  const { planner, updatePlannerArray, userId } = useCalendarProvider();
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [chatBasisPct, setChatBasisPct] = useState(50);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
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

  const canonical = useMemo(
    () => plannerTreeToJson(planner, rootId),
    [planner, rootId],
  );

  // Recompute on every workingTree/canonical tick. Cheap: pure walk of a
  // typically-small subtree, no memo cost worth introducing.

  const {
    workingTree,
    setWorkingTree,
    hasChanges,
    messages,
    appendMessage,
    updateMessage,
  } = useAICoachState({ open, canonical });

  useEffect(() => {
    if (open && workingTree) {
      console.log(
        "[coach] tree JSON:\n" + JSON.stringify(workingTree, null, 2),
      );
    }
  }, [open, workingTree]);

  // Keep the latest workingTree in a ref so the send callback always reads
  // fresh state without having to be recreated on every tree tick.
  const workingTreeRef = useRef(workingTree);
  useEffect(() => {
    workingTreeRef.current = workingTree;
  }, [workingTree]);

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

      const history: StreamChatMessage[] = [
        ...messagesRef.current.map((m) => ({
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

      let assistantText = "";
      await streamCoach({
        currentTree: workingTreeRef.current,
        history,
        signal: controller.signal,
        onText: (delta) => {
          assistantText += delta;
          updateMessage(assistantMessageId, { content: assistantText });
        },
        onTree: (tree) => {
          const normalized = normalizeCoachTree(tree);
          if (normalized) setWorkingTree(normalized);
        },
        onDone: () => {
          updateMessage(assistantMessageId, { streaming: false });
        },
        onError: (message) => {
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
    [appendMessage, updateMessage, setWorkingTree],
  );

  const requestClose = useCallback(() => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [hasChanges, onClose]);

  const handleSave = useCallback(() => {
    if (!workingTree || !hasChanges || !userId) return;
    const nextPlanner = applyCoachTreeToPlanner({
      planner,
      rootId,
      workingTree,
      userId,
    });
    updatePlannerArray(nextPlanner);
    onClose();
  }, [
    workingTree,
    hasChanges,
    userId,
    planner,
    rootId,
    updatePlannerArray,
    onClose,
  ]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <Dialog.Overlay className={overlay} />
      <Dialog.Content
        className={modal}
        aria-describedby={undefined}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          requestClose();
        }}
      >
        <Dialog.Title className={a11yHiddenTitle}>AI Coach</Dialog.Title>
        <Backdrop variant="blob" />
        <Grain />

        <div className={banner}>
          <span className={editingLabel}>ai coach</span>
          <span className={bannerTitle}>{canonical?.title ?? "—"}</span>
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
          <div
            className={chatPane}
            style={{ flex: `0 0 ${chatBasisPct}%` }}
          >
            <div className={paneHeader}>
              <h2 className={paneTitle}>Chat</h2>
              <span className={paneSubtitle}>
                {isStreaming ? "coach is thinking…" : "send a prompt to begin"}
              </span>
            </div>
            <ChatPane
              messages={messages}
              onSend={handleSend}
              disabled={isStreaming}
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
              <h2 className={paneTitle}>Goal structure</h2>
              <span className={paneSubtitle}>
                {hasChanges ? "unsaved changes" : "current tree"}
              </span>
            </div>
            <JsonTreeView root={diffCoachTree(workingTree, canonical)} />
          </div>
        </div>

        <ConfirmModal
          open={showDiscardConfirm}
          title="Discard changes?"
          body={
            <p style={{ margin: 0 }}>
              The coach has proposed changes to this goal. Closing now will
              discard them.
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
