"use client";

import { useEffect, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, Backdrop, Grain } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { plannerTreeToJson } from "./plannerTreeToJson";
import { JsonTreeView } from "./JsonTreeView";

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
  paneHeader,
  paneTitle,
  paneSubtitle,
  chatPlaceholder,
  a11yHiddenTitle,
} from "./AICoachModal.css";

interface AICoachModalProps {
  open: boolean;
  onClose: () => void;
  rootId: string;
}

export function AICoachModal({ open, onClose, rootId }: AICoachModalProps) {
  const { planner } = useCalendarProvider();

  const tree = useMemo(
    () => plannerTreeToJson(planner, rootId),
    [planner, rootId],
  );

  useEffect(() => {
    if (open && tree) {
      console.log("[coach] tree JSON:\n" + JSON.stringify(tree, null, 2));
    }
  }, [open, tree]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Overlay className={overlay} />
      <Dialog.Content className={modal} aria-describedby={undefined}>
        <Dialog.Title className={a11yHiddenTitle}>AI Coach</Dialog.Title>
        <Backdrop variant="blob" />
        <Grain />

        <div className={banner}>
          <span className={editingLabel}>ai coach</span>
          <span className={bannerTitle}>{tree?.title ?? "—"}</span>
          <span className={bannerSpacer} />
          <Button
            variant="glass"
            size="sm"
            onClick={onClose}
            className={cancelButtonStyle}
          >
            Close
          </Button>
        </div>

        <div className={body}>
          <div className={chatPane}>
            <div className={paneHeader}>
              <h2 className={paneTitle}>Chat</h2>
              <span className={paneSubtitle}>coming soon</span>
            </div>
            <div className={chatPlaceholder}>
              Chat with the coach to restructure this goal.
              <br />
              Interface wiring lands in the next slice.
            </div>
          </div>
          <div className={treePane}>
            <div className={paneHeader}>
              <h2 className={paneTitle}>Goal structure</h2>
              <span className={paneSubtitle}>rendered from JSON</span>
            </div>
            <JsonTreeView root={tree} />
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
